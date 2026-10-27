/**
 * Prezzi dei modelli Anthropic, in dollari per milione di token (listino di ottobre 2026).
 *
 * Servono solo a STIMARE il costo di ogni generazione, che viene salvato nel database.
 * Se cambi modello o cambiano i prezzi, aggiorna questa tabella:
 * https://platform.claude.com/docs/en/about-claude/pricing
 *
 * cacheLettura / cacheScrittura: prezzo dei token letti/scritti nella cache del prompt.
 * Se non sono indicati si usano le regole standard (lettura 10% e scrittura 125% dell'input).
 */
export type PrezziModello = {
  input: number;
  output: number;
  cacheLettura?: number;
  cacheScrittura?: number;
};

export const PREZZI_MODELLI: Record<string, PrezziModello> = {
  "claude-sonnet-5-5": { input: 2, output: 10, cacheLettura: 0.2, cacheScrittura: 2.5 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20, cacheLettura: 0.2 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-fable-5-1": { input: 10, output: 50, cacheLettura: 0.25 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

/** Livelli di "effort" accettati dall'API: quanto il modello ragiona prima di rispondere. */
export const LIVELLI_EFFORT = ["low", "medium", "high", "xhigh", "max"] as const;
export type LivelloEffort = (typeof LIVELLI_EFFORT)[number];
