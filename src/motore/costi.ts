/** Conteggio dei token e stima dei costi delle chiamate al modello. */
import { PREZZI_MODELLI } from "@/config/modelli";

export type UsoToken = {
  input: number;
  output: number;
  cacheScrittura: number;
  cacheLettura: number;
};

export const USO_ZERO: UsoToken = { input: 0, output: 0, cacheScrittura: 0, cacheLettura: 0 };

export function sommaUso(a: UsoToken, b: UsoToken): UsoToken {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    cacheScrittura: a.cacheScrittura + b.cacheScrittura,
    cacheLettura: a.cacheLettura + b.cacheLettura,
  };
}

/** Costo stimato in dollari, o null se il modello non è nella tabella dei prezzi. */
export function stimaCosto(modello: string, uso: UsoToken): number | null {
  const prezzi = PREZZI_MODELLI[modello];
  if (!prezzi) return null;
  const cacheLettura = prezzi.cacheLettura ?? prezzi.input * 0.1;
  const cacheScrittura = prezzi.cacheScrittura ?? prezzi.input * 1.25;
  const dollari =
    (uso.input * prezzi.input +
      uso.output * prezzi.output +
      uso.cacheLettura * cacheLettura +
      uso.cacheScrittura * cacheScrittura) /
    1_000_000;
  return Math.round(dollari * 1_000_000) / 1_000_000;
}
