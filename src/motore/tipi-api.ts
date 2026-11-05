/**
 * Forma delle risposte dell'API /api/genera, condivisa tra server e browser.
 */
import type { Idea } from "./schema";

/** Un'idea come arriva al browser: con identificativo e link già costruiti dal server. */
export type IdeaMostrata = Idea & {
  id: string;
  posizione: number;
  link_amazon: string;
  link_google: string;
  /** true se il link Amazon contiene il tag di affiliazione */
  affiliato: boolean;
};

/** Codici di errore che il sito sa spiegare all'utente (testi in messages/xx.json → "errori"). */
export type CodiceErroreApi =
  | "dati"
  | "limite"
  | "limiteGlobale"
  | "motore"
  | "rifiuto"
  | "configurazione"
  | "rete";

export type RispostaGeneraOk = {
  ok: true;
  generazione_id: string;
  lettura_profilo: string;
  avvisi: string[];
  domande_utili: string[];
  idee: IdeaMostrata[];
  /** true se le idee valide sono meno di 4 */
  parziale: boolean;
  /** true se le idee vengono dal motore finto */
  demo: boolean;
  valuta: string;
  paese: string;
};

export type RispostaGenera = RispostaGeneraOk | { ok: false; errore: CodiceErroreApi };

/** Una domanda del quiz (con il segnaposto {nome} al posto del destinatario). */
export type DomandaQuiz = { tipo: "si_no" | "aperta"; testo: string };

export type RispostaDomande = { ok: true; domande: DomandaQuiz[] } | { ok: false; errore: CodiceErroreApi };
