import { afterEach, describe, expect, it } from "vitest";
import { trovaPaese } from "@/config/paesi";
import { linkAmazon, linkGoogleShopping, pulisciQuery } from "./link";

const italia = trovaPaese("IT")!;
const regnoUnito = trovaPaese("GB")!;

afterEach(() => {
  delete process.env.AMAZON_TAG_IT;
});

describe("link Amazon", () => {
  it("senza tag non è un link di affiliazione", () => {
    const { url, affiliato } = linkAmazon("tazza ceramica fatta a mano", italia);
    expect(url).toBe("https://www.amazon.it/s?k=tazza+ceramica+fatta+a+mano");
    expect(affiliato).toBe(false);
  });

  it("con il tag del marketplace aggiunge &tag=", () => {
    process.env.AMAZON_TAG_IT = "pensierino-21";
    const { url, affiliato } = linkAmazon("tazza", italia);
    expect(url).toBe("https://www.amazon.it/s?k=tazza&tag=pensierino-21");
    expect(affiliato).toBe(true);
  });

  it("ignora un tag non valido", () => {
    process.env.AMAZON_TAG_IT = "tag con spazi&x=1";
    expect(linkAmazon("tazza", italia).affiliato).toBe(false);
  });

  it("usa il dominio del paese", () => {
    expect(linkAmazon("mug", regnoUnito).url).toBe("https://www.amazon.co.uk/s?k=mug");
  });
});

describe("link Google Shopping", () => {
  it("usa la scheda Shopping (udm=28) con paese e lingua", () => {
    expect(linkGoogleShopping("handmade mug", regnoUnito, "it")).toBe(
      "https://www.google.co.uk/search?q=handmade+mug&udm=28&gl=uk&hl=it",
    );
  });
});

describe("pulizia della query", () => {
  it("toglie eventuali indirizzi web e caratteri strani", () => {
    expect(pulisciQuery('  libro  https://evil.example/x  "giallo" ')).toBe("libro giallo");
  });
});
