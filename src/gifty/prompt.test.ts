import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { promptDomande, TEMI, temiACaso } from "./prompt";

describe("domande diverse a ogni partita", () => {
  it("pesca argomenti diversi tra loro", () => {
    const t = temiACaso(7);
    expect(new Set(t).size).toBe(7);
    t.forEach((x) => expect(TEMI).toContain(x));
  });
  it("due partite non hanno quasi mai gli stessi argomenti", () => {
    let uguali = 0;
    for (let i = 0; i < 50; i++) if (temiACaso(7).join() === temiACaso(7).join()) uguali++;
    expect(uguali).toBe(0);
  });
  it("il prompt del round 1 contiene gli argomenti e le domande già viste", () => {
    const p = promptDomande("it", [{ q: "Per chi è il regalo?", a: ["Mamma"] }], 1, [], ["{nome} canta in macchina?"], ["the dream holiday"]);
    expect(p).toContain("1. the dream holiday");
    expect(p).toContain("{nome} canta in macchina?");
  });
});
