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
import { chiediAlModello, ErroreAi, SchemaDomande, SchemaDossier, SchemaRegali } from "@/gifty/ai";
import { budget } from "@/gifty/budget";
import { domandeDemo, dossierDemo, regaliDemo } from "@/gifty/demo";
import { cercaFoto, fotoAttive } from "@/gifty/foto";
import { servizioProdotti, trovaProdotto } from "@/gifty/prodotti";
import { BATCH, DOMANDE_PER_ROUND, promptDomande, promptDossier, promptRegali, VERSIONE_PROMPT_GIFTY } from "@/gifty/prompt";
import { effortMotore, modelloMotore } from "@/lib/ambiente";
import { ipRichiesta } from "@/lib/ip";
import { controllaLimiteAzione, controllaLimitiAi } from "@/lib/limiti";
import { linkAmazon, linkGoogleShopping } from "@/motore/link";
import { pulisciTesto } from "@/motore/richiesta";
import { PAESE_PREDEFINITO, trovaPaese } from "@/config/paesi";

// Il dossier e i regali fanno ragionare il modello più a lungo
export const maxDuration = 120;

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
  z.object({ tipo: z.literal("dossier"), lingua, risposte: SchemaRisposte }),
  z.object({
    tipo: z.literal("regali"),
    lingua,
    risposte: SchemaRisposte,
    // il dossier scritto dall'AI torna dal browser: lo limitiamo e lo ripuliamo come ogni altro testo
    dossier: z.string().max(4000).default("").transform(pulisciTesto),
    piaciute: elenco,
    scartate: elenco,
    mostrate: elenco,
  }),
]);
type Richiesta = z.infer<typeof SchemaRichiesta>;

/** True se l'AI è configurata: basta la chiave (MOTORE_FINTO vale solo per /it e /en). */
function aiAttiva(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export async function GET(request: Request) {
  // /api/ai?prova=1 → una piccola chiamata vera all'AI, per vedere subito se la chiave funziona
  // (mostra solo lo stato e il messaggio d'errore di Anthropic, mai la chiave)
  if (new URL(request.url).searchParams.get("prova") === "1") return provaAi(request);
  return NextResponse.json(
    { attiva: aiAttiva(), prodotti: servizioProdotti() !== null, foto: fotoAttive() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Link per comprare ogni regalo, costruiti SOLO dalla query di ricerca (il modello non scrive URL).
 * Prezzi in euro → negozi italiani; Amazon con il tag di affiliazione AMAZON_TAG_IT se impostato.
 */
function conLink<T extends { search: string; name: string }>(regali: T[], lingua: string) {
  const paese = trovaPaese(PAESE_PREDEFINITO)!;
  return regali.map((g) => {
    const query = g.search || g.name;
    const amazon = linkAmazon(query, paese);
    return { ...g, link_amazon: amazon.url, affiliato: amazon.affiliato, link_google: linkGoogleShopping(query, paese, lingua) };
  });
}

/**
 * Per ogni idea: il prodotto VERO (Google Shopping) con foto, prezzo, negozio e link;
 * se non si trova, una foto rappresentativa (Pexels); altrimenti resta l'emoji.
 */
async function conProdotti<T extends { search: string; name: string; photo: string; price: number }>(
  regali: T[],
  r: { lingua: string; risposte: { q: string; a: string[] }[] },
) {
  const { max } = budget(r.risposte);
  const arricchiti = await Promise.all(
    regali.map(async (g) => {
      const prodotto = await trovaProdotto(g.search || g.name, max, g.price);
      const foto = prodotto ? null : await cercaFoto(g.photo);
      return { ...g, prodotto, foto, price: prodotto?.prezzo ?? g.price };
    }),
  );
  return conLink(arricchiti, r.lingua);
}

/** Prova di funzionamento dell'AI (limitata come ogni altra chiamata). */
async function provaAi(request: Request) {
  const intestazioni = { "Cache-Control": "no-store" };
  if (!aiAttiva()) return NextResponse.json({ prova: "manca la chiave ANTHROPIC_API_KEY" }, { headers: intestazioni });
  if ((await controllaLimitiAi(ipRichiesta(request.headers))) !== "ok") {
    return NextResponse.json({ prova: "limite di richieste raggiunto, riprova tra un'ora" }, { headers: intestazioni });
  }
  const inizio = Date.now();
  try {
    const d = await chiediAlModello(
      promptDomande("it", [{ q: "Per chi è il regalo?", a: ["Mamma"] }], 1, []),
      SchemaDomande,
      { modello: modelloMotore(), effort: "low", maxToken: 6000 },
    );
    return NextResponse.json(
      { prova: "ok", modello: modelloMotore(), domande: d.questions.length, esempio: d.questions[0]?.question ?? "", millisecondi: Date.now() - inizio },
      { headers: intestazioni },
    );
  } catch (e) {
    return NextResponse.json(
      { prova: "errore", modello: modelloMotore(), dettaglio: (e instanceof Error ? e.message : String(e)).slice(0, 400), millisecondi: Date.now() - inizio },
      { headers: intestazioni },
    );
  }
}

/** Risposta senza AI (modalità demo). */
async function rispostaDemo(r: Richiesta) {
  if (r.tipo === "domande") return NextResponse.json({ demo: true, ...domandeDemo(r.lingua, r.giro, r.risposte, r.chieste) });
  if (r.tipo === "dossier") return NextResponse.json({ demo: true, ...dossierDemo(r.lingua, r.risposte) });
  const { gifts } = regaliDemo(r.lingua, r.risposte, r.piaciute, r.scartate, r.mostrate);
  return NextResponse.json({ demo: true, gifts: await conProdotti(gifts, r) });
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
      // Teniamo le carte complete (una "questo o quello" deve avere le due scelte), al massimo quante ne prevede il round
      const questions = domande.questions
        .filter((q) => q.question.trim() && (q.kind === "yn" || (q.left.trim() && q.right.trim())))
        .map((q) => (q.kind === "yn" ? { ...q, left: "No", right: r.lingua === "it" ? "Sì" : "Yes" } : q))
        .slice(0, DOMANDE_PER_ROUND[r.giro]);
      console.info(`[ai] domande round ${r.giro} · ${modello} · ${VERSIONE_PROMPT_GIFTY} · ${Date.now() - inizio} ms`);
      return NextResponse.json({ demo: false, questions, open_question: domande.open_question });
    }

    if (r.tipo === "dossier") {
      // Lo studio della persona: qui il modello ragiona a fondo
      const dossier = await chiediAlModello(promptDossier(r.lingua, r.risposte), SchemaDossier, {
        modello,
        effort: "high",
        maxToken: 16000,
      });
      console.info(`[ai] dossier · ${modello} · ${VERSIONE_PROMPT_GIFTY} · ${Date.now() - inizio} ms`);
      return NextResponse.json({
        demo: false,
        dossier: dossier.dossier,
        insights: dossier.insights.slice(0, 5),
        portrait: dossier.portrait,
        badges: dossier.badges.slice(0, 3),
      });
    }

    const { gifts } = await chiediAlModello(
      promptRegali(r.lingua, r.risposte, r.dossier, r.piaciute, r.scartate, r.mostrate),
      SchemaRegali,
      { modello, effort: effortMotore(), maxToken: 16000 },
    );
    const completi = await conProdotti(gifts.slice(0, BATCH), r);
    const trovati = completi.filter((g) => g.prodotto).length;
    console.info(`[ai] ${gifts.length} regali (${trovati} prodotti veri) · ${modello} · ${VERSIONE_PROMPT_GIFTY} · ${Date.now() - inizio} ms`);
    return NextResponse.json({ demo: false, gifts: completi });
  } catch (e) {
    const codice = e instanceof ErroreAi ? e.codice : "non_disponibile";
    console.error(`[ai] ${r.tipo}: ${codice}`, e instanceof Error ? e.message : e);
    // AI non disponibile (chiave sbagliata, credito finito, sovraccarico): si continua in demo
    if (codice === "non_disponibile") return rispostaDemo(r);
    return NextResponse.json({ errore: codice }, { status: 502 });
  }
}
