/**
 * Affiliazione Awin (Etsy, Smartbox, Emozione3, librerie, elettronica…).
 *
 * Variabili d'ambiente:
 * - AWIN_PUBLISHER_ID: il numero del tuo account Awin (es. 3161335);
 * - AWIN_NEGOZI: i negozi che ti hanno approvato, come "dominio:id" separati da virgole,
 *   es. "etsy.com:6220,smartbox.com:12345" (l'id del negozio è nella pagina del negozio su Awin).
 * Se il link di un prodotto porta a uno di questi negozi, diventa un link Awin con il tuo codice.
 * Formato Awin: https://www.awin1.com/cread.php?awinmid=ID_NEGOZIO&awinaffid=TUO_ID&ued=LINK
 */
type Negozio = { dominio: string; id: string };

function configurazione(): { publisher: string; negozi: Negozio[] } | null {
  const publisher = process.env.AWIN_PUBLISHER_ID?.trim() ?? "";
  if (!/^\d{3,12}$/.test(publisher)) return null;
  const negozi = (process.env.AWIN_NEGOZI ?? "")
    .split(",")
    .map((voce) => voce.trim().toLowerCase().split(":"))
    .filter(([d, id]) => d && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d) && /^\d{1,10}$/.test(id ?? ""))
    .map(([dominio, id]) => ({ dominio: dominio.replace(/^www\./, ""), id }));
  return negozi.length ? { publisher, negozi } : null;
}

/** Il link affiliato Awin per un link di negozio, oppure null se il negozio non è tra quelli approvati. */
export function linkAwin(link: string): string | null {
  const conf = configurazione();
  if (!conf) return null;
  let host: string;
  try {
    host = new URL(link).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
  const negozio = conf.negozi.find((n) => host === n.dominio || host.endsWith(`.${n.dominio}`));
  if (!negozio) return null;
  const url = new URL("https://www.awin1.com/cread.php");
  url.searchParams.set("awinmid", negozio.id);
  url.searchParams.set("awinaffid", conf.publisher);
  url.searchParams.set("ued", link);
  return url.toString();
}
