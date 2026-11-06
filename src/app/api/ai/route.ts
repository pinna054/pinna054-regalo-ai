/**
 * /api/ai — l'AI di Gifty (pagina principale, public/gifty.html).
 *
 * GET  → { attiva: true/false }: dice alla pagina se usare l'AI o la modalità demo.
 * POST → { tipo: "domanda", ... } restituisce la prossima domanda,
 *        { tipo: "regali", ... }  restituisce un lotto di idee regalo.
 *
 * Il browser manda solo le risposte e i nomi delle idee: il prompt lo costruisce il server,
 * quindi nessuno può usare questo indirizzo per far scrivere all'AI altro.
 * Errori: 503 = AI non disponibile (la pagina passa in demo), 429 = limite raggiunto
 * (la pagina passa in demo), 502 = risposta dell'AI non valida (la pagina offre "Riprova").
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { effortMotore, modelloMotore, motoreFinto } from "@/lib/ambiente";
import { ipRichiesta } from "@/lib/ip";
import { controllaLimitiAi } from "@/lib/limiti";
import { chiediAlModello, ErroreAi, SchemaDomanda, SchemaRegali } from "@/gifty/ai";
import { BATCH, MAX_Q, promptDomanda, promptRegali, VERSIONE_PROMPT_GIFTY } from "@/gifty/prompt";
import { pulisciTesto } from "@/motore/richiesta";

export const maxDuration = 60;

// Testi brevi e ripuliti da email e numeri di telefono, per sicurezza e per non sprecare token
const testo = (max: number) => z.string().trim().min(1).max(max).transform(pulisciTesto);
const SchemaRisposte = z
  .array(z.object({ q: testo(200), a: z.array(testo(120)).min(1).max(8) }))
  .max(MAX_Q);
// Elenchi di nomi di idee: si tengono solo gli ultimi, così la richiesta resta piccola
const elencoNomi = z
  .array(z.string().trim().max(120))
  .max(500)
  .transform((nomi) => nomi.filter(Boolean).slice(-120).map(pulisciTesto));

const SchemaRichiesta = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("domanda"), lingua: z.enum(["it", "en"]), risposte: SchemaRisposte }),
  z.object({
    tipo: z.literal("regali"),
    lingua: z.enum(["it", "en"]),
    risposte: SchemaRisposte,
    piaciute: elencoNomi,
    scartate: elencoNomi,
    mostrate: elencoNomi,
  }),
]);

/** True se l'AI è configurata (chiave presente e modalità finta spenta). */
function aiAttiva(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim()) && !motoreFinto();
}

export async function GET() {
  return NextResponse.json({ attiva: aiAttiva() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const lettura = SchemaRichiesta.safeParse(await request.json().catch(() => null));
  if (!lettura.success) return NextResponse.json({ errore: "dati" }, { status: 400 });
  const richiesta = lettura.data;

  if (!aiAttiva()) return NextResponse.json({ errore: "non_disponibile" }, { status: 503 });

  try {
    const limite = await controllaLimitiAi(ipRichiesta(request.headers));
    if (limite !== "ok") return NextResponse.json({ errore: limite }, { status: 429 });
  } catch (e) {
    console.error("[ai] Controllo dei limiti non riuscito", e);
    return NextResponse.json({ errore: "non_disponibile" }, { status: 503 });
  }

  const inizio = Date.now();
  const modello = modelloMotore();
  try {
    if (richiesta.tipo === "domanda") {
      const domanda = await chiediAlModello(promptDomanda(richiesta.lingua, richiesta.risposte), SchemaDomanda, {
        modello,
        // Le domande devono arrivare in fretta: il modello ragiona poco
        effort: "low",
        maxToken: 4000,
      });
      console.info(`[ai] domanda ${richiesta.risposte.length + 1} · ${modello} · ${VERSIONE_PROMPT_GIFTY} · ${Date.now() - inizio} ms`);
      return NextResponse.json(domanda);
    }

    const { gifts } = await chiediAlModello(
      promptRegali(richiesta.lingua, richiesta.risposte, richiesta.piaciute, richiesta.scartate, richiesta.mostrate),
      SchemaRegali,
      { modello, effort: effortMotore(), maxToken: 12000 },
    );
    console.info(`[ai] ${gifts.length} regali · ${modello} · ${VERSIONE_PROMPT_GIFTY} · ${Date.now() - inizio} ms`);
    return NextResponse.json({ gifts: gifts.slice(0, BATCH) });
  } catch (e) {
    const codice = e instanceof ErroreAi ? e.codice : "non_disponibile";
    console.error(`[ai] ${richiesta.tipo}: ${codice}`, e instanceof Error ? e.message : e);
    return NextResponse.json({ errore: codice }, { status: codice === "non_disponibile" ? 503 : 502 });
  }
}
