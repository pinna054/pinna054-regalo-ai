import { describe, expect, it } from "vitest";
import { controllaIdee } from "../controlli";
import { richiestaDiProva } from "../test-dati";
import { domandeDemo, ideeDemo } from "./motore";

describe("motore demo", () => {
  it("prepara 8 domande sì/no diverse e 2 aperte con il segnaposto {nome}", () => {
    const domande = domandeDemo("it");
    expect(domande.filter((d) => d.tipo === "si_no")).toHaveLength(8);
    expect(domande.filter((d) => d.tipo === "aperta")).toHaveLength(2);
    expect(new Set(domande.map((d) => d.testo)).size).toBe(10);
    expect(domande.every((d) => d.testo.includes("{nome}"))).toBe(true);
  });

  it("propone 4 idee che superano i controlli di budget e filtri", () => {
    for (const budget of [15, 30, 50, 120]) {
      const r = richiestaDiProva({ budget_max: budget });
      const risposta = ideeDemo(r);
      expect(risposta.idee).toHaveLength(4);
      const esito = controllaIdee(risposta.idee, r);
      expect(esito.problemi).toEqual([]);
      expect(risposta.idee.some((i) => i.tipo === "sicura") && risposta.idee.some((i) => i.tipo === "originale")).toBe(true);
    }
  });

  it("tiene conto delle risposte del quiz", () => {
    const r = richiestaDiProva({ budget_min: 40, budget_max: 150 });
    r.risposte = [
      { domanda: "la persona andrebbe mai a un concerto di Travis Scott?", risposta: "Sì" },
      { domanda: "la persona comprerebbe un vinile solo per la copertina?", risposta: "Sì" },
      { domanda: "la persona sa a memoria almeno un album dei Måneskin?", risposta: "Sì" },
    ];
    const risposta = ideeDemo(r);
    expect(risposta.lettura_profilo).toContain("la musica dal vivo");
    expect(risposta.idee.some((i) => /concert|giradischi|altoparlante|auricolari|vinile|band/i.test(i.titolo))).toBe(true);
  });

  it("rispetta i filtri di tipologia e non ripete i titoli già visti", () => {
    const r = richiestaDiProva({ budget_max: 60, tipologie: ["casa", "benessere"] });
    r.escludi_titoli = ["Monstera in vaso di design"];
    const risposta = ideeDemo(r);
    expect(risposta.idee.every((i) => ["casa", "benessere"].includes(i.tipologia))).toBe(true);
    expect(risposta.idee.map((i) => i.titolo)).not.toContain("Monstera in vaso di design");
  });
});
