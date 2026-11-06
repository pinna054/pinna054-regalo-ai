/**
 * /api/ai — il gioco di Gifty (pagina principale, public/gifty.html).
 *
 * GET  → { attiva, foto }: dice alla pagina se l'AI e le foto sono attive.
 * POST → { tipo: "domande", giro: 1|2, ... } un round di domande da scorrere (+ la domanda aperta),
 *        { tipo: "regali", ... }            un lotto di idee regalo con foto, ritratto e titoli.
 *
 * Il browser manda solo le risposte e i nomi delle idee: il prompt lo costruisce il server,
 * quindi nessuno può usare questo indirizzo per far scrivere all'AI altro.
 * Il nome del destinatario non arriva mai qui: nelle domande c'è il segnaposto {nome}.
 *
 * Se l'AI non è configurata, non risponde o il limite di richieste è raggiunto, la risposta
 * arriva dalla modalità demo (src/gifty/demo.ts) con "demo": true. 502 = risposta AI non valida.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { chiediAlModello, ErroreAi, SchemaDomande, SchemaRegali } from "@/gifty/ai";
import { domandeDemo, regaliDemo } from "@/gifty/demo";
import { conFoto, fotoAttive } from "@/gifty/foto";
import { BATCH, DOMANDE_PER_ROUND, promptDomande, promptRegali, VERSIONE_PROMPT_GIFTY } from "@/gifty/prompt";
import { effortMotore, modelloMotore } from "@/lib/ambiente";
import { ipRichiesta } from "@/lib/ip";
import { controllaLimiteAzione, controllaLimitiAi } from "@/lib/limiti";
import { pulisciTesto } from "@/motore/richiesta";

export const maxDuration = 60;

// Testi brevi e ripuliti da email e numeri di telefono, per sicurezza e per non sprecare token
const testo = (max: number) => z.string().trim().min(1).max(max).transform(pulisciTesto);
const SchemaRisposte = z.array(z.object({ q: testo(200), a: z.array(testo(160)).min(1).max(8) })).max(30);
// Elenchi di testi: si tengono solo gli ultimi, così la richiesta resta piccola
const elenco = z
  .array(z.string().trim().max(200))
  .max(500)
  .transform((voci) => voci.filter(Boolean).slice(-120).map(pulisciTesto));
const lingua = z.enum(["it", "en"]);

const SchemaRichiesta = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("domande"), lingua, giro: z.union([z.literal(1), z.literal(2)]), risposte: SchemaRisposte, chieste: elenco }),
  z.object({ tipo: z.literal("regali"), lingua, risposte: SchemaRisposte, piaciute: elenco, scartate: elenco, mostrate: elenco }),
]);
type Richiesta = z.infer<typeof SchemaRichiesta>;

/** True se l'AI è configurata: basta la chiave (MOTORE_FINTO vale solo per /it e /en). */
function aiAttiva(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export async function GET() {
  return NextResponse.json({ attiva: aiAttiva(), foto: fotoAttive() }, { headers: { "Cache-Control": "no-store" } });
}

/** Risposta senza AI (modalità demo). */
async function rispostaDemo(r: Richiesta) {
  if (r.tipo === "domande") return NextResponse.json({ demo: true, ...domandeDemo(r.lingua, r.giro, r.risposte, r.chieste) });
  const { gifts, ...resto } = regaliDemo(r.lingua, r.risposte, r.piaciute, r.scartate, r.mostrate);
  return NextResponse.json({ demo: true, ...resto, gifts: await conFoto(gifts) });
}

export async function POST(request: Request) {
  const lettura = SchemaRichiesta.safeParse(await request.json().catch(() => null));
  if (!lettura.success) return NextResponse.json({ errore: "dati" }, { status: 400 });
  const r = lettura.data;
  const ip = ipRichiesta(request.headers);

  // Limiti: con l'AI quelli di LIMITE_AI_*; in demo un limite largo (la demo non costa, le foto poco)
  let usaAi = aiAttiva();
  try {
    if (usaAi && (await controllaLimitiAi(ip)) !== "ok") usaAi = false;
    if (!usaAi && !(await controllaLimiteAzione("gifty-demo", ip, 300))) {
      return NextResponse.json({ errore: "limite" }, { status: 429 });
    }
  } catch (e) {
    console.error("[ai] Controllo dei limiti non riuscito", e);
    return NextResponse.json({ errore: "non_disponibile" }, { status: 503 });
  }
  if (!usaAi) return rispostaDemo(r);

  const inizio = Date.now();
  const modello = modelloMotore();
  try {
    if (r.tipo === "domande") {
      const domande = await chiediAlModello(promptDomande(r.lingua, r.risposte, r.giro, r.chieste), SchemaDomande, {
        modello,
        // Le domande devono arrivare in fretta: il modello ragiona poco
        effort: "low",
        maxToken: 6000,
      });
      // Teniamo solo vere domande, al massimo quante ne prevede il round
      const questions = domande.questions.filter((q) => q.question.includes("?")).slice(0, DOMANDE_PER_ROUND[r.giro]);
      console.info(`[ai] domande round ${r.giro} · ${modello} · ${VERSIONE_PROMPT_GIFTY} · ${Date.now() - inizio} ms`);
      return NextResponse.json({ demo: false, questions, open_question: domande.open_question });
    }

    const { gifts, portrait, badges } = await chiediAlModello(
      promptRegali(r.lingua, r.risposte, r.piaciute, r.scartate, r.mostrate),
      SchemaRegali,
      { modello, effort: effortMotore(), maxToken: 16000 },
    );
    const conLeFoto = await conFoto(gifts.slice(0, BATCH));
    console.info(`[ai] ${gifts.length} regali · ${modello} · ${VERSIONE_PROMPT_GIFTY} · ${Date.now() - inizio} ms`);
    return NextResponse.json({ demo: false, portrait, badges: badges.slice(0, 3), gifts: conLeFoto });
  } catch (e) {
    const codice = e instanceof ErroreAi ? e.codice : "non_disponibile";
    console.error(`[ai] ${r.tipo}: ${codice}`, e instanceof Error ? e.message : e);
    // AI non disponibile (chiave sbagliata, credito finito, sovraccarico): si continua in demo
    if (codice === "non_disponibile") return rispostaDemo(r);
    return NextResponse.json({ errore: codice }, { status: 502 });
  }
}
