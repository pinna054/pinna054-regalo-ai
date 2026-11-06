/**
 * Icona (emoji) di un'idea regalo, scelta dalle parole del titolo.
 * Se nessuna parola corrisponde si usa l'icona della categoria (src/config/opzioni.ts).
 * Per aggiungere un'icona basta aggiungere una riga: [parole, emoji].
 */
import { ASPETTO_TIPOLOGIA, type Tipologia } from "@/config/opzioni";

const ICONE: [parole: string[], icona: string][] = [
  [["concert", "gig", "festival"], "🎤"],
  [["piccant", "hot sauce", "spezie", "spice"], "🌶️"],
  [["cioccolat", "chocolate"], "🍫"],
  [["caffè", "caffe", "coffee", "espresso", "moka", "barista"], "☕"],
  [["matcha", "tè", "tisan", "tea"], "🍵"],
  [["kombucha"], "🫙"],
  [["pane", "bread", "sourdough"], "🍞"],
  [["cucina", "cooking", "cookbook", "chef", "ricett"], "🍜"],
  [["cesto", "hamper", "box"], "🧺"],
  [["graphic novel", "fumett", "comic"], "💥"],
  [["libro", "book", "romanz", "novel", "biografia", "biography", "guida", "guide"], "📖"],
  [["ebook", "e-reader", "lettore"], "📱"],
  [["film", "mubi", "cinema"], "🎬"],
  [["museo", "museum", "mostra", "exhibition"], "🖼️"],
  [["fotocamera", "camera", "foto"], "📷"],
  [["album", "scrapbook"], "📸"],
  [["auricolari", "cuffie", "earbuds", "headphones"], "🎧"],
  [["altoparlante", "speaker"], "🔊"],
  [["giradischi", "vinile", "vinyl", "record"], "💿"],
  [["console", "videogioc", "gaming"], "🕹️"],
  [["lampadina", "bulb", "luce", "light"], "💡"],
  [["localizzatore", "tracker"], "📍"],
  [["proiettore", "projector", "stelle", "star"], "🌌"],
  [["monstera", "pianta", "plant"], "🪴"],
  [["terrario", "terrarium"], "🌱"],
  [["candela", "candle"], "🕯️"],
  [["diffusore", "diffuser"], "🌸"],
  [["plaid", "coperta", "throw", "blanket"], "🛋️"],
  [["tazz", "mug"], "🫖"],
  [["mappa", "map", "poster"], "🗺️"],
  [["yoga"], "🧘"],
  [["surf", "sup"], "🏄"],
  [["parapendio", "paraglid"], "🪂"],
  [["terme", "spa"], "🧖"],
  [["ceramica", "pottery"], "🏺"],
  [["escape"], "🔐"],
  [["albero", "treehouse", "tenda", "tent"], "🌲"],
  [["sentier", "trekking", "hiking", "trail"], "🥾"],
  [["puzzle"], "🧩"],
  [["quiz", "trivia"], "❓"],
  [["carte", "card game"], "🃏"],
  [["gioco", "game"], "🎲"],
  [["mattoncini", "building set"], "🧱"],
  [["maglia", "knit"], "🧶"],
  [["ricamo", "embroider"], "🧵"],
  [["acquerello", "watercolo"], "🎨"],
  [["rullo", "massagg", "roller"], "💆"],
  [["mascherina", "sleep mask"], "😴"],
  [["skincare", "crema"], "🧴"],
  [["cardio", "heart-rate"], "⌚"],
  [["zaino", "backpack"], "🎒"],
  [["borraccia", "bottle"], "💧"],
  [["portafoglio", "wallet"], "👛"],
  [["portachiavi", "keyring"], "🔑"],
  [["taccuino", "notebook", "diario", "journal"], "📓"],
  [["medaglietta", "pet"], "🐾"],
  [["custodia", "case"], "🧳"],
  [["tote", "borsa", "bag"], "👜"],
];

export function iconaIdea(titolo: string, tipologia: Tipologia): string {
  const t = titolo.toLowerCase();
  return ICONE.find(([parole]) => parole.some((p) => t.includes(p)))?.[1] ?? ASPETTO_TIPOLOGIA[tipologia].icona;
}
