/**
 * Lettura delle variabili d'ambiente (solo lato server), con i valori predefiniti.
 * L'elenco completo, con spiegazioni, è in .env.example.
 */
import "server-only";
import { LIVELLI_EFFORT, type LivelloEffort } from "@/config/modelli";

function numero(nome: string, predefinito: number): number {
  const valore = Number(process.env[nome]);
  return Number.isFinite(valore) && valore > 0 ? valore : predefinito;
}

/** Modello Anthropic usato dal motore. */
export function modelloMotore(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5-5";
}

/**
 * "Effort" del modello: quanto ragiona prima di rispondere (low, medium, high, xhigh, max).
 * Scrivendo "nessuno" non viene inviato (per modelli che non lo supportano).
 */
export function effortMotore(): LivelloEffort | null {
  const valore = process.env.ANTHROPIC_EFFORT?.trim().toLowerCase();
  if (!valore) return "medium";
  if (valore === "nessuno" || valore === "none") return null;
  return (LIVELLI_EFFORT as readonly string[]).includes(valore) ? (valore as LivelloEffort) : "medium";
}

/** Versione del prompt usata dal sito pubblico (file prompts/<versione>.md). */
export function promptSito(): string {
  return process.env.MOTORE_PROMPT?.trim() || "motore-v1";
}

/** Motore finto: idee di prova senza chiamare l'AI (solo per sviluppo). */
export function motoreFinto(): boolean {
  return process.env.MOTORE_FINTO === "1";
}

/** Stringa di connessione al database (Supabase → Connect → Transaction pooler). */
export function urlDatabase(): string | null {
  return process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim() || null;
}

/** True quando il sito gira su Vercel (dove il database è obbligatorio). */
export function suVercel(): boolean {
  return process.env.VERCEL === "1";
}

/** Limiti di richieste di idee. */
export function limiti() {
  return {
    perOra: numero("LIMITE_ORA", 10),
    perGiorno: numero("LIMITE_GIORNO", 40),
    globaleGiorno: numero("LIMITE_GLOBALE_GIORNO", 2000),
  };
}

/** Chiave segreta per trasformare gli IP in codici non reversibili. */
export function segretoHashIp(): string {
  return (
    process.env.SEGRETO_HASH_IP?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "sviluppo-locale-non-segreto"
  );
}

/**
 * Limiti di Gifty (endpoint /api/ai), per IP. Una persona che usa il sito normalmente fa
 * circa 7 domande + 2-4 lotti di idee: 40 chiamate all'ora bastano per 3-4 persone diverse.
 */
export function limitiAi() {
  return {
    perOra: numero("LIMITE_AI_ORA", 40),
    perGiorno: numero("LIMITE_AI_GIORNO", 120),
    globaleGiorno: numero("LIMITE_AI_GLOBALE_GIORNO", 5000),
  };
}
