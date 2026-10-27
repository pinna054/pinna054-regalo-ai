/**
 * Valori interni delle scelte del modulo e delle idee.
 *
 * IMPORTANTE: i valori sono in italiano e restano UGUALI in tutte le lingue.
 * Sono quelli che arrivano al motore e che si salvano nel database, così dati e report
 * restano confrontabili. All'utente si mostrano le etichette tradotte, che stanno nei file
 * messages/xx.json sotto "opzioni" e si trovano con la "chiave" indicata qui sotto.
 */

// Relazione con il destinatario
export const RELAZIONI = [
  "amico/a",
  "partner",
  "genitore",
  "altro parente",
  "collega/capo",
  "altro",
] as const;
export type Relazione = (typeof RELAZIONI)[number];
export const CHIAVE_RELAZIONE: Record<Relazione, string> = {
  "amico/a": "amico",
  partner: "partner",
  genitore: "genitore",
  "altro parente": "parente",
  "collega/capo": "collega",
  altro: "altro",
};

// Occasione ("natale" si mostra come "festività di fine anno";
// "altra" permette di scrivere un'occasione libera, ad esempio festività di altre culture)
export const OCCASIONI = [
  "compleanno",
  "natale",
  "anniversario",
  "laurea",
  "nascita",
  "scuse",
  "consolazione",
  "pensione",
  "trasloco",
  "ringraziamento",
  "nessuna",
  "altra",
] as const;
export type Occasione = (typeof OCCASIONI)[number];

// Tipologie di regalo (filtro a scelta multipla e campo "tipologia" di ogni idea)
export const TIPOLOGIE = [
  "esperienze",
  "libri e cultura",
  "cibo e bevande",
  "tecnologia",
  "casa",
  "benessere",
  "hobby e tempo libero",
  "accessori",
] as const;
export type Tipologia = (typeof TIPOLOGIE)[number];
export const CHIAVE_TIPOLOGIA: Record<Tipologia, string> = {
  esperienze: "esperienze",
  "libri e cultura": "libri",
  "cibo e bevande": "cibo",
  tecnologia: "tecnologia",
  casa: "casa",
  benessere: "benessere",
  "hobby e tempo libero": "hobby",
  accessori: "accessori",
};

// Ingombro di un'idea (lo stabilisce il motore)
export const INGOMBRI = ["piccolo", "medio", "grande"] as const;
export type Ingombro = (typeof INGOMBRI)[number];

// Ingombro massimo scelto dall'utente nel filtro
export const INGOMBRI_MASSIMI = ["piccolo", "medio", "qualsiasi"] as const;
export type IngombroMassimo = (typeof INGOMBRI_MASSIMI)[number];

// Tipo di idea
export const TIPI_IDEA = ["sicura", "originale"] as const;
export type TipoIdea = (typeof TIPI_IDEA)[number];
