/**
 * Prompt di Gifty (pagina principale, public/gifty.html).
 *
 * Il testo è IDENTICO a quello del prototipo: è stato solo spostato dal browser al server,
 * così nessuno può usare il nostro endpoint per mandare all'AI prompt diversi.
 * Se modifichi un prompt, cambia anche la versione qui sotto (finisce nei log del server).
 */
import "server-only";

export const VERSIONE_PROMPT_GIFTY = "gifty-v1";

/** Numero massimo di domande e numero di idee per lotto (come nel prototipo). */
export const MAX_Q = 10;
export const BATCH = 6;

export type Lingua = "it" | "en";
export type Risposta = { q: string; a: string[] };

// Nome della lingua da scrivere nel prompt (come T[lang].name nel prototipo)
const NOME_LINGUA: Record<Lingua, string> = { it: "italiano", en: "English" };

/** "1. domanda → risposta, risposta" per ogni risposta data finora. */
function testoProfilo(risposte: Risposta[]): string {
  return risposte.map((r, i) => `${i + 1}. ${r.q} → ${r.a.join(", ")}`).join("\n");
}

/** Prompt per la prossima domanda. */
export function promptDomanda(lingua: Lingua, risposte: Risposta[]): string {
  const myN = risposte.length;
  return `You are Gifty, a witty fox who helps people choose the perfect gift. Write in ${NOME_LINGUA[lingua]}.
What we know about the gift recipient (question → answer):
${testoProfilo(risposte)}

Ask the ONE next question that best helps invent a surprising, personal gift. Build on previous answers and go deeper when something is interesting (e.g. they love cooking → which cuisine or what they already own; a child → age range). Never repeat a topic already covered. Over the conversation cover a mix of: age range, personality, hobbies and passions, daily routine, things they already have, style and taste, objects vs experiences, values, something they'd never buy themselves.
This is question ${myN + 1} of at most ${MAX_Q}. Keep it short, warm and natural.
Return only JSON: {"emoji":"one emoji","question":"max 12 words","hint":"one short line, max 12 words","options":["4 to 6 answers, max 5 words each"],"multi":true or false}`;
}

/** Prompt per un nuovo lotto di idee regalo. */
export function promptRegali(
  lingua: Lingua,
  risposte: Risposta[],
  piaciute: string[],
  scartate: string[],
  mostrate: string[],
): string {
  const seed = Math.random().toString(36).slice(2, 8);
  return `You are Gifty, a fox with brilliant taste in gifts. Write in ${NOME_LINGUA[lingua]}. Prices in EUR.
Recipient profile (question → answer):
${testoProfilo(risposte)}

Liked ideas (go further in this direction): ${piaciute.join("; ") || "none yet"}
Disliked ideas (avoid anything similar): ${scartate.join("; ") || "none yet"}
Already shown, never repeat: ${mostrate.join("; ") || "none"}
Creativity seed: ${seed}

Invent ${BATCH} gift ideas. Each must be concrete and buyable or bookable (a specific kind of product, experience, subscription or personalised/handmade item), never a vague category. Make them different from each other: mix safe and surprising, objects and experiences. Respect the budget strictly. The "why" must reference specific answers from the profile.
Return only JSON: {"gifts":[{"name":"max 6 words","tagline":"max 10 words","description":"max 25 words","why":"max 20 words, personal","price":number,"emoji":"one emoji","colors":["#dark hex","#bright hex"],"tags":["2 or 3 short tags"],"search":"short shopping search query"}]}`;
}
