import { describe, expect, it } from "vitest";
import { stimaCosto } from "./costi";
import { costruisciMessaggio } from "./messaggio";
import { richiestaDiProva } from "./test-dati";

describe("messaggio per il modello", () => {
  it("contiene lingua, paese, budget e filtri in modo esplicito", () => {
    const r = richiestaDiProva({
      lingua: "en",
      paese: "DE",
      budget_max: 50,
      tipologie: ["libri e cultura", "esperienze"],
      ingombro_max: "piccolo",
    });
    const testo = costruisciMessaggio(r);
    expect(testo).toContain("Lingua dei testi: inglese (en)");
    expect(testo).toContain("Paese di consegna: Germania (DE)");
    expect(testo).toContain("amazon.de");
    expect(testo).toContain("Budget: un solo valore, 50 EUR (quindi idee tra 25 e 50 EUR)");
    expect(testo).toContain("tipologie ammesse: libri e cultura, esperienze");
    expect(testo).toContain('ingombro massimo: piccolo (solo idee con ingombro "piccolo")');
    expect(testo).toContain("<descrizione>\nAma cucinare e leggere gialli.\n</descrizione>");
    expect(testo).toContain("Cosa non sopporta: (non indicato)");
  });

  it("spiega 'natale' come festività di fine anno e riporta l'occasione libera", () => {
    expect(costruisciMessaggio(richiestaDiProva({ occasione: "natale" }))).toContain(
      "Occasione: natale (festività di fine anno)",
    );
    expect(
      costruisciMessaggio(richiestaDiProva({ occasione: "altra", occasione_altra: "Diwali" })),
    ).toContain("Occasione: altra: «Diwali»");
  });

  it("include risposte e titoli da non ripetere", () => {
    const r = richiestaDiProva({ budget_min: 20, budget_max: 40 });
    r.risposte = [{ domanda: "Viaggia spesso?", risposta: "Sì, in treno" }];
    r.escludi_titoli = ["Corso di cucina thai"];
    const testo = costruisciMessaggio(r);
    expect(testo).toContain("Budget: da 20 a 40 EUR");
    expect(testo).toContain("- Domanda: Viaggia spesso?");
    expect(testo).toContain("Idee già proposte, da non ripetere:\n- Corso di cucina thai");
  });
});

describe("stima dei costi", () => {
  it("calcola il costo in dollari dai token", () => {
    // 1000 token in ingresso a 2 $/M + 1000 in uscita a 10 $/M = 0,012 $
    expect(stimaCosto("claude-sonnet-5-5", { input: 1000, output: 1000, cacheLettura: 0, cacheScrittura: 0 })).toBe(0.012);
    expect(stimaCosto("modello-sconosciuto", { input: 1, output: 1, cacheLettura: 0, cacheScrittura: 0 })).toBeNull();
  });
});
