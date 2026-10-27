import { describe, expect, it } from "vitest";
import { preparaRichiesta, pulisciTesto, SchemaModulo, SchemaRichiestaApi, sistemaBudget } from "./richiesta";

const moduloBase = {
  paese: "IT",
  relazione: "partner",
  occasione: "compleanno",
  budget_max: 60,
};

describe("budget", () => {
  it("un solo numero è il massimo", () => {
    expect(sistemaBudget(40, null)).toEqual({ budget_min: null, budget_max: 40 });
    expect(sistemaBudget(null, 40)).toEqual({ budget_min: null, budget_max: 40 });
    expect(sistemaBudget(0, 40)).toEqual({ budget_min: null, budget_max: 40 });
    expect(sistemaBudget(20, 40)).toEqual({ budget_min: 20, budget_max: 40 });
    expect(sistemaBudget(null, null)).toBeNull();
  });

  it("il minimo non può superare il massimo", () => {
    const esito = SchemaModulo.safeParse({ ...moduloBase, budget_min: 80, budget_max: 60 });
    expect(esito.success).toBe(false);
  });
});

describe("modulo", () => {
  it("accetta i soli campi obbligatori", () => {
    const esito = SchemaModulo.safeParse(moduloBase);
    expect(esito.success).toBe(true);
    if (esito.success) {
      expect(esito.data.tipologie).toEqual([]);
      expect(esito.data.ingombro_max).toBe("qualsiasi");
    }
  });

  it("con 'altra occasione' serve il testo", () => {
    expect(SchemaModulo.safeParse({ ...moduloBase, occasione: "altra" }).success).toBe(false);
    expect(SchemaModulo.safeParse({ ...moduloBase, occasione: "altra", occasione_altra: "Diwali" }).success).toBe(true);
  });

  it("rifiuta valori sconosciuti", () => {
    expect(SchemaModulo.safeParse({ ...moduloBase, relazione: "vicino di casa" }).success).toBe(false);
    expect(SchemaModulo.safeParse({ ...moduloBase, paese: "XX" }).success).toBe(false);
    expect(SchemaModulo.safeParse({ ...moduloBase, tipologie: ["vestiti"] }).success).toBe(false);
  });
});

describe("pulizia dei testi liberi", () => {
  it("toglie email e numeri di telefono", () => {
    expect(pulisciTesto("scrivile a mario.rossi@example.com")).toBe("scrivile a [rimosso]");
    expect(pulisciTesto("il suo numero è 333 123 4567, chiamala")).toBe("il suo numero è [rimosso], chiamala");
    expect(pulisciTesto("tel +39 06 1234 5678")).toBe("tel [rimosso]");
  });

  it("lascia anni, età e prezzi", () => {
    expect(pulisciTesto("ama la musica 1990-2000")).toBe("ama la musica 1990-2000");
    expect(pulisciTesto("ha 34 anni e spende 50 euro")).toBe("ha 34 anni e spende 50 euro");
  });
});

describe("preparazione della richiesta", () => {
  it("divide profilo e richiesta, pulisce i testi e aggiunge la valuta del paese", () => {
    const api = SchemaRichiestaApi.parse({
      lingua: "en",
      modulo: {
        ...moduloBase,
        paese: "GB",
        eta: 41,
        descrizione: "Loves hiking, email me at a@b.co",
        tipologie: ["esperienze", "esperienze", "casa"],
      },
      risposte: [{ domanda: "Do they travel?", risposta: "Yes, a lot" }, { domanda: "Other?", risposta: "  " }],
    });
    const r = preparaRichiesta(api);
    expect(r.profilo.eta).toBe("41");
    expect(r.profilo.descrizione).toBe("Loves hiking, email me at [rimosso]");
    expect(r.richiesta.valuta).toBe("GBP");
    expect(r.richiesta.tipologie).toEqual(["esperienze", "casa"]);
    expect(r.risposte).toEqual([{ domanda: "Do they travel?", risposta: "Yes, a lot" }]);
  });
});
