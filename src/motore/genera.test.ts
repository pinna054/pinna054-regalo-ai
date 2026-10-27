import { describe, expect, it } from "vitest";
import { generaIdee } from "./genera";
import type { ChiamaModello, EsitoChiamata, ParametriChiamata } from "./modello";
import type { RispostaMotore } from "./schema";
import { ideaDiProva, quattroIdeeValide, richiestaDiProva } from "./test-dati";

/** Un finto modello che restituisce, in ordine, le risposte indicate. */
function modelloCopione(risposte: (RispostaMotore | string | "rifiuto")[]) {
  const chiamate: ParametriChiamata[] = [];
  const chiama: ChiamaModello = async (parametri) => {
    // copia dei messaggi: l'elenco originale cresce con i tentativi successivi
    chiamate.push({ ...parametri, messaggi: [...parametri.messaggi] });
    const prossima = risposte[chiamate.length - 1];
    const testo = typeof prossima === "string" ? prossima : JSON.stringify(prossima);
    const esito: EsitoChiamata = {
      testo: prossima === "rifiuto" ? "" : testo,
      motivoFine: prossima === "rifiuto" ? "refusal" : "end_turn",
      modelloUsato: "claude-sonnet-5-5",
      uso: { input: 1000, output: 500, cacheLettura: 0, cacheScrittura: 0 },
      tokenRagionamento: 100,
      contenuto: [{ type: "text", text: testo }],
    };
    return esito;
  };
  return { chiama, chiamate };
}

function risposta(idee = quattroIdeeValide()): RispostaMotore {
  return { lettura_profilo: "Ama cucinare.", avvisi: [], domande_utili: [], idee };
}

const opzioni = (chiamaModello: ChiamaModello) => ({
  promptVersione: "motore-v1",
  modello: "claude-sonnet-5-5",
  effort: "medium" as const,
  chiamaModello,
});

describe("generazione delle idee", () => {
  it("risposta corretta al primo colpo: una sola chiamata", async () => {
    const copione = modelloCopione([risposta()]);
    const r = await generaIdee(richiestaDiProva(), opzioni(copione.chiama));
    expect(r.esito).toBe("ok");
    expect(r.risposta?.idee).toHaveLength(4);
    expect(r.tentativi).toHaveLength(1);
    expect(r.uso.input).toBe(1000);
    expect(r.costoStimatoUsd).toBeCloseTo(0.007);
    // il prompt di sistema è quello del file prompts/motore-v1.md
    expect(copione.chiamate[0].sistema).toContain("Sei un esperto di regali internazionale");
  });

  it("JSON non valido: ritenta una volta e poi va bene", async () => {
    const copione = modelloCopione(["{ non è json", risposta()]);
    const r = await generaIdee(richiestaDiProva(), opzioni(copione.chiama));
    expect(r.esito).toBe("ok");
    expect(r.tentativi.map((t) => t.motivo)).toEqual(["prima", "json_non_valido"]);
    expect(r.tentativi[0].errore_json).toContain("non è un JSON valido");
    expect(r.tentativi[0].testo_scartato).toBe("{ non è json");
  });

  it("JSON non valido due volte: errore gentile", async () => {
    const copione = modelloCopione(["no", JSON.stringify({ idee: [] })]);
    const r = await generaIdee(richiestaDiProva(), opzioni(copione.chiama));
    expect(r.esito).toBe("errore");
    expect(r.codiceErrore).toBe("json");
    expect(r.tentativi).toHaveLength(2);
  });

  it("idea fuori budget: ritenta spiegando l'errore al modello", async () => {
    const sbagliate = quattroIdeeValide();
    sbagliate[3] = ideaDiProva({ titolo: "Robot da cucina", prezzo_min: 80, prezzo_max: 120 });
    const copione = modelloCopione([risposta(sbagliate), risposta()]);
    const r = await generaIdee(richiestaDiProva(), opzioni(copione.chiama));
    expect(r.esito).toBe("ok");
    expect(r.tentativi[0].problemi?.[0].titolo).toBe("Robot da cucina");
    const correzione = copione.chiamate[1].messaggi.at(-1)?.content as string;
    expect(correzione).toContain("Idea 4 «Robot da cucina»");
    expect(correzione).toContain("oltre il budget massimo di 50 EUR");
  });

  it("errori anche al secondo tentativo: mostra solo le idee valide, completate con le precedenti", async () => {
    const [a, b, c] = quattroIdeeValide();
    const fuori = ideaDiProva({ titolo: "Robot", prezzo_min: 80, prezzo_max: 120 });
    const fuori2 = ideaDiProva({ titolo: "Bici", prezzo_min: 300, prezzo_max: 400 });
    const copione = modelloCopione([risposta([a, b, fuori, fuori2]), risposta([c, fuori, fuori2, fuori2])]);
    const r = await generaIdee(richiestaDiProva(), opzioni(copione.chiama));
    expect(r.esito).toBe("parziale");
    expect(r.risposta?.idee.map((i) => i.titolo)).toEqual([c.titolo, a.titolo, b.titolo]);
    expect(r.tentativi).toHaveLength(2);
  });

  it("più di 4 idee con almeno 4 valide: prende le prime 4 senza ritentare", async () => {
    const idee = [ideaDiProva({ titolo: "Troppo cara", prezzo_max: 500 }), ...quattroIdeeValide()];
    const copione = modelloCopione([risposta(idee)]);
    const r = await generaIdee(richiestaDiProva(), opzioni(copione.chiama));
    expect(r.esito).toBe("ok");
    expect(r.tentativi).toHaveLength(1);
    expect(r.risposta?.idee.map((i) => i.titolo)).not.toContain("Troppo cara");
  });

  it("rifiuto del modello: errore senza ritentare", async () => {
    const copione = modelloCopione(["rifiuto"]);
    const r = await generaIdee(richiestaDiProva(), opzioni(copione.chiama));
    expect(r.esito).toBe("errore");
    expect(r.codiceErrore).toBe("rifiuto");
    expect(r.tentativi).toHaveLength(1);
  });

  it("versione del prompt inesistente: errore di configurazione", async () => {
    const copione = modelloCopione([risposta()]);
    const r = await generaIdee(richiestaDiProva(), { ...opzioni(copione.chiama), promptVersione: "motore-v999" });
    expect(r.codiceErrore).toBe("configurazione");
    expect(copione.chiamate).toHaveLength(0);
  });
});
