/**
 * Foto vere per le carte regalo, dall'archivio gratuito Pexels (https://www.pexels.com/api/).
 *
 * Serve la variabile PEXELS_API_KEY (gratuita: 200 ricerche all'ora, 20.000 al mese).
 * Senza chiave, o se Pexels non risponde, le carte restano con l'emoji: il sito funziona lo stesso.
 * Le ricerche sono tenute in memoria per 24 ore, così la stessa foto non costa due volte.
 * Licenza Pexels: uso libero, citando il fotografo e Pexels (lo fa la carta).
 */
import "server-only";

export type Foto = { url: string; autore: string; link: string };

// Indirizzo dell'API (modificabile solo per i test automatici)
const API = process.env.PEXELS_API_URL?.trim() || "https://api.pexels.com/v1";
const DURATA_CACHE = 24 * 3600 * 1000;
const cache = new Map<string, { foto: Foto | null; scade: number }>();

type RispostaPexels = {
  photos?: { url?: string; photographer?: string; src?: { large?: string } }[];
};

/** True se le foto sono attive (chiave Pexels presente). */
export function fotoAttive(): boolean {
  return Boolean(process.env.PEXELS_API_KEY?.trim());
}

/** Cerca una foto per poche parole in inglese (es. "ramen bowl"); null se non la trova. */
export async function cercaFoto(parole: string): Promise<Foto | null> {
  const query = parole.toLowerCase().replace(/[^a-z0-9 \-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (!query || !fotoAttive()) return null;

  const inCache = cache.get(query);
  if (inCache && inCache.scade > Date.now()) return inCache.foto;

  let foto: Foto | null = null;
  try {
    const risposta = await fetch(`${API}/search?per_page=1&orientation=landscape&query=${encodeURIComponent(query)}`, {
      headers: { Authorization: process.env.PEXELS_API_KEY!.trim() },
      signal: AbortSignal.timeout(4000),
    });
    if (!risposta.ok) throw new Error(`Pexels ${risposta.status}`);
    const primo = ((await risposta.json()) as RispostaPexels).photos?.[0];
    const url = primo?.src?.large ?? "";
    // Accettiamo solo immagini servite da Pexels, così nella pagina non finisce mai un indirizzo strano
    if (url.startsWith("https://images.pexels.com/")) {
      foto = {
        url,
        autore: String(primo?.photographer ?? "").slice(0, 60),
        link: primo?.url?.startsWith("https://www.pexels.com/") ? primo.url : "https://www.pexels.com",
      };
    }
  } catch (e) {
    console.warn(`[foto] "${query}": ${e instanceof Error ? e.message : e}`);
    return null; // errore temporaneo: non lo mettiamo in cache
  }

  if (cache.size > 2000) cache.clear();
  cache.set(query, { foto, scade: Date.now() + DURATA_CACHE });
  return foto;
}

/** Aggiunge la foto a ogni regalo (in parallelo). */
export async function conFoto<T extends { photo: string }>(regali: T[]): Promise<(T & { foto: Foto | null })[]> {
  const foto = await Promise.all(regali.map((r) => cercaFoto(r.photo)));
  return regali.map((r, i) => ({ ...r, foto: foto[i] }));
}
