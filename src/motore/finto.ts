/**
 * MOTORE FINTO: inventa idee di prova senza chiamare l'AI.
 *
 * Serve solo per sviluppare e provare il sito senza chiave API (MOTORE_FINTO=1).
 * Le idee rispettano budget e filtri ma sono generiche. Non attivarlo mai in produzione.
 */
import type { Ingombro, Tipologia } from "@/config/opzioni";
import { INGOMBRI } from "@/config/opzioni";
import { normalizzaTitolo, sogliaMinima } from "./controlli";
import type { ChiamaModello } from "./modello";
import type { RispostaMotore } from "./schema";

type IdeaModello = {
  tipologia: Tipologia;
  ingombro: Ingombro;
  it: [titolo: string, descrizione: string, query: string];
  en: [titolo: string, descrizione: string, query: string];
};

const CATALOGO: IdeaModello[] = [
  { tipologia: "esperienze", ingombro: "piccolo", it: ["Corso di cucina di una sera", "Una lezione pratica con uno chef, da fare da soli o in coppia.", "corso di cucina esperienza regalo"], en: ["One-evening cooking class", "A hands-on lesson with a chef, alone or as a couple.", "cooking class gift experience"] },
  { tipologia: "esperienze", ingombro: "piccolo", it: ["Biglietti per un concerto dal vivo", "Due biglietti per un concerto in un locale intimo della sua città.", "biglietti concerto regalo"], en: ["Tickets for a live gig", "Two tickets for a gig in a small venue in their town.", "concert tickets gift"] },
  { tipologia: "libri e cultura", ingombro: "piccolo", it: ["Giallo nordico in edizione illustrata", "Un classico del giallo scandinavo in un'edizione curata, da tenere in libreria.", "giallo nordico edizione illustrata"], en: ["Illustrated Nordic crime novel", "A Scandinavian crime classic in a beautiful edition.", "nordic noir illustrated edition"] },
  { tipologia: "libri e cultura", ingombro: "piccolo", it: ["Abbonamento a una rivista di viaggi", "Un anno di una rivista di viaggi e reportage, un numero al mese.", "abbonamento rivista viaggi"], en: ["Travel magazine subscription", "A year of a travel and reportage magazine, one issue a month.", "travel magazine subscription"] },
  { tipologia: "cibo e bevande", ingombro: "medio", it: ["Cesto di specialità artigianali", "Una selezione di prodotti di piccoli produttori: miele, biscotti, conserve.", "cesto specialità artigianali regalo"], en: ["Hamper of artisan treats", "A selection from small producers: honey, biscuits, preserves.", "artisan food hamper gift"] },
  { tipologia: "cibo e bevande", ingombro: "medio", it: ["Kit per fare il pane in casa", "Lievito madre essiccato, farine speciali e cestino per la lievitazione.", "kit pane fatto in casa"], en: ["Home bread-making kit", "Dried sourdough starter, special flours and a proofing basket.", "bread making kit"] },
  { tipologia: "tecnologia", ingombro: "piccolo", it: ["Lampada da lettura ricaricabile", "Una luce da libro leggera, con luce calda regolabile.", "lampada lettura ricaricabile luce calda"], en: ["Rechargeable reading light", "A light clip-on book lamp with adjustable warm light.", "rechargeable book light warm"] },
  { tipologia: "tecnologia", ingombro: "piccolo", it: ["Altoparlante bluetooth impermeabile", "Piccolo, robusto e con un buon suono, per la doccia o la gita.", "altoparlante bluetooth impermeabile"], en: ["Waterproof Bluetooth speaker", "Small, sturdy and with good sound, for the shower or a day out.", "waterproof bluetooth speaker"] },
  { tipologia: "casa", ingombro: "medio", it: ["Tazze in ceramica fatte a mano", "Una coppia di tazze artigianali, ognuna leggermente diversa.", "tazze ceramica fatte a mano"], en: ["Handmade ceramic mugs", "A pair of artisan mugs, each slightly different.", "handmade ceramic mugs set"] },
  { tipologia: "casa", ingombro: "medio", it: ["Pianta facile con vaso decorativo", "Una pianta da interno che perdona le dimenticanze, in un vaso di design.", "pianta da interno vaso decorativo"], en: ["Easy houseplant in a decorative pot", "An indoor plant that forgives forgetfulness, in a designer pot.", "easy houseplant decorative pot"] },
  { tipologia: "benessere", ingombro: "medio", it: ["Coperta in lana morbida", "Un plaid caldo e leggero per le sere sul divano.", "plaid lana morbida"], en: ["Soft wool throw", "A warm, light throw for evenings on the sofa.", "soft wool throw blanket"] },
  { tipologia: "benessere", ingombro: "piccolo", it: ["Set per il tè con teiera in vetro", "Teiera con infusore e una selezione di tè sfusi.", "teiera vetro infusore set tè"], en: ["Tea set with glass teapot", "A teapot with infuser and a selection of loose-leaf teas.", "glass teapot infuser tea set"] },
  { tipologia: "hobby e tempo libero", ingombro: "medio", it: ["Puzzle da 1000 pezzi d'autore", "Un puzzle con l'illustrazione di un artista contemporaneo.", "puzzle 1000 pezzi illustrazione"], en: ["1000-piece art jigsaw", "A jigsaw featuring a contemporary artist's illustration.", "1000 piece jigsaw art"] },
  { tipologia: "hobby e tempo libero", ingombro: "piccolo", it: ["Kit acquerello da viaggio", "Colori compatti, pennello con serbatoio e taccuino, per dipingere ovunque.", "kit acquerello da viaggio"], en: ["Travel watercolour kit", "Compact paints, a water brush and a sketchbook to paint anywhere.", "travel watercolor kit"] },
  { tipologia: "accessori", ingombro: "piccolo", it: ["Portafoglio in pelle con incisione", "Un portafoglio sottile con le iniziali incise.", "portafoglio pelle personalizzato"], en: ["Engraved leather wallet", "A slim wallet with engraved initials.", "personalised leather wallet"] },
  { tipologia: "accessori", ingombro: "piccolo", it: ["Borraccia termica di design", "Tiene le bevande calde o fredde per ore, con un bel disegno.", "borraccia termica design"], en: ["Designer insulated bottle", "Keeps drinks hot or cold for hours, with a nice design.", "insulated water bottle design"] },
];

const MAX_INGOMBRO = { piccolo: 0, medio: 1, qualsiasi: 2 } as const;

export const chiamaMotoreFinto: ChiamaModello = async ({ richiesta: r }) => {
  await new Promise((fatto) => setTimeout(fatto, 1200));

  const lingua = r.richiesta.lingua === "it" ? "it" : "en";
  const esclusi = new Set(r.escludi_titoli.map(normalizzaTitolo));
  const candidati = CATALOGO.filter(
    (idea) =>
      (r.richiesta.tipologie.length === 0 || r.richiesta.tipologie.includes(idea.tipologia)) &&
      INGOMBRI.indexOf(idea.ingombro) <= MAX_INGOMBRO[r.richiesta.ingombro_max],
  );

  // Se le idee del catalogo sono finite, ne creiamo delle varianti numerate
  const scelte: { modello: IdeaModello; titolo: string }[] = [];
  for (let giro = 1; scelte.length < 4 && candidati.length > 0 && giro < 20; giro++) {
    for (const modello of candidati) {
      const titolo = giro === 1 ? modello[lingua][0] : `${modello[lingua][0]} (${giro})`;
      if (scelte.length < 4 && !esclusi.has(normalizzaTitolo(titolo))) scelte.push({ modello, titolo });
    }
  }

  const minimo = sogliaMinima(r.richiesta);
  const massimo = r.richiesta.budget_max;
  const prezzo = (quota: number) => Math.round((minimo + (massimo - minimo) * quota) * 100) / 100;
  const descrizioneVuota = !r.profilo.descrizione;

  const risposta: RispostaMotore = {
    lettura_profilo:
      lingua === "it"
        ? `Regalo per ${r.profilo.relazione}, occasione: ${r.richiesta.occasione}. (Idee di prova: il motore vero leggerà la descrizione.)`
        : `A gift for: ${r.profilo.relazione}, occasion: ${r.richiesta.occasione}. (Test ideas: the real engine will read the description.)`,
    avvisi: descrizioneVuota
      ? [lingua === "it" ? "Il profilo è molto breve: le idee sono generiche." : "The profile is very short: the ideas are generic."]
      : [],
    domande_utili: descrizioneVuota
      ? lingua === "it"
        ? ["Che cosa ama fare nel tempo libero?", "C’è qualcosa che usa tutti i giorni?"]
        : ["What do they love doing in their free time?", "Is there something they use every day?"]
      : [],
    idee: scelte.map(({ modello, titolo }, indice) => ({
      titolo,
      descrizione: modello[lingua][1],
      perche:
        lingua === "it"
          ? "È un’idea di prova scelta in base ai filtri e al budget."
          : "It’s a test idea chosen based on the filters and budget.",
      tipo: indice % 2 === 0 ? "sicura" : "originale",
      tipologia: modello.tipologia,
      ingombro: modello.ingombro,
      prezzo_min: prezzo(0.15 + indice * 0.05),
      prezzo_max: prezzo(0.75 + indice * 0.05),
      query_ricerca: modello[lingua][2],
      attenzione: indice === 1 ? (lingua === "it" ? "Controlla i tempi di consegna." : "Check delivery times.") : "",
    })),
  };

  return {
    testo: JSON.stringify(risposta),
    motivoFine: "end_turn",
    modelloUsato: "finto",
    uso: { input: 0, output: 0, cacheScrittura: 0, cacheLettura: 0 },
    tokenRagionamento: null,
    contenuto: [{ type: "text", text: JSON.stringify(risposta) }],
  };
};
