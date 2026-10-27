/**
 * Link di ricerca per comprare le idee.
 *
 * I link si costruiscono SOLO a partire dal campo query_ricerca:
 * il modello non genera mai indirizzi web.
 */
import type { Paese } from "@/config/paesi";

/** Pulisce la query: niente indirizzi web, spazi compressi, lunghezza limitata. */
export function pulisciQuery(query: string): string {
  return query
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[<>"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/** Tag di affiliazione Amazon per il paese, letto dalle variabili d'ambiente (solo lato server). */
export function tagAmazon(paese: Paese): string | null {
  const valore = process.env[paese.amazon.variabileTag]?.trim();
  // Un tag valido contiene solo lettere, numeri e trattini (es. "mionegozio-21")
  return valore && /^[A-Za-z0-9-]{2,64}$/.test(valore) ? valore : null;
}

/** Ricerca su Amazon: https://www.amazon.<dominio>/s?k=QUERY (+ &tag=TAG se configurato). */
export function linkAmazon(query: string, paese: Paese): { url: string; affiliato: boolean } {
  const url = new URL(`https://www.${paese.amazon.dominio}/s`);
  url.searchParams.set("k", pulisciQuery(query));
  const tag = tagAmazon(paese);
  if (tag) url.searchParams.set("tag", tag);
  return { url: url.toString(), affiliato: tag !== null };
}

/**
 * Ricerca su Google Shopping nel paese di consegna:
 * https://www.google.<dominio>/search?q=QUERY&udm=28&gl=<paese>&hl=<lingua>
 * (udm=28 apre la scheda Shopping; il vecchio parametro tbm=shop ora reindirizza qui).
 */
export function linkGoogleShopping(query: string, paese: Paese, lingua: string): string {
  const url = new URL(`https://www.${paese.google.dominio}/search`);
  url.searchParams.set("q", pulisciQuery(query));
  url.searchParams.set("udm", "28");
  url.searchParams.set("gl", paese.google.gl);
  url.searchParams.set("hl", lingua);
  return url.toString();
}
