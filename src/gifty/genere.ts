/**
 * Il sesso della persona, ricavato dalle risposte: dalla domanda "È un lui o una lei?"
 * oppure dalla relazione (mamma, papà). Serve a non proporre, ad esempio, vestiti da uomo a una donna.
 */
export type Genere = "F" | "M" | null;
type Risposta = { q: string; a: string[] };

const DONNA = /^(lei|she|donna|woman|mamma|mom|nonna|grandma|sorella|sister|moglie|wife|fidanzata|girlfriend|figlia|daughter|amica|zia)$/i;
const UOMO = /^(lui|he|uomo|man|papà|papa|dad|nonno|grandpa|fratello|brother|marito|husband|fidanzato|boyfriend|figlio|son|amico|zio)$/i;

export function genere(risposte: Risposta[]): Genere {
  for (const r of risposte) {
    for (const a of r.a) {
      const v = a.trim();
      if (DONNA.test(v)) return "F";
      if (UOMO.test(v)) return "M";
    }
  }
  return null;
}

// Parole che nel titolo di un prodotto indicano che è pensato per l'altro sesso
const PER_UOMO = /\b(uomo|uomini|maschile|maschili|men|mens|men's|man's|homme|herren|boy|ragazzo)\b/i;
const PER_DONNA = /\b(donna|donne|femminile|femminili|women|womens|women's|woman|lady|ladies|femme|damen|girl|ragazza)\b/i;

/** True se il prodotto va bene per il sesso della persona (sconosciuto = va bene tutto). */
export function adattoAlGenere(titolo: string, g: Genere): boolean {
  if (g === "F") return !PER_UOMO.test(titolo);
  if (g === "M") return !PER_DONNA.test(titolo);
  return true;
}

/** Riga per il prompt. */
export function regolaGenere(g: Genere): string {
  if (g === "F")
    return "The recipient is a WOMAN: every card and every gift must fit a woman; never propose men's items. In Italian always use feminine grammar for her (lei, la, -a: \"sognatrice\", \"le piace\"), never \"lui\".";
  if (g === "M")
    return "The recipient is a MAN: every card and every gift must fit a man; never propose women's items. In Italian always use masculine grammar for him (lui, lo, -o), never \"lei\".";
  return "The recipient's gender is unknown: avoid anything made for a specific gender.";
}
