/**
 * Dati che arrivano dal modulo e loro trasformazione nella "richiesta" per il motore.
 *
 * Questo file è usato sia dal browser (per controllare il modulo) sia dal server.
 */
import { z } from "zod";
import {
  INGOMBRI_MASSIMI,
  OCCASIONI,
  RELAZIONI,
  TIPOLOGIE,
  type IngombroMassimo,
  type Occasione,
  type Relazione,
  type Tipologia,
} from "@/config/opzioni";
import { CODICI_PAESI, trovaPaese } from "@/config/paesi";

// Lunghezze massime dei testi liberi (evitano abusi e costi eccessivi)
export const MASSIMO_CARATTERI = {
  descrizione: 1200,
  ha_gia: 500,
  non_sopporta: 500,
  occasione_altra: 80,
  risposta: 500,
} as const;

/** I dati del modulo, così come li invia il browser. */
export const SchemaModulo = z
  .object({
    paese: z.string().refine((codice) => CODICI_PAESI.includes(codice), "paese"),
    relazione: z.enum(RELAZIONI),
    occasione: z.enum(OCCASIONI),
    occasione_altra: z.string().max(MASSIMO_CARATTERI.occasione_altra).default(""),
    budget_min: z.number().min(0).max(1_000_000).nullable().default(null),
    budget_max: z.number().gt(0).max(1_000_000),
    eta: z.number().int().min(0).max(120).nullable().default(null),
    descrizione: z.string().max(MASSIMO_CARATTERI.descrizione).default(""),
    ha_gia: z.string().max(MASSIMO_CARATTERI.ha_gia).default(""),
    non_sopporta: z.string().max(MASSIMO_CARATTERI.non_sopporta).default(""),
    tipologie: z.array(z.enum(TIPOLOGIE)).max(TIPOLOGIE.length).default([]),
    ingombro_max: z.enum(INGOMBRI_MASSIMI).default("qualsiasi"),
  })
  .superRefine((dati, ctx) => {
    if (dati.occasione === "altra" && !dati.occasione_altra.trim()) {
      ctx.addIssue({ code: "custom", path: ["occasione_altra"], message: "occasioneAltra" });
    }
    if (dati.budget_min !== null && dati.budget_min > dati.budget_max) {
      ctx.addIssue({ code: "custom", path: ["budget_min"], message: "budgetOrdine" });
    }
  });
export type DatiModulo = z.infer<typeof SchemaModulo>;

/** Una domanda del motore con la risposta dell'utente. */
export const SchemaRisposta = z.object({
  domanda: z.string().max(400),
  risposta: z.string().max(MASSIMO_CARATTERI.risposta),
});

/** Il corpo della chiamata a /api/genera. */
export const SchemaRichiestaApi = z.object({
  lingua: z.string().min(2).max(10),
  modulo: SchemaModulo,
  // nuova = primo invio del modulo; rigenera = "altre idee"; risposte = risposte alle domande
  tipo: z.enum(["nuova", "rigenera", "risposte"]).default("nuova"),
  risposte: z.array(SchemaRisposta).max(16).default([]),
  escludi_titoli: z.array(z.string().max(200)).max(60).default([]),
  // Scelte fatte scorrendo le carte: idee che sono piaciute e idee scartate (titoli)
  piaciute: z.array(z.string().max(200)).max(30).default([]),
  scartate: z.array(z.string().max(200)).max(30).default([]),
  genitore_id: z.uuid().nullable().default(null),
});
export type RichiestaApi = z.infer<typeof SchemaRichiestaApi>;

/**
 * La richiesta "pulita" che riceve il motore.
 * È divisa in profilo (chi è il destinatario) e richiesta (occasione, budget, filtri, paese):
 * la stessa forma servirà in futuro per i profili salvati e le ricorrenze.
 */
export type RichiestaMotore = {
  profilo: {
    relazione: Relazione;
    /** Testo: un numero ("34") o un intervallo ("20-30", dai test della fase 2) */
    eta: string | null;
    descrizione: string;
    ha_gia: string;
    non_sopporta: string;
  };
  richiesta: {
    occasione: Occasione;
    occasione_altra: string;
    budget_min: number | null;
    budget_max: number;
    valuta: string;
    paese: string;
    lingua: string;
    /** Vuoto = tutte le tipologie vanno bene */
    tipologie: Tipologia[];
    ingombro_max: IngombroMassimo;
  };
  risposte: { domanda: string; risposta: string }[];
  escludi_titoli: string[];
  /** Idee che sono piaciute all'utente (scorrendo a destra): il motore ne segue lo spirito */
  piaciute: string[];
  /** Idee scartate (scorrendo a sinistra): il motore evita idee simili */
  scartate: string[];
};

/**
 * Budget: "se c'è un solo numero, è il massimo".
 * Restituisce il budget sistemato, o null se manca del tutto.
 */
export function sistemaBudget(
  minimo: number | null | undefined,
  massimo: number | null | undefined,
): { budget_min: number | null; budget_max: number } | null {
  const min = typeof minimo === "number" && Number.isFinite(minimo) ? minimo : null;
  const max = typeof massimo === "number" && Number.isFinite(massimo) ? massimo : null;
  if (max === null && min === null) return null;
  if (max === null) return { budget_min: null, budget_max: min as number };
  if (min === null || min === 0) return { budget_min: null, budget_max: max };
  return { budget_min: min, budget_max: max };
}

// Indirizzi email
const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
// Sequenze di cifre che sembrano numeri di telefono (almeno 9 cifre, anche con spazi o trattini)
const POSSIBILE_TELEFONO = /(?:\+|00)?\d[\d\s.\-/()]{6,}\d/g;

/**
 * Toglie dai testi liberi email e numeri di telefono, che non servono al motore
 * e non vogliamo salvare. Comprime anche gli spazi superflui.
 */
export function pulisciTesto(testo: string): string {
  return testo
    .replace(EMAIL, "[rimosso]")
    .replace(POSSIBILE_TELEFONO, (trovato) =>
      trovato.replace(/\D/g, "").length >= 9 ? "[rimosso]" : trovato,
    )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Trasforma i dati validati del modulo nella richiesta per il motore. */
export function preparaRichiesta(api: RichiestaApi): RichiestaMotore {
  const m = api.modulo;
  const paese = trovaPaese(m.paese);
  if (!paese) throw new Error(`Paese non supportato: ${m.paese}`);
  const budget = sistemaBudget(m.budget_min, m.budget_max)!;

  return {
    profilo: {
      relazione: m.relazione,
      eta: m.eta === null ? null : String(m.eta),
      descrizione: pulisciTesto(m.descrizione),
      ha_gia: pulisciTesto(m.ha_gia),
      non_sopporta: pulisciTesto(m.non_sopporta),
    },
    richiesta: {
      occasione: m.occasione,
      occasione_altra: m.occasione === "altra" ? pulisciTesto(m.occasione_altra) : "",
      budget_min: budget.budget_min,
      budget_max: budget.budget_max,
      valuta: paese.valuta,
      paese: paese.codice,
      lingua: api.lingua,
      tipologie: [...new Set(m.tipologie)],
      ingombro_max: m.ingombro_max,
    },
    risposte: api.risposte
      .map((r) => ({ domanda: r.domanda.trim(), risposta: pulisciTesto(r.risposta) }))
      .filter((r) => r.domanda && r.risposta),
    escludi_titoli: [...new Set(api.escludi_titoli.map((t) => t.trim()).filter(Boolean))],
    piaciute: [...new Set(api.piaciute.map((t) => t.trim()).filter(Boolean))],
    scartate: [...new Set(api.scartate.map((t) => t.trim()).filter(Boolean))],
  };
}
