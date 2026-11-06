/**
 * Modalità demo di Gifty: domande e regali SENZA AI, quando la chiave manca o l'AI non risponde.
 *
 * Usa l'archivio di domande goliardiche e il catalogo di regali della demo (src/motore/demo):
 * - round 1: domande da aree diverse; round 2: domande sulle aree dove la risposta è stata Sì;
 * - regali: ogni regalo prende punti dai suoi "temi" (Sì +3, No −2, ♥ +2, ✕ −1.5, parole nelle
 *   risposte aperte +2), poi si scelgono i migliori dentro il budget, vari tra loro.
 */
import "server-only";
import { type Tipologia } from "@/config/opzioni";
import { iconaIdea } from "@/lib/icone";
import { CATALOGO, type RegaloDemo } from "@/motore/demo/catalogo";
import { DOMANDE_APERTE, DOMANDE_SI_NO, type DomandaDemo } from "@/motore/demo/domande";
import { FRASE_TEMA, PAROLE_TEMA, TEMI, type Tema } from "@/motore/demo/temi";
import { BATCH, DOMANDE_PER_ROUND, type Lingua, type Risposta, type Round } from "./prompt";

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
function mescola<T>(elenco: T[]): T[] {
  const copia = [...elenco];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}
const aCaso = <T,>(elenco: T[]) => elenco[Math.floor(Math.random() * elenco.length)];

// Ogni domanda dell'archivio, con la sua area, riconoscibile dal testo (con {nome})
const AREE = Object.entries(DOMANDE_SI_NO);
const DOMANDA_PER_TESTO = new Map<string, { area: string; d: DomandaDemo }>();
for (const [area, domande] of AREE) for (const d of domande) for (const t of [d.it, d.en]) DOMANDA_PER_TESTO.set(norm(t), { area, d });

const EMOJI_AREA: Record<string, string> = {
  musica: "🎤", cibo: "🍜", caffe: "☕", viaggi: "🧳", sport: "🏃", casa: "🏡", tecnologia: "📱",
  cultura: "🎭", creativita: "🎨", benessere: "🧘", carattere: "🦊",
};
const REAZIONI = {
  it: {
    si: ["Lo sapevo! 🦊", "Annotato, gran gusto.", "Ottimo indizio!", "Ah, interessante…", "Questa me la segno 📝", "Si vede che lo conosci!"],
    no: ["Scartato, niente rischi.", "Meno male che me l'hai detto!", "Ok, cancello l'idea 😅", "Bene saperlo!", "Pericolo evitato.", "Niente da fare, capito."],
  },
  en: {
    si: ["Knew it! 🦊", "Noted, great taste.", "Great clue!", "Ooh, interesting…", "Writing that down 📝", "You really know them!"],
    no: ["Crossed off, no risks.", "Glad you told me!", "OK, scrapping that idea 😅", "Good to know!", "Danger avoided.", "Got it, no way."],
  },
};

/** Il "sì" / "no" di una risposta da scorrere. */
const eSi = (a: string) => ["sì", "si", "yes"].includes(norm(a));
const eNo = (a: string) => norm(a) === "no";

/** Un round di domande demo. */
export function domandeDemo(lingua: Lingua, round: Round, risposte: Risposta[], giaChieste: string[]) {
  const chieste = new Set(giaChieste.map(norm));
  // Round 2: prima le aree dove la risposta è stata Sì
  const areeSi = new Set(
    risposte.flatMap((r) => {
      const trovata = DOMANDA_PER_TESTO.get(norm(r.q));
      return trovata && eSi(r.a[0] ?? "") ? [trovata.area] : [];
    }),
  );
  const ordine = mescola(AREE).sort(([a], [b]) => (round === 2 ? Number(areeSi.has(b)) - Number(areeSi.has(a)) : 0));
  const scelte: { area: string; d: DomandaDemo }[] = [];
  // Un giro per area, poi un secondo giro se servono altre domande
  for (let giro = 0; giro < 3 && scelte.length < DOMANDE_PER_ROUND[round]; giro++) {
    for (const [area, domande] of ordine) {
      if (scelte.length >= DOMANDE_PER_ROUND[round]) break;
      const libera = mescola(domande).find((d) => !chieste.has(norm(d[lingua])) && !scelte.some((s) => s.d === d));
      if (libera && (giro > 0 || !scelte.some((s) => s.area === area))) scelte.push({ area, d: libera });
    }
  }
  const aperta = aCaso(DOMANDE_APERTE);
  return {
    questions: scelte.map(({ area, d }) => ({
      emoji: EMOJI_AREA[area] ?? "🦊",
      question: d[lingua],
      yes_reaction: aCaso(REAZIONI[lingua].si),
      no_reaction: aCaso(REAZIONI[lingua].no),
    })),
    open_question: {
      emoji: "🔍",
      question: aperta[lingua],
      hint: lingua === "it" ? "Il dettaglio che solo tu conosci fa la differenza." : "The detail only you know makes the difference.",
    },
  };
}

/** Budget dalla risposta alla domanda "Quanto vuoi spendere?" (es. "30–70 €", "Over €300"). */
function budget(risposte: Risposta[]): { min: number; max: number } {
  const testo = risposte.find((r) => /€/.test(r.a.join(" ")))?.a.join(" ") ?? "";
  const numeri = (testo.match(/\d+/g) ?? []).map(Number);
  if (/oltre|over/i.test(testo) && numeri[0]) return { min: numeri[0], max: numeri[0] * 3 };
  if (numeri.length >= 2) return { min: numeri[0], max: numeri[1] };
  if (numeri.length === 1) return { min: 0, max: numeri[0] };
  return { min: 0, max: 100 };
}

function temiNelTesto(testo: string): Tema[] {
  const t = ` ${testo.toLowerCase()} `;
  return TEMI.filter((tema) => (PAROLE_TEMA[tema] ?? []).some((parola) => t.includes(parola)));
}

// Colori della carta per categoria (scuro, acceso), nello stile notturno di Gifty
const COLORI: Record<Tipologia, [string, string]> = {
  esperienze: ["#3a1430", "#ff7aa8"],
  "libri e cultura": ["#1d1640", "#9b8cff"],
  "cibo e bevande": ["#3a1a08", "#ff9a4c"],
  tecnologia: ["#0f1d33", "#6fb3ff"],
  casa: ["#13301f", "#7fe0a8"],
  benessere: ["#10302e", "#7fe0d0"],
  "hobby e tempo libero": ["#33140f", "#ff7a5c"],
  accessori: ["#2e2414", "#ffd36b"],
};

const BADGE: Partial<Record<Tema, { it: string; en: string }>> = {
  musica: { it: "🎤 Anima da concerto", en: "🎤 Gig soul" },
  feste: { it: "🪩 Re/regina della serata", en: "🪩 Life of the party" },
  vintage: { it: "📻 Cacciatore di vintage", en: "📻 Vintage hunter" },
  arte: { it: "🎨 Occhio d'artista", en: "🎨 Artist's eye" },
  cibo: { it: "🍜 Palato curioso", en: "🍜 Curious palate" },
  cucina: { it: "👩‍🍳 Chef di casa", en: "👩‍🍳 Home chef" },
  caffe: { it: "☕ Sommelier dell'espresso", en: "☕ Espresso sommelier" },
  benessere: { it: "🧘 Zen certificato", en: "🧘 Certified zen" },
  avventura: { it: "🧗 Spirito avventuroso", en: "🧗 Adventurous spirit" },
  viaggi: { it: "🧭 Esploratore nato", en: "🧭 Born explorer" },
  natura: { it: "🌲 Cuore selvatico", en: "🌲 Wild heart" },
  relax: { it: "🛋️ Campione di divano", en: "🛋️ Sofa champion" },
  sport: { it: "🏃 Motore sempre acceso", en: "🏃 Always on the move" },
  tech: { it: "📱 Smanettone", en: "📱 Gadget geek" },
  gaming: { it: "🕹️ Gamer nell'anima", en: "🕹️ Gamer at heart" },
  lettura: { it: "📚 Topo di biblioteca", en: "📚 Bookworm" },
  film: { it: "🍿 Maratoneta di serie", en: "🍿 Binge-watcher" },
  foto: { it: "📷 Occhio da fotografo", en: "📷 Photographer's eye" },
  piante: { it: "🪴 Pollice verde", en: "🪴 Green thumb" },
  stile: { it: "✨ Icona di stile", en: "✨ Style icon" },
};

/** Un lotto di regali demo, con ritratto e titoli per il Conosciometro. */
export function regaliDemo(
  lingua: Lingua,
  risposte: Risposta[],
  piaciute: string[],
  scartate: string[],
  mostrate: string[],
) {
  // Punteggio dei temi
  const punti = new Map<Tema, number>();
  const aggiungi = (temi: Tema[], v: number) => temi.forEach((t) => punti.set(t, (punti.get(t) ?? 0) + v));
  for (const r of risposte) {
    const trovata = DOMANDA_PER_TESTO.get(norm(r.q));
    const a = r.a[0] ?? "";
    if (trovata) aggiungi(trovata.d.temi, eSi(a) ? 3 : eNo(a) ? -2 : 0);
    else aggiungi(temiNelTesto(r.a.join(" ")), 2);
  }
  const perTitolo = (titolo: string) => CATALOGO.find((g) => norm(g.it[0]) === norm(titolo) || norm(g.en[0]) === norm(titolo));
  piaciute.forEach((t) => aggiungi(perTitolo(t)?.temi ?? [], 2));
  scartate.forEach((t) => aggiungi(perTitolo(t)?.temi ?? [], -1.5));

  const { min, max } = budget(risposte);
  const giaVisti = new Set(mostrate.map(norm));
  const liberi = CATALOGO.filter((g) => !giaVisti.has(norm(g[lingua][0])));
  const nelBudget = liberi.filter((g) => g.prezzo[0] <= max && g.prezzo[1] >= min);
  const candidati = (nelBudget.length >= BATCH ? nelBudget : liberi)
    .map((g) => ({ g, p: g.temi.reduce((s, t) => s + (punti.get(t) ?? 0), 0) + Math.random() * 2 }))
    .sort((a, b) => b.p - a.p);

  // Al massimo 2 per categoria
  const scelti: RegaloDemo[] = [];
  for (const { g } of candidati) {
    if (scelti.length === BATCH) break;
    if (scelti.filter((s) => s.tipologia === g.tipologia).length < 2) scelti.push(g);
  }

  const gifts = scelti.map((g) => {
    const [nome, descrizione, perche, cerca] = g[lingua];
    const prezzo = Math.round(Math.min(Math.max((g.prezzo[0] + g.prezzo[1]) / 2, min), max));
    return {
      name: nome,
      tagline:
        g.tipo === "originale"
          ? lingua === "it" ? "Un'idea fuori dagli schemi" : "An out-of-the-box idea"
          : lingua === "it" ? "Va sul sicuro" : "A safe bet",
      description: descrizione,
      why: perche,
      price: prezzo,
      emoji: iconaIdea(nome, g.tipologia),
      colors: COLORI[g.tipologia],
      tags: [],
      search: cerca,
      // Parole per la foto: la ricerca inglese, senza le parole da negozio
      photo: g.en[3].replace(/\b(gift|voucher|box|kit|set|experience|subscription)\b/gi, "").trim(),
    };
  });

  // Ritratto e titoli dai temi più forti
  const forti = [...punti.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  const frasi = forti.slice(0, 3).map((t) => FRASE_TEMA[t][lingua]);
  const portrait = frasi.length
    ? lingua === "it"
      ? `{nome} non si accontenta: ${frasi.join(", ")}. E adesso la volpe sa esattamente cosa cercare.`
      : `{nome} doesn't settle: ${frasi.join(", ")}. And now the fox knows exactly what to look for.`
    : lingua === "it"
      ? "{nome} è un mistero affascinante: la volpe ha dovuto annusare molto bene."
      : "{nome} is a fascinating mystery: the fox had to sniff really hard.";
  const badges = forti.flatMap((t) => (BADGE[t] ? [BADGE[t]![lingua]] : [])).slice(0, 3);
  if (badges.length === 0) badges.push(lingua === "it" ? "🦊 Persona speciale" : "🦊 One of a kind");

  return { portrait, badges, gifts };
}
