import { describe, expect, it } from "vitest";
import { leggiPrezzo, normalizza } from "./prodotti";

describe("prodotti", () => {
  it("legge i prezzi nei formati più comuni", () => {
    expect(leggiPrezzo("€ 29,99")).toBe(29.99);
    expect(leggiPrezzo("29,99 €")).toBe(29.99);
    expect(leggiPrezzo("1.299,00 €")).toBe(1299);
    expect(leggiPrezzo("€1,299.50")).toBe(1299.5);
    expect(leggiPrezzo("45 €")).toBe(45);
    expect(leggiPrezzo(12.5)).toBe(12.5);
    expect(leggiPrezzo("gratis")).toBeNull();
  });
  it("normalizza i risultati di Serper e SerpApi e scarta quelli senza foto o link sicuri", () => {
    expect(normalizza({ title: "Kit ramen", price: "€24,90", source: "Amazon.it", link: "https://www.amazon.it/x", imageUrl: "https://encrypted-tbn0.gstatic.com/a" }))
      .toEqual({ titolo: "Kit ramen", prezzo: 24.9, negozio: "Amazon.it", immagine: "https://encrypted-tbn0.gstatic.com/a", link: "https://www.amazon.it/x" });
    expect(normalizza({ title: "Moka", extracted_price: 39, source: "Bialetti", product_link: "https://www.google.it/shopping/p", thumbnail: "https://serpapi.com/img.jpg" })?.prezzo).toBe(39);
    expect(normalizza({ title: "x", link: "javascript:alert(1)", imageUrl: "https://a/b" })).toBeNull();
    expect(normalizza({ title: "x", link: "https://a/b", imageUrl: "https://a/b')" })).toBeNull();
  });
});

import { corrisponde } from "./prodotti";
describe("corrispondenza prodotto-idea", () => {
  it("accetta il prodotto giusto e scarta quello a caso", () => {
    expect(corrisponde("Fujifilm Instax Mini 12 fotocamera istantanea", "Fujifilm Instax Mini 12")).toBe(true);
    expect(corrisponde("Set di 6 tazze in ceramica", "corso di ceramica al tornio", "Lezione di ceramica")).toBe(true);
    expect(corrisponde("Set di 6 tazze colorate", "Lego Icons Bonsai 10281", "Bonsai Lego")).toBe(false);
    expect(corrisponde("Mappa del mondo da grattare con telaio", "mappa mondo da grattare")).toBe(true);
  });
});
