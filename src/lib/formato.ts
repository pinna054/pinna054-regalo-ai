/** Formattazione di prezzi, nomi di paesi e lingue nella lingua dell'utente. */

/** Prezzo nella valuta indicata, es. "25 €" in italiano o "€25" in inglese. */
export function formattaPrezzo(valore: number, valuta: string, lingua: string): string {
  return formattatore(valore, valuta, lingua).format(valore);
}

/**
 * Fascia di prezzo arrotondata all'unità (sono stime), es. "25–40 €".
 * Se i due valori coincidono mostra un solo prezzo.
 */
export function formattaFascia(minimo: number, massimo: number, valuta: string, lingua: string): string {
  const da = Math.round(minimo);
  const a = Math.round(massimo);
  const formato = formattatore(a, valuta, lingua);
  if (da === a) return formato.format(a);
  try {
    return formato.formatRange(da, a);
  } catch {
    return `${formato.format(da)} – ${formato.format(a)}`;
  }
}

function formattatore(valore: number, valuta: string, lingua: string) {
  return new Intl.NumberFormat(lingua, {
    style: "currency",
    currency: valuta,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: Number.isInteger(valore) ? 0 : 2,
    minimumFractionDigits: 0,
  });
}

/** Simbolo della valuta, es. "€", "£", "$". */
export function simboloValuta(valuta: string, lingua: string): string {
  try {
    return (
      new Intl.NumberFormat(lingua, { style: "currency", currency: valuta, currencyDisplay: "narrowSymbol" })
        .formatToParts(0)
        .find((parte) => parte.type === "currency")?.value ?? valuta
    );
  } catch {
    return valuta;
  }
}

/** Nome di un paese nella lingua dell'utente, es. "GB" → "Regno Unito". */
export function nomePaese(codice: string, lingua: string): string {
  try {
    return new Intl.DisplayNames([lingua], { type: "region" }).of(codice) ?? codice;
  } catch {
    return codice;
  }
}

/** Nome di una lingua scritto in quella stessa lingua, es. "it" → "Italiano", "en" → "English". */
export function nomeLingua(codice: string): string {
  try {
    const nome = new Intl.DisplayNames([codice], { type: "language" }).of(codice) ?? codice;
    return nome.charAt(0).toLocaleUpperCase(codice) + nome.slice(1);
  } catch {
    return codice;
  }
}

/** Legge un numero scritto dall'utente ("25", "25,50", "1.200"): null se vuoto, NaN se non valido. */
export function leggiNumero(testo: string): number | null {
  const pulito = testo.trim().replace(/\s/g, "");
  if (!pulito) return null;
  // "1.200" o "1,200" con tre cifre dopo il separatore = migliaia; altrimenti la virgola è decimale
  const senzaMigliaia = /^\d{1,3}([.,]\d{3})+$/.test(pulito) ? pulito.replace(/[.,]/g, "") : pulito;
  const numero = Number(senzaMigliaia.replace(",", "."));
  return Number.isFinite(numero) ? numero : Number.NaN;
}
