/**
 * Prodotti VERI per le idee regalo: ricerca su Google Shopping (Italia) tramite un servizio esterno.
 * Ogni idea dell'AI ha una "query di ricerca": qui la usiamo per trovare un articolo reale in vendita,
 * con la sua foto, il suo prezzo, il negozio e il link. L'AI non scrive mai indirizzi web.
 *
 * Servizi supportati (basta una delle due chiavi, nelle variabili d'ambiente):
 * - SERPER_API_KEY  → serper.dev (2.500 ricerche gratuite all'iscrizione, poi a pagamento)
 * - SERPAPI_API_KEY → serpapi.com (piano gratuito con poche ricerche al mese)
 * Senza chiave, o se non si trova nulla, la carta usa la foto Pexels o l'emoji: il sito funziona lo stesso.
 * Le ricerche restano in memoria 24 ore per non pagarle due volte.
 */
import "server-only";

export type Prodotto = { titolo: string; prezzo: number | null; negozio: string; immagine: string; link: string };

// Indirizzi dei servizi (modificabili solo per i test automatici)
const SERPER_URL = process.env.SERPER_API_URL?.trim() || "https://google.serper.dev/shopping";
const SERPAPI_URL = process.env.SERPAPI_API_URL?.trim() || "https://serpapi.com/search.json";
const DURATA_CACHE = 24 * 3600 * 1000;
const cache = new Map<string, { risultati: Prodotto[]; scade: number }>();

/** Quale servizio è configurato (null = nessuno). */
export function servizioProdotti(): "serper" | "serpapi" | null {
  if (process.env.SERPER_API_KEY?.trim()) return "serper";
  if (process.env.SERPAPI_API_KEY?.trim()) return "serpapi";
  return null;
}

/** Prezzo in euro da un numero o da un testo come "€ 29,99", "29,99 €", "1.299,00 €". */
export function leggiPrezzo(valore: unknown): number | null {
  if (typeof valore === "number" && Number.isFinite(valore)) return valore;
  if (typeof valore !== "string") return null;
  const cifre = valore.replace(/[^\d.,]/g, "");
  if (!cifre) return null;
  // Formato italiano (1.299,00) o inglese (1,299.00): l'ultimo separatore è quello dei decimali
  const ultimo = Math.max(cifre.lastIndexOf(","), cifre.lastIndexOf("."));
  const intero = ultimo >= 0 && cifre.length - ultimo - 1 <= 2 ? cifre.slice(0, ultimo) : cifre;
  const decimali = ultimo >= 0 && cifre.length - ultimo - 1 <= 2 ? cifre.slice(ultimo + 1) : "";
  const numero = Number(`${intero.replace(/[.,]/g, "")}.${decimali || "0"}`);
  return Number.isFinite(numero) ? numero : null;
}

const httpsValido = (u: unknown): u is string => typeof u === "string" && u.length < 2000 && /^https:\/\/[^\s"'<>()]+$/.test(u);

/** Trasforma un risultato (di Serper o SerpApi) in un Prodotto; null se mancano foto o link. */
export function normalizza(r: Record<string, unknown>): Prodotto | null {
  const immagine = [r.imageUrl, r.thumbnail, r.image].find(httpsValido);
  const link = [r.link, r.product_link].find(httpsValido);
  const titolo = typeof r.title === "string" ? r.title.trim().slice(0, 140) : "";
  if (!immagine || !link || !titolo) return null;
  return {
    titolo,
    prezzo: leggiPrezzo(r.extracted_price) ?? leggiPrezzo(r.price),
    negozio: typeof r.source === "string" ? r.source.slice(0, 60) : "",
    immagine,
    link,
  };
}

async function cerca(query: string): Promise<Prodotto[]> {
  const servizio = servizioProdotti();
  if (!servizio) return [];
  let elenco: Record<string, unknown>[] = [];
  if (servizio === "serper") {
    const risposta = await fetch(SERPER_URL, {
      method: "POST",
      headers: { "X-API-KEY": process.env.SERPER_API_KEY!.trim(), "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, gl: "it", hl: "it" }),
      signal: AbortSignal.timeout(6000),
    });
    if (!risposta.ok) throw new Error(`Serper ${risposta.status}`);
    elenco = ((await risposta.json()) as { shopping?: Record<string, unknown>[] }).shopping ?? [];
  } else {
    const url = new URL(SERPAPI_URL);
    url.search = new URLSearchParams({ engine: "google_shopping", q: query, gl: "it", hl: "it", google_domain: "google.it", api_key: process.env.SERPAPI_API_KEY!.trim() }).toString();
    const risposta = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!risposta.ok) throw new Error(`SerpApi ${risposta.status}`);
    elenco = ((await risposta.json()) as { shopping_results?: Record<string, unknown>[] }).shopping_results ?? [];
  }
  return elenco.slice(0, 10).flatMap((r) => normalizza(r) ?? []);
}

/**
 * Il primo prodotto reale per la query, dentro il budget (tolleranza del 10%) e vicino al prezzo
 * stimato dall'AI; null se non c'è.
 */
/** Parole che non bastano a dire che un prodotto è quello giusto. */
const PAROLE_VUOTE = new Set(
  "regalo regali idea idee set kit per con senza della delle dello degli dei del alla alle allo agli una uno gli le la il lo di da in su tra fra e o personalizzato personalizzata originale edizione nuovo nuova cm pezzi pz".split(" "),
);
const normalizza_ = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
/** Parole importanti di un testo (almeno 4 lettere, non generiche). */
function paroleChiave(testo: string): string[] {
  return normalizza_(testo).split(/[^a-z0-9]+/).filter((p) => p.length >= 4 && !PAROLE_VUOTE.has(p));
}
/** True se il titolo del prodotto contiene almeno una parola importante dell'idea (radice di 5 lettere). */
export function corrisponde(titolo: string, ...testi: string[]): boolean {
  const t = normalizza_(titolo);
  const parole = testi.flatMap(paroleChiave);
  if (!parole.length) return true;
  return parole.some((p) => t.includes(p.slice(0, Math.min(p.length, 5))));
}

export async function trovaProdotto(query: string, budgetMax: number, prezzoStimato?: number, nomeIdea = ""): Promise<Prodotto | null> {
  const q = query.replace(/https?:\/\/\S+/gi, " ").replace(/\s+/g, " ").trim().slice(0, 100);
  if (!q || !servizioProdotti()) return null;
  let risultati: Prodotto[];
  const inCache = cache.get(q);
  if (inCache && inCache.scade > Date.now()) risultati = inCache.risultati;
  else {
    try {
      risultati = await cerca(q);
    } catch (e) {
      console.warn(`[prodotti] "${q}": ${e instanceof Error ? e.message : e}`);
      return null;
    }
    if (cache.size > 2000) cache.clear();
    cache.set(q, { risultati, scade: Date.now() + DURATA_CACHE });
  }
  // Solo prodotti dentro il budget e che corrispondono davvero all'idea (niente tazze al posto di un corso!)
  const nelBudget = risultati.filter((p) => (p.prezzo === null || p.prezzo <= budgetMax * 1.1) && corrisponde(p.titolo, q, nomeIdea));
  if (!nelBudget.length) return null;
  // Se l'AI ha stimato un prezzo, preferiamo i prodotti più vicini a quella cifra (tra i primi 5)
  if (prezzoStimato && prezzoStimato > 0) {
    const primi = nelBudget.slice(0, 5);
    const distanza = (p: Prodotto) => (p.prezzo === null ? Infinity : Math.abs(p.prezzo - prezzoStimato) / prezzoStimato);
    return [...primi].sort((a, b) => distanza(a) - distanza(b))[0];
  }
  return nelBudget[0];
}
