/** Dati di esempio usati dai test automatici. */
import type { RichiestaMotore } from "./richiesta";
import type { Idea } from "./schema";

export function richiestaDiProva(modifiche: Partial<RichiestaMotore["richiesta"]> = {}): RichiestaMotore {
  return {
    profilo: {
      relazione: "amico/a",
      eta: "34",
      descrizione: "Ama cucinare e leggere gialli.",
      ha_gia: "",
      non_sopporta: "",
    },
    richiesta: {
      occasione: "compleanno",
      occasione_altra: "",
      budget_min: null,
      budget_max: 50,
      valuta: "EUR",
      paese: "IT",
      lingua: "it",
      tipologie: [],
      ingombro_max: "qualsiasi",
      ...modifiche,
    },
    risposte: [],
    escludi_titoli: [],
    piaciute: [],
    scartate: [],
  };
}

export function ideaDiProva(modifiche: Partial<Idea> = {}): Idea {
  return {
    titolo: "Corso di cucina thai",
    descrizione: "Una serata di cucina thailandese.",
    perche: "Ama cucinare.",
    tipo: "sicura",
    tipologia: "esperienze",
    ingombro: "piccolo",
    prezzo_min: 30,
    prezzo_max: 45,
    query_ricerca: "corso cucina thai",
    attenzione: "",
    ...modifiche,
  };
}

/** Quattro idee valide per un budget di 50 € (un solo valore, quindi tra 25 e 50). */
export function quattroIdeeValide(): Idea[] {
  return [
    ideaDiProva({ titolo: "Corso di cucina thai", tipo: "sicura" }),
    ideaDiProva({ titolo: "Giallo nordico illustrato", tipologia: "libri e cultura", tipo: "sicura", prezzo_min: 25, prezzo_max: 30 }),
    ideaDiProva({ titolo: "Set di coltelli giapponesi", tipologia: "casa", tipo: "originale", ingombro: "medio", prezzo_min: 40, prezzo_max: 50 }),
    ideaDiProva({ titolo: "Spezie dal mondo", tipologia: "cibo e bevande", tipo: "originale", prezzo_min: 26, prezzo_max: 35 }),
  ];
}
