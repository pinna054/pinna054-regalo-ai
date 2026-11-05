/**
 * Impostazioni generali del sito.
 *
 * Il NOME del sito si cambia SOLO qui: compare in intestazione, titoli delle pagine,
 * testi e pagina privacy.
 */
export const SITO = {
  // Nome del sito: cambialo qui e si aggiorna ovunque.
  nome: "GIFTY",

  // Dati per la pagina privacy: da completare prima della pubblicazione.
  titolare: "[Nome e indirizzo del titolare del trattamento]",
  emailPrivacy: "[email per le richieste privacy]",

  // Da quanto tempo conserviamo le generazioni anonime (mostrato nella pagina privacy).
  mesiConservazione: 24,
} as const;
