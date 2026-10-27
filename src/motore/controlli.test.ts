import { describe, expect, it } from "vitest";
import {
  completaConIdeePrecedenti,
  controllaIdee,
  controlloSuperato,
  messaggioCorrezione,
  normalizzaTitolo,
  sogliaMinima,
} from "./controlli";
import { ideaDiProva, quattroIdeeValide, richiestaDiProva } from "./test-dati";

describe("controllo budget", () => {
  it("con un solo valore il minimo è la metà del massimo", () => {
    expect(sogliaMinima(richiestaDiProva({ budget_max: 50 }).richiesta)).toBe(25);
    expect(sogliaMinima(richiestaDiProva({ budget_min: 10, budget_max: 50 }).richiesta)).toBe(10);
  });

  it("accetta quattro idee dentro budget", () => {
    const esito = controllaIdee(quattroIdeeValide(), richiestaDiProva());
    expect(esito.problemi).toEqual([]);
    expect(controlloSuperato(esito)).toBe(true);
  });

  it("scarta un'idea oltre il budget massimo", () => {
    const idee = quattroIdeeValide();
    idee[2] = ideaDiProva({ titolo: "Robot da cucina", prezzo_min: 40, prezzo_max: 60 });
    const esito = controllaIdee(idee, richiestaDiProva());
    expect(esito.valide).toHaveLength(3);
    expect(esito.problemi[0].posizione).toBe(3);
    expect(esito.problemi[0].motivi[0]).toContain("oltre il budget massimo");
  });

  it("con un solo valore scarta le idee sotto la metà del budget", () => {
    const idee = quattroIdeeValide();
    idee[0] = ideaDiProva({ titolo: "Segnalibro", prezzo_min: 5, prezzo_max: 10 });
    const esito = controllaIdee(idee, richiestaDiProva({ budget_max: 50 }));
    expect(esito.problemi[0].motivi[0]).toContain("sotto la metà del budget");
  });

  it("con budget minimo scarta le idee sotto il minimo", () => {
    const idee = quattroIdeeValide();
    const esito = controllaIdee(idee, richiestaDiProva({ budget_min: 30, budget_max: 50 }));
    // "Giallo nordico" (25) e "Spezie dal mondo" (26) sono sotto 30
    expect(esito.valide.map((i) => i.titolo)).toEqual(["Corso di cucina thai", "Set di coltelli giapponesi"]);
  });

  it("segnala prezzo minimo maggiore del massimo", () => {
    const esito = controllaIdee([ideaDiProva({ prezzo_min: 45, prezzo_max: 30 })], richiestaDiProva());
    expect(esito.problemi[0].motivi[0]).toContain("maggiore di prezzo_max");
  });
});

describe("controllo filtri", () => {
  it("rispetta le tipologie scelte", () => {
    const esito = controllaIdee(quattroIdeeValide(), richiestaDiProva({ tipologie: ["esperienze", "casa"] }));
    expect(esito.valide.map((i) => i.tipologia)).toEqual(["esperienze", "casa"]);
    expect(esito.problemi).toHaveLength(2);
  });

  it("nessuna tipologia scelta = vanno bene tutte", () => {
    expect(controllaIdee(quattroIdeeValide(), richiestaDiProva({ tipologie: [] })).problemi).toEqual([]);
  });

  it("ingombro massimo piccolo ammette solo idee piccole", () => {
    const esito = controllaIdee(quattroIdeeValide(), richiestaDiProva({ ingombro_max: "piccolo" }));
    expect(esito.problemi.map((p) => p.titolo)).toEqual(["Set di coltelli giapponesi"]);
  });

  it("ingombro massimo medio ammette piccole e medie ma non grandi", () => {
    const idee = [...quattroIdeeValide().slice(0, 3), ideaDiProva({ titolo: "Poltrona", ingombro: "grande" })];
    const esito = controllaIdee(idee, richiestaDiProva({ ingombro_max: "medio" }));
    expect(esito.problemi.map((p) => p.titolo)).toEqual(["Poltrona"]);
  });
});

describe("idee ripetute e numero di idee", () => {
  it("riconosce un titolo già proposto anche con maiuscole e accenti diversi", () => {
    const richiesta = richiestaDiProva();
    richiesta.escludi_titoli = ["CORSO DI CUCINA THAÌ!"];
    const esito = controllaIdee(quattroIdeeValide(), richiesta);
    expect(esito.problemi[0].motivi).toContain("idea già proposta in precedenza");
  });

  it("riconosce un'idea ripetuta nella stessa risposta", () => {
    const idee = [...quattroIdeeValide(), ideaDiProva({ titolo: "Corso di cucina Thai" })];
    const esito = controllaIdee(idee, richiestaDiProva());
    expect(esito.problemi[0].motivi).toContain("idea ripetuta nella stessa risposta");
  });

  it("segnala quando le idee sono meno di 4", () => {
    const esito = controllaIdee(quattroIdeeValide().slice(0, 3), richiestaDiProva());
    expect(esito.problemiGenerali[0]).toContain("ne hai proposte 3");
    expect(controlloSuperato(esito)).toBe(false);
  });

  it("normalizza i titoli", () => {
    expect(normalizzaTitolo("  Caffè   Speciale! ")).toBe("caffe speciale");
  });
});

describe("secondo tentativo", () => {
  it("completa le idee valide con quelle del tentativo precedente, senza doppioni", () => {
    const [a, b, c, d] = quattroIdeeValide();
    expect(completaConIdeePrecedenti([a, b], [b, c, d]).map((i) => i.titolo)).toEqual([
      a.titolo,
      b.titolo,
      c.titolo,
      d.titolo,
    ]);
  });

  it("spiega al modello cosa correggere", () => {
    const idee = quattroIdeeValide();
    idee[1] = ideaDiProva({ titolo: "Robot", prezzo_max: 99 });
    const testo = messaggioCorrezione(controllaIdee(idee.slice(0, 3), richiestaDiProva()));
    expect(testo).toContain("Idea 2 «Robot»");
    expect(testo).toContain("Servono esattamente 4 idee");
  });
});
