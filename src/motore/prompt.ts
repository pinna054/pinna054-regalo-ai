/**
 * Lettura dei prompt del motore dalla cartella /prompts.
 *
 * Ogni versione è un file: prompts/motore-v1.md, prompts/motore-v2.md, ...
 * Per provare un prompt nuovo basta creare il file con il numero successivo.
 */
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

const CARTELLA = path.join(process.cwd(), "prompts");
const NOME_VALIDO = /^motore-v\d+$/;
// Altri prompt: quello delle domande del quiz (domande-v1.md, domande-v2.md, ...)
const NOME_FILE_VALIDO = /^(motore|domande)-v\d+$/;
const memoria = new Map<string, string>();

/** Versioni disponibili, dalla più recente: ["motore-v2", "motore-v1"]. */
export async function elencaVersioniPrompt(): Promise<string[]> {
  const file = await fs.readdir(CARTELLA);
  return file
    .filter((f) => f.endsWith(".md") && NOME_VALIDO.test(f.replace(/\.md$/, "")))
    .map((f) => f.replace(/\.md$/, ""))
    .sort((a, b) => Number(b.split("-v")[1]) - Number(a.split("-v")[1]));
}

/** Testo del prompt di una versione (es. "motore-v1"). */
export async function caricaPrompt(versione: string): Promise<string> {
  if (!NOME_VALIDO.test(versione)) {
    throw new Error(`Nome di versione del prompt non valido: "${versione}" (atteso: motore-vN)`);
  }
  return caricaPromptFile(versione);
}

/** Testo di un file di prompt (motore-vN o domande-vN). */
export async function caricaPromptFile(versione: string): Promise<string> {
  if (!NOME_FILE_VALIDO.test(versione)) {
    throw new Error(`Nome di versione del prompt non valido: "${versione}" (atteso: motore-vN)`);
  }
  const salvato = memoria.get(versione);
  if (salvato) return salvato;

  const testo = (await fs.readFile(path.join(CARTELLA, `${versione}.md`), "utf8")).trim();
  if (!testo) throw new Error(`Il prompt ${versione} è vuoto`);
  // In sviluppo rileggiamo sempre il file, così le modifiche si vedono subito
  if (process.env.NODE_ENV === "production") memoria.set(versione, testo);
  return testo;
}
