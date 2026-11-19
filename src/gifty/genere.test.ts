import { describe, expect, it } from "vitest";
import { adattoAlGenere, genere } from "./genere";

describe("genere", () => {
  it("lo capisce dalla relazione o dalla risposta esplicita", () => {
    expect(genere([{ q: "Per chi è il regalo?", a: ["Mamma"] }])).toBe("F");
    expect(genere([{ q: "Per chi è il regalo?", a: ["Partner"] }, { q: "È un lui o una lei?", a: ["Lui"] }])).toBe("M");
    expect(genere([{ q: "Per chi è il regalo?", a: ["Amico/a"] }, { q: "È un lui o una lei?", a: ["Preferisco non dirlo"] }])).toBeNull();
  });
  it("scarta i prodotti per l'altro sesso", () => {
    expect(adattoAlGenere("Giacca impermeabile uomo", "F")).toBe(false);
    expect(adattoAlGenere("Borsa a tracolla donna in pelle", "F")).toBe(true);
    expect(adattoAlGenere("Orologio da donna", "M")).toBe(false);
    expect(adattoAlGenere("Fujifilm Instax Mini 12", "F")).toBe(true);
  });
});
