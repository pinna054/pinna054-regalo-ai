/**
 * POST /api/genera — riceve i dati del modulo e restituisce 4 idee regalo.
 *
 * Tutto avviene sul server: la chiave Anthropic e il database non sono mai visibili nel browser.
 */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { trovaPaese } from "@/config/paesi";
import { routing } from "@/i18n/routing";
import { effortMotore, modelloMotore, motoreFinto, promptSito, suVercel } from "@/lib/ambiente";
import { db } from "@/lib/db";
import { ipRichiesta } from "@/lib/ip";
import { controllaLimitiGenerazione } from "@/lib/limiti";
import { salvaGenerazione } from "@/lib/registro";
import { chiamaMotoreFinto } from "@/motore/finto";
import { generaIdee, MODELLO_FINTO, type CodiceErroreMotore } from "@/motore/genera";
import { linkAmazon, linkGoogleShopping } from "@/motore/link";
import { chiamaAnthropic } from "@/motore/modello";
import { preparaRichiesta, SchemaRichiestaApi } from "@/motore/richiesta";
import type { CodiceErroreApi, IdeaMostrata, RispostaGenera } from "@/motore/tipi-api";

// Una generazione dura di solito 10-30 secondi; con i nuovi tentativi può durare di più.
// 300 secondi è il massimo consentito dal piano gratuito di Vercel.
export const maxDuration = 300;

function errore(stato: number, codice: CodiceErroreApi) {
  return NextResponse.json<RispostaGenera>({ ok: false, errore: codice }, { status: stato });
}

// Come spiegare all'utente gli errori del motore
const ERRORE_PER_UTENTE: Record<CodiceErroreMotore, [number, CodiceErroreApi]> = {
  json: [502, "motore"],
  motore: [502, "motore"],
  sovraccarico: [503, "motore"],
  rete: [503, "motore"],
  rifiuto: [422, "rifiuto"],
  configurazione: [503, "configurazione"],
};

export async function POST(request: Request) {
  // 1. Lettura e controllo dei dati inviati
  let corpo: unknown;
  try {
    const testo = await request.text();
    if (testo.length > 30_000) return errore(413, "dati");
    corpo = JSON.parse(testo);
  } catch {
    return errore(400, "dati");
  }
  const lettura = SchemaRichiestaApi.safeParse(corpo);
  if (!lettura.success) return errore(400, "dati");
  const api = lettura.data;
  const lingua = routing.locales.includes(api.lingua) ? api.lingua : routing.defaultLocale;

  // 2. Configurazione: senza chiave (e senza motore finto) o senza database su Vercel non si parte
  const finto = motoreFinto();
  if (!finto && !process.env.ANTHROPIC_API_KEY) {
    console.error("[genera] Manca ANTHROPIC_API_KEY (oppure imposta MOTORE_FINTO=1 per le prove)");
    return errore(503, "configurazione");
  }
  if (!db()) {
    if (suVercel()) {
      console.error("[genera] Manca DATABASE_URL: su Vercel il database è obbligatorio");
      return errore(503, "configurazione");
    }
    console.warn("[genera] DATABASE_URL non impostata: la generazione non verrà salvata");
  }

  // 3. Limite di richieste per IP (contro abusi e costi)
  try {
    const limite = await controllaLimitiGenerazione(ipRichiesta(request.headers));
    if (limite !== "ok") return errore(429, limite);
  } catch (e) {
    console.error("[genera] Controllo dei limiti non riuscito", e);
    return errore(503, "motore");
  }

  // 4. Generazione delle idee
  const richiesta = preparaRichiesta({ ...api, lingua });
  const risultato = await generaIdee(richiesta, {
    promptVersione: promptSito(),
    modello: finto ? MODELLO_FINTO : modelloMotore(),
    effort: finto ? null : effortMotore(),
    chiamaModello: finto ? chiamaMotoreFinto : chiamaAnthropic,
  });

  // 5. Registrazione anonima (anche degli errori, utili a migliorare il motore)
  const generazioneId = randomUUID();
  const idee = (risultato.risposta?.idee ?? []).map((idea, indice) => ({
    ...idea,
    id: randomUUID(),
    posizione: indice + 1,
  }));
  try {
    await salvaGenerazione({
      id: generazioneId,
      origine: "sito",
      tipoRichiesta: api.tipo,
      genitoreId: api.genitore_id,
      richiesta,
      risultato,
      idee,
    });
  } catch (e) {
    // Se il salvataggio non riesce, le idee si mostrano comunque
    console.error("[genera] Salvataggio della generazione non riuscito", e);
  }

  if (risultato.esito === "errore" || !risultato.risposta) {
    console.error(`[genera] Errore del motore: ${risultato.codiceErrore} — ${risultato.dettaglioErrore}`);
    const [stato, codice] = ERRORE_PER_UTENTE[risultato.codiceErrore ?? "motore"];
    return errore(stato, codice);
  }

  // 6. Link di ricerca costruiti SOLO da query_ricerca
  const paese = trovaPaese(richiesta.richiesta.paese)!;
  const ideeMostrate: IdeaMostrata[] = idee.map((idea) => {
    const amazon = linkAmazon(idea.query_ricerca, paese);
    return {
      ...idea,
      link_amazon: amazon.url,
      link_google: linkGoogleShopping(idea.query_ricerca, paese, lingua),
      affiliato: amazon.affiliato,
    };
  });

  return NextResponse.json<RispostaGenera>({
    ok: true,
    generazione_id: generazioneId,
    lettura_profilo: risultato.risposta.lettura_profilo,
    avvisi: risultato.risposta.avvisi,
    domande_utili: risultato.risposta.domande_utili,
    idee: ideeMostrate,
    parziale: risultato.esito === "parziale",
    demo: finto,
    valuta: paese.valuta,
    paese: paese.codice,
  });
}
