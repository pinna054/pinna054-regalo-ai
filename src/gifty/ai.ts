/**
 * Chiamate all'AI per Gifty: una domanda alla volta oppure un lotto di idee regalo.
 * Solo lato server: la chiave ANTHROPIC_API_KEY non arriva mai al browser.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { LivelloEffort } from "@/config/modelli";
import { clientAnthropic } from "@/motore/modello";

/** Un round di domande da scorrere, più la domanda aperta (usata solo nel round 1). */
export const SchemaDomande = z.object({
  questions: z.array(
    z.object({ emoji: z.string(), question: z.string(), yes_reaction: z.string(), no_reaction: z.string() }),
  ),
  open_question: z.object({ emoji: z.string(), question: z.string(), hint: z.string() }),
});
export type Domande = z.infer<typeof SchemaDomande>;

/** Idea regalo generata dall'AI ("photo" = parole per cercare una foto vera). */
export const SchemaRegalo = z.object({
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  why: z.string(),
  price: z.number(),
  emoji: z.string(),
  colors: z.array(z.string()),
  tags: z.array(z.string()),
  search: z.string(),
  photo: z.string(),
});
export const SchemaRegali = z.object({
  portrait: z.string(),
  badges: z.array(z.string()),
  gifts: z.array(SchemaRegalo),
});
export type Regalo = z.infer<typeof SchemaRegalo>;

/** Errore che il sito sa gestire: "non_disponibile" fa passare la pagina in modalità demo. */
export class ErroreAi extends Error {
  constructor(
    public codice: "non_disponibile" | "risposta_non_valida",
    messaggio: string,
  ) {
    super(messaggio);
    this.name = "ErroreAi";
  }
}

type Opzioni = { modello: string; effort: LivelloEffort | null; maxToken: number };

/**
 * Manda il prompt al modello e restituisce il JSON già validato.
 * Il formato JSON è imposto con gli "structured outputs", quindi la risposta è sempre leggibile;
 * se comunque non lo fosse (es. risposta troncata) si riprova una volta.
 */
export async function chiediAlModello<S extends z.ZodObject>(
  prompt: string,
  schema: S,
  opzioni: Opzioni,
): Promise<z.infer<S>> {
  let ultimoProblema = "";
  for (let tentativo = 1; tentativo <= 2; tentativo++) {
    let testo: string;
    try {
      const risposta = await clientAnthropic().beta.messages.create({
        model: opzioni.modello,
        max_tokens: opzioni.maxToken,
        // Se il modello rifiuta, l'API riprova da sola con un modello alternativo
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        messages: [{ role: "user", content: prompt }],
        output_config: {
          format: betaZodOutputFormat(schema),
          ...(opzioni.effort ? { effort: opzioni.effort } : {}),
        },
      });
      if (risposta.stop_reason === "refusal") throw new ErroreAi("risposta_non_valida", "Il modello ha rifiutato");
      testo = risposta.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    } catch (errore) {
      if (errore instanceof ErroreAi) throw errore;
      // Chiave mancante o sbagliata, credito finito, sovraccarico, rete: la pagina passa in demo
      const messaggio = errore instanceof Anthropic.APIError ? `${errore.status} ${errore.message}` : String(errore);
      throw new ErroreAi("non_disponibile", messaggio);
    }

    try {
      const lettura = schema.safeParse(JSON.parse(testo));
      if (lettura.success) return lettura.data;
      ultimoProblema = lettura.error.message;
    } catch (e) {
      ultimoProblema = `JSON non leggibile: ${String(e)}`;
    }
  }
  throw new ErroreAi("risposta_non_valida", ultimoProblema);
}
