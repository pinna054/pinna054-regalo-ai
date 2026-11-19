/**
 * Foto vere per le carte regalo che non hanno un prodotto di Google Shopping (esperienze, oggetti
 * fatti a mano). Due fonti, in quest'ordine:
 * 1. Pexels (PEXELS_API_KEY): archivio di foto libere; Pexels ha sospeso le nuove chiavi;
 * 2. Google Immagini tramite Serper (SERPER_API_KEY, la stessa dei prodotti): una foto vera del
 *    luogo o dell'oggetto, con il nome del sito come credito. Per la beta va bene; per un lancio
 *    pubblico meglio foto con licenza o le immagini fornite dai negozi affiliati.
 * Senza chiavi le carte restano con l'emoji: il sito funziona lo stesso.
 * Le ricerche restano in memoria per 24 ore, così la stessa foto non costa due volte.
 */
import "server-only";

export type Foto = {
  url: string;
  autore: string;
  link: string;
  /** Miniatura di riserva, se la foto principale non si carica */
  riserva?: string;
  /** "pexels" o "web" (Google Immagini) */
  fonte?: "pexels" | "web";
}

// Indirizzo dell'API (modificabile solo per i test automatici)
const API = process.env.PEXELS_API_URL?.trim() || "https://api.pexels.com/v1";
const DURATA_CACHE = 24 * 3600 * 1000;
const cache = new Map<string, { foto: Foto | null; scade: number }>();

type RispostaPexels = {
  photos?: { url?: string; photographer?: string; src?: { large?: string } }[];
};

/** True se le foto sono attive (chiave Pexels o Serper presente). */
export function fotoAttive(): boolean {
  return Boolean(process.env.PEXELS_API_KEY?.trim() || process.env.SERPER_API_KEY?.trim());
}

/** Cerca una foto per poche parole in inglese (es. "ramen bowl"); null se non la trova. */
export async function cercaFoto(parole: string): Promise<Foto | null> {
  const query = parole.toLowerCase().replace(/[^a-z0-9 \-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (!query || !process.env.PEXELS_API_KEY?.trim()) return null;

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
        fonte: "pexels",
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

// ---------- Google Immagini tramite Serper ----------
const SERPER_IMMAGINI = process.env.SERPER_IMAGES_URL?.trim() || "https://google.serper.dev/images";
const cacheWeb = new Map<string, { foto: Foto | null; scade: number }>();
const https = (u: unknown): u is string => typeof u === "string" && u.length < 2000 && /^https:\/\/[^\s"'<>()]+$/.test(u);

type RisultatoImmagine = { imageUrl?: string; thumbnailUrl?: string; imageWidth?: number; domain?: string; source?: string; link?: string };

/** Una foto vera da Google Immagini per una descrizione in italiano (es. "notte relais spa toscana"). */
export async function cercaFotoWeb(descrizione: string): Promise<Foto | null> {
  const query = descrizione.replace(/https?:\/\/\S+/gi, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  const chiave = process.env.SERPER_API_KEY?.trim();
  if (!query || !chiave) return null;
  const inCache = cacheWeb.get(query);
  if (inCache && inCache.scade > Date.now()) return inCache.foto;

  let foto: Foto | null = null;
  try {
    const risposta = await fetch(SERPER_IMMAGINI, {
      method: "POST",
      headers: { "X-API-KEY": chiave, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, gl: "it", hl: "it", num: 10 }),
      signal: AbortSignal.timeout(5000),
    });
    if (!risposta.ok) throw new Error(`Serper immagini ${risposta.status}`);
    const elenco = ((await risposta.json()) as { images?: RisultatoImmagine[] }).images ?? [];
    // La prima foto vera, abbastanza grande, non un'icona o un'animazione
    const buona = elenco.find(
      (r) => https(r.imageUrl) && https(r.thumbnailUrl) && (r.imageWidth ?? 800) >= 500 && !/\.(svg|gif)(\?|$)/i.test(r.imageUrl!),
    );
    if (buona) {
      foto = {
        url: buona.imageUrl!,
        riserva: buona.thumbnailUrl!,
        autore: String(buona.domain || buona.source || "").replace(/^www\./, "").slice(0, 40),
        link: https(buona.link) ? buona.link : buona.imageUrl!,
        fonte: "web",
      };
    }
  } catch (e) {
    console.warn(`[foto web] "${query}": ${e instanceof Error ? e.message : e}`);
    return null;
  }
  if (cacheWeb.size > 2000) cacheWeb.clear();
  cacheWeb.set(query, { foto, scade: Date.now() + DURATA_CACHE });
  return foto;
}

