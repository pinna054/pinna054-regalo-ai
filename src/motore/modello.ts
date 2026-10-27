/**
 * Chiamata al modello Anthropic (solo lato server: la chiave non arriva mai al browser).
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { LivelloEffort } from "@/config/modelli";
import type { UsoToken } from "./costi";
import type { RichiestaMotore } from "./richiesta";
import { SchemaRispostaMotore } from "./schema";

/** Un messaggio della conversazione con il modello. */
export type MessaggioModello = Anthropic.Beta.BetaMessageParam;
/** Contenuto di una risposta del modello, da rimandargli nei nuovi tentativi. */
export type ContenutoRisposta = Anthropic.Beta.BetaMessageContentParam;

export type ParametriChiamata = {
  modello: string;
  effort: LivelloEffort | null;
  sistema: string;
  messaggi: MessaggioModello[];
  /** Usata solo dal motore finto, per inventare idee coerenti con la richiesta */
  richiesta: RichiestaMotore;
  /** Numero della chiamata (1, 2, 3): usato solo dal motore finto */
  numero: number;
};

export type EsitoChiamata = {
  /** Testo JSON restituito dal modello */
  testo: string | null;
  /** Perché il modello si è fermato: end_turn, max_tokens, refusal, ... */
  motivoFine: string | null;
  /** Modello che ha davvero risposto (può cambiare se interviene il fallback) */
  modelloUsato: string;
  uso: UsoToken;
  tokenRagionamento: number | null;
  /** Contenuto completo della risposta, da rimandare al modello nei nuovi tentativi */
  contenuto: ContenutoRisposta;
};

export type ChiamaModello = (parametri: ParametriChiamata) => Promise<EsitoChiamata>;

/** Errore del motore con un codice che il sito sa spiegare all'utente. */
export class ErroreMotore extends Error {
  constructor(
    public codice: "configurazione" | "sovraccarico" | "rete" | "motore",
    messaggio: string,
  ) {
    super(messaggio);
    this.name = "ErroreMotore";
  }
}

// Formato JSON imposto al modello: generato dallo stesso schema zod usato per validare
const FORMATO_RISPOSTA = betaZodOutputFormat(SchemaRispostaMotore);

let client: Anthropic | null = null;
function clientAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ErroreMotore("configurazione", "Manca la variabile ANTHROPIC_API_KEY");
  }
  // maxRetries: l'SDK ritenta da solo in caso di sovraccarico o errori di rete
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 120_000 });
  return client;
}

/** Chiamata vera all'API Anthropic. */
export const chiamaAnthropic: ChiamaModello = async ({ modello, effort, sistema, messaggi }) => {
  try {
    const risposta = await clientAnthropic().beta.messages.create({
      model: modello,
      max_tokens: 16000,
      // Se il modello rifiuta per motivi di sicurezza, l'API riprova da sola con un modello
      // alternativo scelto da Anthropic (fallback lato server consigliato per i modelli 5.x).
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Il prompt di sistema è uguale per tutti: lo mettiamo in cache per risparmiare
      system: [{ type: "text", text: sistema, cache_control: { type: "ephemeral" } }],
      messages: messaggi,
      output_config: {
        format: FORMATO_RISPOSTA,
        ...(effort ? { effort } : {}),
      },
    });

    const testo = risposta.content
      .flatMap((blocco) => (blocco.type === "text" ? [blocco.text] : []))
      .join("");

    return {
      testo: testo || null,
      motivoFine: risposta.stop_reason ?? null,
      modelloUsato: risposta.model,
      uso: {
        input: risposta.usage.input_tokens ?? 0,
        output: risposta.usage.output_tokens ?? 0,
        cacheScrittura: risposta.usage.cache_creation_input_tokens ?? 0,
        cacheLettura: risposta.usage.cache_read_input_tokens ?? 0,
      },
      tokenRagionamento: risposta.usage.output_tokens_details?.thinking_tokens ?? null,
      contenuto: risposta.content as ContenutoRisposta,
    };
  } catch (errore) {
    if (errore instanceof ErroreMotore) throw errore;
    if (
      errore instanceof Anthropic.AuthenticationError ||
      errore instanceof Anthropic.PermissionDeniedError ||
      errore instanceof Anthropic.NotFoundError
    ) {
      throw new ErroreMotore("configurazione", `Chiave o modello non validi: ${errore.message}`);
    }
    if (errore instanceof Anthropic.RateLimitError) {
      throw new ErroreMotore("sovraccarico", `Limite di richieste Anthropic: ${errore.message}`);
    }
    if (errore instanceof Anthropic.APIConnectionError) {
      throw new ErroreMotore("rete", `Connessione ad Anthropic non riuscita: ${errore.message}`);
    }
    if (errore instanceof Anthropic.APIError) {
      throw new ErroreMotore(
        errore.status && errore.status >= 500 ? "sovraccarico" : "motore",
        `Errore API Anthropic ${errore.status}: ${errore.message}`,
      );
    }
    throw errore;
  }
};
