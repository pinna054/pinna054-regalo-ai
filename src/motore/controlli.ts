/**
 * Controlli lato server sulle idee del motore: budget, filtri e idee ripetute.
 *
 * Il modello a volte sbaglia (prezzo oltre il budget, tipologia esclusa dai filtri...):
 * qui troviamo gli errori, che vengono rimandati al modello per un secondo tentativo.
 */
import type { IngombroMassimo } from "@/config/opzioni";
import type { RichiestaMotore } from "./richiesta";
import type { Idea } from "./schema";

/** Numero di idee che il sito mostra (e che chiediamo al motore). */
export const IDEE_RICHIESTE = 4;

// Tolleranza per gli arrotondamenti dei prezzi (es. 49,999 invece di 50)
const TOLLERANZA = 0.01;

/** Ingombri ammessi per ogni scelta del filtro "ingombro massimo". */
const INGOMBRI_AMMESSI: Record<IngombroMassimo, string[]> = {
  piccolo: ["piccolo"],
  medio: ["piccolo", "medio"],
  qualsiasi: ["piccolo", "medio", "grande"],
};

/**
 * Prezzo minimo accettabile: il budget minimo, oppure, se c'è un solo valore di budget,
 * la metà del massimo (regola 1 del prompt).
 */
export function sogliaMinima(r: RichiestaMotore["richiesta"]): number {
  return r.budget_min ?? r.budget_max / 2;
}

/** Normalizza un titolo per confrontarlo con altri (minuscole, senza accenti né punteggiatura). */
export function normalizzaTitolo(titolo: string): string {
  return titolo
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export type ProblemaIdea = {
  /** Posizione dell'idea nella risposta (da 1) */
  posizione: number;
  titolo: string;
  motivi: string[];
};

export type EsitoControllo = {
  /** Idee che rispettano tutti i vincoli, nell'ordine originale */
  valide: Idea[];
  /** Problemi delle singole idee */
  problemi: ProblemaIdea[];
  /** Problemi della risposta nel suo insieme (es. meno di 4 idee) */
  problemiGenerali: string[];
};

/** Controlla le idee di una risposta rispetto a budget, filtri e titoli già proposti. */
export function controllaIdee(idee: Idea[], r: RichiestaMotore): EsitoControllo {
  const { richiesta } = r;
  const valuta = richiesta.valuta;
  const minimo = sogliaMinima(richiesta);
  const ingombriAmmessi = INGOMBRI_AMMESSI[richiesta.ingombro_max];
  const giaProposti = new Set(r.escludi_titoli.map(normalizzaTitolo));
  const visti = new Set<string>();

  const valide: Idea[] = [];
  const problemi: ProblemaIdea[] = [];

  idee.forEach((idea, indice) => {
    const motivi: string[] = [];

    if (idea.prezzo_min > idea.prezzo_max + TOLLERANZA) {
      motivi.push(`prezzo_min (${idea.prezzo_min}) maggiore di prezzo_max (${idea.prezzo_max})`);
    }
    if (idea.prezzo_max > richiesta.budget_max + TOLLERANZA) {
      motivi.push(
        `prezzo_max ${idea.prezzo_max} ${valuta} oltre il budget massimo di ${richiesta.budget_max} ${valuta}`,
      );
    }
    if (idea.prezzo_min < minimo - TOLLERANZA) {
      motivi.push(
        richiesta.budget_min !== null
          ? `prezzo_min ${idea.prezzo_min} ${valuta} sotto il budget minimo di ${minimo} ${valuta}`
          : `prezzo_min ${idea.prezzo_min} ${valuta} sotto la metà del budget (${minimo} ${valuta})`,
      );
    }
    if (richiesta.tipologie.length > 0 && !richiesta.tipologie.includes(idea.tipologia)) {
      motivi.push(
        `tipologia "${idea.tipologia}" non ammessa dai filtri (ammesse: ${richiesta.tipologie.join(", ")})`,
      );
    }
    if (!ingombriAmmessi.includes(idea.ingombro)) {
      motivi.push(
        `ingombro "${idea.ingombro}" oltre il massimo consentito (ammessi: ${ingombriAmmessi.join(", ")})`,
      );
    }

    const chiave = normalizzaTitolo(idea.titolo);
    if (giaProposti.has(chiave)) {
      motivi.push("idea già proposta in precedenza");
    } else if (visti.has(chiave)) {
      motivi.push("idea ripetuta nella stessa risposta");
    }
    visti.add(chiave);

    if (motivi.length > 0) {
      problemi.push({ posizione: indice + 1, titolo: idea.titolo, motivi });
    } else {
      valide.push(idea);
    }
  });

  const problemiGenerali: string[] = [];
  if (idee.length < IDEE_RICHIESTE) {
    problemiGenerali.push(`servono esattamente ${IDEE_RICHIESTE} idee, ne hai proposte ${idee.length}`);
  }

  return { valide, problemi, problemiGenerali };
}

/** True se il controllo non ha trovato nulla da correggere. */
export function controlloSuperato(esito: EsitoControllo): boolean {
  return (
    esito.problemi.length === 0 &&
    esito.problemiGenerali.length === 0 &&
    esito.valide.length >= IDEE_RICHIESTE
  );
}

/**
 * Unisce le idee valide del secondo tentativo con quelle valide del primo
 * (senza doppioni), fino ad arrivare a 4.
 */
export function completaConIdeePrecedenti(attuali: Idea[], precedenti: Idea[]): Idea[] {
  const risultato = attuali.slice(0, IDEE_RICHIESTE);
  const presenti = new Set(risultato.map((i) => normalizzaTitolo(i.titolo)));
  for (const idea of precedenti) {
    if (risultato.length >= IDEE_RICHIESTE) break;
    const chiave = normalizzaTitolo(idea.titolo);
    if (!presenti.has(chiave)) {
      risultato.push(idea);
      presenti.add(chiave);
    }
  }
  return risultato;
}

/** Testo che spiega al modello cosa correggere nel secondo tentativo. */
export function messaggioCorrezione(esito: EsitoControllo): string {
  const righe = [
    ...esito.problemi.map((p) => `- Idea ${p.posizione} «${p.titolo}»: ${p.motivi.join("; ")}.`),
    ...esito.problemiGenerali.map((p) => `- ${p.charAt(0).toUpperCase()}${p.slice(1)}.`),
  ];
  return [
    "La risposta precedente non rispetta alcuni vincoli:",
    ...righe,
    "",
    `Rispondi di nuovo con il JSON completo e ${IDEE_RICHIESTE} idee che rispettino budget e filtri. ` +
      "Puoi tenere le idee che andavano bene e sostituire le altre.",
  ].join("\n");
}
