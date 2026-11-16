/** Budget dalla risposta alla domanda "Quanto vuoi spendere?" (es. "30–70 €", "Over €300"). */
export type Risposta = { q: string; a: string[] };

export function budget(risposte: Risposta[]): { min: number; max: number } {
  const testo = risposte.find((r) => /€/.test(r.a.join(" ")))?.a.join(" ") ?? "";
  const numeri = (testo.match(/\d+/g) ?? []).map(Number);
  if (/oltre|over/i.test(testo) && numeri[0]) return { min: numeri[0], max: numeri[0] * 3 };
  if (numeri.length >= 2) return { min: numeri[0], max: numeri[1] };
  if (numeri.length === 1) return { min: 0, max: numeri[0] };
  return { min: 0, max: 100 };
}
