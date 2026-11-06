/**
 * DEMO: motore senza AI (MOTORE_FINTO=1) per presentare il sito.
 *
 * - Domande: 8 sì/no da aree diverse (scelte a caso dall'archivio) + 2 aperte.
 * - Idee: ogni regalo del catalogo prende un punteggio dai suoi "temi":
 *   sale con le risposte Sì, i ♥ e le parole della descrizione; scende con No, ✕ e "non sopporta".
 *   Poi si scelgono 4 regali dentro budget e filtri, vari tra loro (almeno una "sicura" e una "originale").
 */
import { INGOMBRI } from "@/config/opzioni";
import { normalizzaTitolo, sogliaMinima } from "../controlli";
import type { RichiestaMotore } from "../richiesta";
import type { Idea, RispostaMotore } from "../schema";
import { CATALOGO, type RegaloDemo } from "./catalogo";
import { DOMANDE_APERTE, DOMANDE_SI_NO, type DomandaDemo } from "./domande";
import { FRASE_TEMA, PAROLE_TEMA, TEMI, type Tema } from "./temi";

const MAX_INGOMBRO = { piccolo: 0, medio: 1, qualsiasi: 2 } as const;

function mescola<T>(elenco: T[]): T[] {
  const copia = [...elenco];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** 8 domande sì/no da aree diverse e 2 aperte, nella lingua richiesta. */
export function domandeDemo(lingua: string) {
  const l = lingua === "it" ? "it" : "en";
  const siNo = mescola(Object.values(DOMANDE_SI_NO))
    .slice(0, 8)
    .map((area) => mescola(area)[0]);
  const aperte = mescola(DOMANDE_APERTE).slice(0, 2);
  return [
    ...siNo.map((d) => ({ tipo: "si_no" as const, testo: d[l] })),
    ...aperte.map((d) => ({ tipo: "aperta" as const, testo: d[l] })),
  ];
}

// Le domande tornano dal browser con "la persona" al posto di {nome}: le riconosciamo così
const TEMI_PER_DOMANDA = new Map<string, Tema[]>();
for (const d of Object.values(DOMANDE_SI_NO).flat() as DomandaDemo[]) {
  for (const testo of [d.it, d.en]) TEMI_PER_DOMANDA.set(normalizzaTitolo(testo.replaceAll("{nome}", "la persona")), d.temi);
}
const REGALO_PER_TITOLO = new Map<string, RegaloDemo>();
for (const regalo of CATALOGO) {
  REGALO_PER_TITOLO.set(normalizzaTitolo(regalo.it[0]), regalo);
  REGALO_PER_TITOLO.set(normalizzaTitolo(regalo.en[0]), regalo);
}

/** Temi riconosciuti in un testo libero (es. "ama viaggiare e cucinare" → viaggi, cucina). */
function temiNelTesto(testo: string): Tema[] {
  const t = ` ${testo.toLowerCase()} `;
  return TEMI.filter((tema) => (PAROLE_TEMA[tema] ?? []).some((parola) => t.includes(parola) || t.includes(` ${parola}`)));
}

/** Punteggio di ogni tema in base a ciò che sappiamo del destinatario. */
function punteggiTemi(r: RichiestaMotore) {
  const punti = new Map<Tema, number>();
  const aggiungi = (temi: Tema[], valore: number) => temi.forEach((t) => punti.set(t, (punti.get(t) ?? 0) + valore));
  let nonSo = 0;

  for (const { domanda, risposta } of r.risposte) {
    const temi = TEMI_PER_DOMANDA.get(normalizzaTitolo(domanda));
    const valore = risposta.toLowerCase();
    if (temi) {
      if (valore === "sì" || valore === "si" || valore === "yes") aggiungi(temi, 3);
      else if (valore === "no") aggiungi(temi, -2);
      else nonSo++;
    } else {
      aggiungi(temiNelTesto(risposta), 2); // risposta a una domanda aperta
    }
  }
  aggiungi(temiNelTesto(`${r.profilo.descrizione} ${r.profilo.ha_gia} ${r.richiesta.occasione_altra}`), 2);
  aggiungi(temiNelTesto(r.profilo.non_sopporta), -3);
  for (const titolo of r.piaciute) aggiungi(REGALO_PER_TITOLO.get(normalizzaTitolo(titolo))?.temi ?? [], 2);
  for (const titolo of r.scartate) aggiungi(REGALO_PER_TITOLO.get(normalizzaTitolo(titolo))?.temi ?? [], -1.5);
  return { punti, nonSo };
}

/** 4 idee demo coerenti con budget, filtri e gusti. */
export function ideeDemo(r: RichiestaMotore): RispostaMotore {
  const l = r.richiesta.lingua === "it" ? "it" : "en";
  const minimo = sogliaMinima(r.richiesta);
  const massimo = r.richiesta.budget_max;
  const esclusi = new Set(r.escludi_titoli.map(normalizzaTitolo));
  const { punti, nonSo } = punteggiTemi(r);

  const ammessi = CATALOGO.filter(
    (g) =>
      (r.richiesta.tipologie.length === 0 || r.richiesta.tipologie.includes(g.tipologia)) &&
      INGOMBRI.indexOf(g.ingombro) <= MAX_INGOMBRO[r.richiesta.ingombro_max] &&
      !esclusi.has(normalizzaTitolo(g[l][0])),
  );
  // Prima i regali con un prezzo compatibile con il budget; se non bastano, tutti gli altri
  const nelBudget = ammessi.filter((g) => g.prezzo[0] <= massimo && g.prezzo[1] >= minimo);
  const candidati = nelBudget.length >= 4 ? nelBudget : ammessi;

  const ordinati = candidati
    .map((g) => ({ g, punteggio: g.temi.reduce((s, t) => s + (punti.get(t) ?? 0), 0) + Math.random() * 1.5 }))
    .sort((a, b) => b.punteggio - a.punteggio);

  // 4 regali vari: al massimo 2 della stessa tipologia
  const scelti: RegaloDemo[] = [];
  for (const { g } of ordinati) {
    if (scelti.length === 4) break;
    if (scelti.filter((s) => s.tipologia === g.tipologia).length < 2) scelti.push(g);
  }
  // almeno una "sicura" e una "originale"
  for (const tipo of ["sicura", "originale"] as const) {
    if (scelti.length === 4 && !scelti.some((s) => s.tipo === tipo)) {
      const sostituto = ordinati.find(({ g }) => g.tipo === tipo && !scelti.includes(g));
      if (sostituto) scelti[3] = sostituto.g;
    }
  }

  const idee: Idea[] = scelti.map((g) => {
    // prezzo mostrato: la fascia del regalo, ristretta al budget (se è fuori budget, tutto il budget)
    const compatibile = g.prezzo[0] <= massimo && g.prezzo[1] >= minimo;
    const da = Math.ceil(compatibile ? Math.max(g.prezzo[0], minimo) : minimo);
    const a = Math.floor(compatibile ? Math.min(g.prezzo[1], massimo) : massimo);
    return {
      titolo: g[l][0],
      descrizione: g[l][1],
      perche: g[l][2],
      tipo: g.tipo,
      tipologia: g.tipologia,
      ingombro: g.ingombro,
      prezzo_min: Math.min(da, a),
      prezzo_max: Math.max(da, a),
      query_ricerca: g[l][3],
      attenzione: "",
    };
  });

  const gusti = [...punti.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => FRASE_TEMA[t][l]);
  const elenco = gusti.length > 1 ? `${gusti.slice(0, -1).join(", ")} ${l === "it" ? "e" : "and"} ${gusti.at(-1)}` : gusti[0];

  const lettura =
    l === "it"
      ? gusti.length
        ? `Da quello che mi hai raccontato, è una persona a cui piacciono ${elenco}. Ho cercato regali che parlino proprio di questo, dentro il tuo budget.${r.piaciute.length ? " Ho tenuto conto anche delle idee che ti sono piaciute." : ""}`
        : "Ho ancora poche informazioni: parto da regali versatili e difficili da sbagliare. Scorri le carte e imparo i suoi gusti."
      : gusti.length
        ? `From what you told me, they love ${elenco}. I looked for gifts that speak to exactly that, within your budget.${r.piaciute.length ? " I also took into account the ideas you liked." : ""}`
        : "I don’t know much yet: I’m starting with versatile gifts that are hard to get wrong. Swipe and I’ll learn their taste.";

  const avvisi: string[] = [];
  if (nonSo >= 3) {
    avvisi.push(l === "it" ? "Diverse risposte erano «Non so»: ho dato più peso alle altre." : "Several answers were “Not sure”: I gave more weight to the others.");
  }
  if (massimo < 20) {
    avvisi.push(l === "it" ? "Con questo budget le idee sono piccoli pensieri: va benissimo, conta l’intenzione." : "With this budget the ideas are small tokens: that’s fine, it’s the thought that counts.");
  }

  return { lettura_profilo: lettura, avvisi, domande_utili: [], idee };
}
