/**
 * Paesi di consegna: valuta, negozi e lingua del paese.
 *
 * Per aggiungere un paese basta aggiungere una voce all'elenco PAESI.
 * I nomi dei paesi si traducono da soli in ogni lingua (Intl.DisplayNames),
 * quindi non servono traduzioni.
 *
 * Il tag di affiliazione Amazon NON si scrive qui: si mette nella variabile d'ambiente
 * indicata in "variabileTag" (es. AMAZON_TAG_IT=mionegozio-21). Se manca, il link
 * funziona lo stesso ma senza affiliazione.
 */
export type Paese = {
  /** Codice ISO del paese (GB = Regno Unito) */
  codice: string;
  /** Valuta di budget e prezzi */
  valuta: string;
  /** Lingua del paese: serve per dedurre il paese dalla lingua dell'interfaccia */
  lingua: string;
  amazon: {
    /** Dominio del marketplace Amazon */
    dominio: string;
    /** Nome della variabile d'ambiente con il tag di affiliazione */
    variabileTag: string;
  };
  google: {
    /** Dominio di Google per il paese */
    dominio: string;
    /** Codice paese per Google Shopping (parametro gl) */
    gl: string;
  };
};

export const PAESI: Paese[] = [
  {
    codice: "IT",
    valuta: "EUR",
    lingua: "it",
    amazon: { dominio: "amazon.it", variabileTag: "AMAZON_TAG_IT" },
    google: { dominio: "google.it", gl: "it" },
  },
  {
    codice: "GB",
    valuta: "GBP",
    lingua: "en",
    amazon: { dominio: "amazon.co.uk", variabileTag: "AMAZON_TAG_UK" },
    google: { dominio: "google.co.uk", gl: "uk" },
  },
  {
    codice: "DE",
    valuta: "EUR",
    lingua: "de",
    amazon: { dominio: "amazon.de", variabileTag: "AMAZON_TAG_DE" },
    google: { dominio: "google.de", gl: "de" },
  },
  {
    codice: "FR",
    valuta: "EUR",
    lingua: "fr",
    amazon: { dominio: "amazon.fr", variabileTag: "AMAZON_TAG_FR" },
    google: { dominio: "google.fr", gl: "fr" },
  },
  {
    codice: "ES",
    valuta: "EUR",
    lingua: "es",
    amazon: { dominio: "amazon.es", variabileTag: "AMAZON_TAG_ES" },
    google: { dominio: "google.es", gl: "es" },
  },
  {
    codice: "US",
    valuta: "USD",
    lingua: "en",
    amazon: { dominio: "amazon.com", variabileTag: "AMAZON_TAG_US" },
    google: { dominio: "google.com", gl: "us" },
  },
];

/** Paese proposto per una lingua, quando il browser non indica una regione (es. "en" → Stati Uniti). */
export const PAESE_PER_LINGUA: Record<string, string> = {
  it: "IT",
  en: "US",
  de: "DE",
  fr: "FR",
  es: "ES",
};

/** Paese di riserva se non si riesce a dedurne nessuno. */
export const PAESE_PREDEFINITO = "IT";

/** Alcuni nomi alternativi accettati (ad esempio nel CSV dei test). */
const ALIAS: Record<string, string> = { UK: "GB" };

export const CODICI_PAESI = PAESI.map((p) => p.codice);

export function trovaPaese(codice: string | null | undefined): Paese | undefined {
  if (!codice) return undefined;
  const c = codice.trim().toUpperCase();
  return PAESI.find((p) => p.codice === (ALIAS[c] ?? c));
}

/**
 * Deduce il paese di consegna.
 * 1) se il browser indica una regione supportata (es. "en-GB", "de-DE") usa quella;
 * 2) altrimenti usa il paese associato alla lingua dell'interfaccia;
 * 3) altrimenti il paese predefinito.
 */
export function deduciPaese(lingua: string, lingueBrowser: readonly string[] = []): string {
  for (const voce of lingueBrowser) {
    const regione = voce.split("-")[1];
    const paese = trovaPaese(regione);
    if (paese) return paese.codice;
  }
  const base = lingua.split("-")[0].toLowerCase();
  return PAESE_PER_LINGUA[base] ?? PAESI.find((p) => p.lingua === base)?.codice ?? PAESE_PREDEFINITO;
}
