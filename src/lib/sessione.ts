/**
 * Memoria del browser per la scheda aperta (sessionStorage): modulo compilato e idee ricevute.
 * Si cancella da sola quando l'utente chiude la scheda. Niente cookie, niente server.
 */
import type { IngombroMassimo, Occasione, Relazione, Tipologia } from "@/config/opzioni";
import type { RichiestaApi } from "@/motore/richiesta";
import type { DomandaQuiz, RispostaDomande, RispostaGenera, RispostaGeneraOk } from "@/motore/tipi-api";

const CHIAVE_BOZZA = "regali:modulo";
const CHIAVE_SESSIONE = "regali:idee";

/** Il modulo così come lo compila l'utente (i numeri restano testo finché non si invia). */
export type StatoModulo = {
  /** Come l'utente chiama il destinatario: resta SOLO nel browser, non va mai al server */
  soprannome: string;
  paese: string;
  relazione: Relazione | "";
  occasione: Occasione | "";
  occasione_altra: string;
  budget_min: string;
  budget_max: string;
  eta: string;
  descrizione: string;
  ha_gia: string;
  non_sopporta: string;
  tipologie: Tipologia[];
  ingombro_max: IngombroMassimo;
};

/** Un gruppo di idee ricevuto dal motore (il primo, poi ogni rigenerazione). */
export type Lotto = {
  risultato: RispostaGeneraOk;
  tipo: RichiestaApi["tipo"];
  creato: number;
};

/** Tutto ciò che serve alla pagina dei risultati. */
export type Sessione = {
  lingua: string;
  modulo: RichiestaApi["modulo"];
  /** Dal più recente al più vecchio */
  lotti: Lotto[];
  /** Risposte dell'utente alle domande del motore, aggiunte al profilo */
  risposte: RichiestaApi["risposte"];
  /** Voti dati: id dell'idea → 1 (👍) o -1 (👎) */
  voti: Record<string, 1 | -1>;
  /** Soprannome del destinatario per le domande (solo nel browser) */
  soprannome?: string;
  /** Il quiz iniziale: domande e risposte ("si", "no", "nonso" o testo) */
  quiz?: { domande: DomandaQuiz[]; risposte: (string | null)[]; finito: boolean };
};

function leggi<T>(chiave: string): T | null {
  try {
    const testo = sessionStorage.getItem(chiave);
    return testo ? (JSON.parse(testo) as T) : null;
  } catch {
    return null;
  }
}

function scrivi(chiave: string, valore: unknown) {
  try {
    sessionStorage.setItem(chiave, JSON.stringify(valore));
  } catch {
    // memoria piena o disattivata: il sito funziona lo stesso, senza ricordare i dati
  }
}

export const leggiBozzaGrezza = () => {
  try {
    return sessionStorage.getItem(CHIAVE_BOZZA) ?? "";
  } catch {
    return "";
  }
};
export const leggiSessioneGrezza = () => {
  try {
    return sessionStorage.getItem(CHIAVE_SESSIONE) ?? "";
  } catch {
    return "";
  }
};
export const salvaBozza = (stato: StatoModulo) => scrivi(CHIAVE_BOZZA, stato);
export const salvaSessione = (sessione: Sessione) => scrivi(CHIAVE_SESSIONE, sessione);
export const leggiSessione = () => leggi<Sessione>(CHIAVE_SESSIONE);

/** Cancella modulo e idee (per una nuova ricerca). */
export function svuotaTutto() {
  try {
    sessionStorage.removeItem(CHIAVE_BOZZA);
    sessionStorage.removeItem(CHIAVE_SESSIONE);
  } catch {
    // niente da fare
  }
}

/** Interpreta un testo JSON salvato; null se assente o rovinato. */
export function interpreta<T>(testo: string): T | null {
  if (!testo) return null;
  try {
    return JSON.parse(testo) as T;
  } catch {
    return null;
  }
}

/** Chiede le idee al server. Non lancia mai errori: in caso di problemi restituisce un codice. */
export async function chiediIdee(corpo: RichiestaApi): Promise<RispostaGenera> {
  try {
    const risposta = await fetch("/api/genera", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dati = (await risposta.json().catch(() => null)) as RispostaGenera | null;
    if (dati && typeof dati.ok === "boolean") return dati;
    return { ok: false, errore: risposta.status === 429 ? "limite" : "motore" };
  } catch {
    return { ok: false, errore: "rete" };
  }
}

/** Chiede le domande del quiz al server. Non lancia mai errori. */
export async function chiediDomande(corpo: RichiestaApi): Promise<RispostaDomande> {
  try {
    const risposta = await fetch("/api/domande", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dati = (await risposta.json().catch(() => null)) as RispostaDomande | null;
    if (dati && typeof dati.ok === "boolean") return dati;
    return { ok: false, errore: risposta.status === 429 ? "limite" : "motore" };
  } catch {
    return { ok: false, errore: "rete" };
  }
}

/**
 * Inserisce il soprannome al posto di {nome}. Senza soprannome usa il testo di riserva
 * (es. "questa persona"). La prima lettera della frase diventa maiuscola.
 */
export function conNome(testo: string, nome: string, riserva: string): string {
  const frase = testo.replaceAll("{nome}", nome.trim() || riserva);
  return frase.charAt(0).toLocaleUpperCase() + frase.slice(1);
}

/** Invia il voto senza bloccare la pagina (voto 0 = toglie il voto). */
export function inviaVoto(ideaId: string, voto: 1 | -1 | 0) {
  fetch("/api/voto", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea_id: ideaId, voto }),
    keepalive: true,
  }).catch(() => {});
}

/** Registra il click su un link di ricerca anche se la pagina si chiude subito dopo. */
export function registraClick(ideaId: string, negozio: "amazon" | "google") {
  const corpo = JSON.stringify({ idea_id: ideaId, negozio });
  try {
    if (navigator.sendBeacon?.(
      "/api/click",
      new Blob([corpo], { type: "application/json" }),
    )) return;
  } catch {
    // si prova con fetch
  }
  fetch("/api/click", { method: "POST", body: corpo, keepalive: true }).catch(() => {});
}

/** Non serve "ascoltare" i cambiamenti della memoria: la usa solo questa scheda. */
export const nessunaIscrizione = () => () => {};
