/**
 * MOTORE FINTO: inventa idee di prova senza chiamare l'AI.
 *
 * Serve solo per sviluppare e provare il sito senza chiave API (MOTORE_FINTO=1).
 * Le idee sono regali di prova (non scelti sul profilo) che rispettano budget e filtri.
 * Non attivarlo mai in produzione.
 */
import type { Ingombro, Tipologia } from "@/config/opzioni";
import { INGOMBRI } from "@/config/opzioni";
import { normalizzaTitolo, sogliaMinima } from "./controlli";
import type { ChiamaModello } from "./modello";
import type { RispostaMotore } from "./schema";

type IdeaModello = {
  tipologia: Tipologia;
  ingombro: Ingombro;
  tipo: "sicura" | "originale";
  it: [titolo: string, descrizione: string, perche: string, query: string];
  en: [titolo: string, descrizione: string, perche: string, query: string];
};

// Regali di prova, concreti e vari, per vedere come appaiono le carte
const CATALOGO: IdeaModello[] = [
  { tipologia: "esperienze", ingombro: "piccolo", tipo: "originale",
    it: ["Serata di cucina giapponese con uno chef", "Tre ore ai fornelli per imparare ramen, gyoza e mochi, con cena finale insieme agli altri corsisti.", "Per chi ama cucinare e provare sapori nuovi: torna a casa con ricette da rifare e un ricordo da raccontare.", "corso cucina giapponese esperienza regalo"],
    en: ["Japanese cooking evening with a chef", "Three hours learning ramen, gyoza and mochi, with a shared dinner at the end.", "For someone who loves cooking and new flavours: they bring home recipes and a story to tell.", "japanese cooking class gift"] },
  { tipologia: "libri e cultura", ingombro: "piccolo", tipo: "sicura",
    it: ["Graphic novel di Zerocalcare in edizione cartonata", "Una delle storie più amate dell’autore romano, tra ironia, amicizia e malinconia.", "Si legge in una sera, fa ridere e commuovere: un regalo che quasi tutti apprezzano.", "zerocalcare graphic novel cartonato"],
    en: ["Hardback graphic novel collection", "A celebrated graphic novel that mixes humour, friendship and nostalgia.", "A one-evening read that makes you laugh and think: hard to get wrong.", "graphic novel hardback bestseller"] },
  { tipologia: "tecnologia", ingombro: "piccolo", tipo: "originale",
    it: ["Fotocamera istantanea a pellicola", "Stampa le foto in pochi secondi, in formato tessera da appendere o regalare.", "Perfetta per chi vive di serate con gli amici e ama i ricordi da toccare con mano.", "fotocamera istantanea mini pellicola"],
    en: ["Instant film camera", "Prints photos in seconds, in a small format to pin up or give away.", "Great for someone who lives for nights out and loves memories you can hold.", "instant film camera mini"] },
  { tipologia: "cibo e bevande", ingombro: "medio", tipo: "sicura",
    it: ["Box di cioccolato artigianale da tutto il mondo", "Dodici tavolette di piccoli cioccolatieri, dal Madagascar all’Ecuador, con schede di degustazione.", "Golosa ma non banale: si assaggia una tavoletta alla volta, magari in compagnia.", "box degustazione cioccolato artigianale"],
    en: ["Craft chocolate tasting box", "Twelve bars from small makers, from Madagascar to Ecuador, with tasting notes.", "Indulgent but not ordinary: one bar at a time, ideally shared.", "craft chocolate tasting box"] },
  { tipologia: "hobby e tempo libero", ingombro: "piccolo", tipo: "originale",
    it: ["Kit per ricamare un poster della sua città", "Telaio, fili colorati e tela già disegnata con la mappa della città da ricamare.", "Un passatempo rilassante che diventa un quadro da appendere in casa.", "kit ricamo mappa città"],
    en: ["Embroidery kit with a city map", "Hoop, threads and a pre-printed fabric of a city map to stitch.", "A relaxing pastime that ends up framed on the wall.", "embroidery kit city map"] },
  { tipologia: "benessere", ingombro: "piccolo", tipo: "sicura",
    it: ["Ingresso alle terme per due", "Una giornata di piscine calde, sauna e relax in una spa vicino a casa.", "Un regalo che si condivide: una pausa vera dalla routine, senza pensieri.", "ingresso terme coppia regalo"],
    en: ["Spa day for two", "A day of warm pools, sauna and relaxing at a nearby spa.", "A gift to share: a real break from the routine.", "spa day for two gift"] },
  { tipologia: "casa", ingombro: "medio", tipo: "originale",
    it: ["Proiettore di stelle per la camera", "Riempie il soffitto di galassie e nebulose in movimento, con timer e luce regolabile.", "Trasforma le serate sul divano o le notti insonni in qualcosa di magico.", "proiettore stelle galassia camera"],
    en: ["Galaxy star projector", "Fills the ceiling with moving galaxies and nebulae, with timer and dimmer.", "Turns sofa evenings or sleepless nights into something magical.", "galaxy star projector bedroom"] },
  { tipologia: "accessori", ingombro: "piccolo", tipo: "sicura",
    it: ["Zaino impermeabile minimal", "Linee pulite, scomparto imbottito per il portatile e tessuto che resiste alla pioggia.", "Si usa tutti i giorni, per lavoro o per il weekend: un regalo pratico ma con stile.", "zaino impermeabile minimal portatile"],
    en: ["Minimal waterproof backpack", "Clean lines, padded laptop sleeve and rain-resistant fabric.", "Used every day, for work or weekends: practical but stylish.", "minimal waterproof backpack laptop"] },
  { tipologia: "esperienze", ingombro: "piccolo", tipo: "sicura",
    it: ["Biglietti per un concerto nella sua città", "Due posti per un artista che ascolta spesso, da scegliere nel calendario dei prossimi mesi.", "Una serata da ricordare e da vivere insieme: il regalo è anche il tempo passato lì.", "biglietti concerto regalo"],
    en: ["Concert tickets in their city", "Two seats for an artist they listen to, picked from upcoming dates.", "A night to remember and share: the gift is also the time together.", "concert tickets gift"] },
  { tipologia: "libri e cultura", ingombro: "piccolo", tipo: "originale",
    it: ["Abbonamento a un club del libro a sorpresa", "Ogni mese arriva a casa un romanzo scelto da librai indipendenti, con un piccolo regalo.", "Per chi legge ma non sa mai cosa scegliere: una sorpresa che dura mesi.", "abbonamento libro a sorpresa mensile"],
    en: ["Surprise book club subscription", "Every month a novel picked by independent booksellers arrives with a small treat.", "For a reader who never knows what to pick: a surprise that lasts months.", "monthly surprise book subscription"] },
  { tipologia: "cibo e bevande", ingombro: "piccolo", tipo: "originale",
    it: ["Kit per farsi il kombucha in casa", "Barattolo, coltura viva e tè biologici per fermentare la propria bibita frizzante.", "Un esperimento divertente in cucina per chi ama le cose fatte in casa e un po’ insolite.", "kit kombucha fatto in casa"],
    en: ["Home kombucha brewing kit", "Jar, live culture and organic teas to brew their own fizzy drink.", "A fun kitchen experiment for someone who loves homemade, slightly unusual things.", "kombucha brewing kit"] },
  { tipologia: "tecnologia", ingombro: "piccolo", tipo: "sicura",
    it: ["Cuffie wireless con cancellazione del rumore", "Isolano dal rumore del treno o dell’ufficio, con buona autonomia e custodia compatta.", "Utili ogni giorno, per musica, podcast e chiamate: un regalo che si usa davvero.", "cuffie wireless cancellazione rumore"],
    en: ["Noise-cancelling wireless earbuds", "Block out train or office noise, with good battery and a compact case.", "Useful every day for music, podcasts and calls.", "noise cancelling wireless earbuds"] },
  { tipologia: "hobby e tempo libero", ingombro: "medio", tipo: "sicura",
    it: ["Gioco da tavolo cooperativo per serate in compagnia", "Si vince o si perde tutti insieme: partite da 45 minuti, facili da spiegare.", "Ideale per chi organizza serate con gli amici e vuole un gioco che piace a tutti.", "gioco da tavolo cooperativo"],
    en: ["Cooperative board game", "Everyone wins or loses together: 45-minute games, easy to explain.", "Ideal for someone who hosts game nights and wants something everyone enjoys.", "cooperative board game"] },
  { tipologia: "casa", ingombro: "medio", tipo: "sicura",
    it: ["Set di tazze in ceramica fatte a mano", "Quattro tazze smaltate a mano, ognuna leggermente diversa, per caffè e tisane.", "Un oggetto quotidiano che diventa speciale: ogni mattina un piccolo ricordo di te.", "tazze ceramica fatte a mano set"],
    en: ["Handmade ceramic mug set", "Four hand-glazed mugs, each slightly different, for coffee or tea.", "An everyday object made special: a small reminder every morning.", "handmade ceramic mugs set"] },
  { tipologia: "benessere", ingombro: "piccolo", tipo: "originale",
    it: ["Candela profumata con nome inventato da te", "Cera di soia e un profumo a scelta, con etichetta personalizzata con una frase vostra.", "Un regalo da coccole con un tocco personale che fa sorridere ogni volta che la accende.", "candela profumata personalizzata etichetta"],
    en: ["Scented candle with a custom label", "Soy wax and a chosen scent, with a label printed with your own phrase.", "A cosy gift with a personal touch that makes them smile every time.", "personalised scented candle label"] },
  { tipologia: "accessori", ingombro: "piccolo", tipo: "originale",
    it: ["Portachiavi in ottone inciso a mano", "Piccolo e robusto, con iniziali o una data importante incise da un artigiano.", "Un dettaglio che porta sempre con sé: discreto ma pieno di significato.", "portachiavi ottone inciso personalizzato"],
    en: ["Hand-engraved brass keyring", "Small and sturdy, with initials or a special date engraved by a craftsman.", "A detail they always carry: discreet but meaningful.", "engraved brass keyring personalised"] },
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
        ? "Una persona curiosa e socievole, a cui piacciono le esperienze da condividere. (Questo è un testo di prova: il motore vero leggerà davvero le tue risposte.)"
        : "A curious, sociable person who enjoys experiences to share. (This is sample text: the real engine will actually read your answers.)",
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
      perche: modello[lingua][2],
      tipo: modello.tipo,
      tipologia: modello.tipologia,
      ingombro: modello.ingombro,
      prezzo_min: prezzo(0.15 + indice * 0.05),
      prezzo_max: prezzo(0.75 + indice * 0.05),
      query_ricerca: modello[lingua][3],
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

/** Domande finte per il quiz (solo con MOTORE_FINTO=1). */
export const chiamaDomandeFinte: ChiamaModello = async ({ richiesta: r }) => {
  await new Promise((fatto) => setTimeout(fatto, 800));
  const it = r.richiesta.lingua === "it";
  const domande = (
    it
      ? [
          ["si_no", "{nome} andrebbe mai a un concerto di Travis Scott?"],
          ["si_no", "{nome} comprerebbe mai il tofu al supermercato?"],
          ["si_no", "{nome} passerebbe un weekend in una baita senza wifi?"],
          ["si_no", "{nome} guarderebbe tutta una serie in un giorno solo?"],
          ["si_no", "{nome} si iscriverebbe a una gara di cucina in TV?"],
          ["si_no", "{nome} userebbe ancora una macchina fotografica a rullino?"],
          ["si_no", "{nome} farebbe un corso di ceramica il sabato mattina?"],
          ["si_no", "{nome} sceglierebbe una spa invece di una discoteca?"],
          ["aperta", "Qual è l’ultima cosa di cui {nome} ti ha parlato con entusiasmo?"],
          ["aperta", "Com’è una giornata perfetta per {nome}?"],
        ]
      : [
          ["si_no", "Would {nome} ever go to a Travis Scott concert?"],
          ["si_no", "Would {nome} ever buy tofu at the supermarket?"],
          ["si_no", "Would {nome} spend a weekend in a cabin with no wifi?"],
          ["si_no", "Would {nome} binge a whole series in one day?"],
          ["si_no", "Would {nome} sign up for a TV cooking contest?"],
          ["si_no", "Would {nome} still use a film camera?"],
          ["si_no", "Would {nome} take a pottery class on Saturday mornings?"],
          ["si_no", "Would {nome} pick a spa over a night club?"],
          ["aperta", "What’s the last thing {nome} talked about with excitement?"],
          ["aperta", "What does a perfect day look like for {nome}?"],
        ]
  ).map(([tipo, testo]) => ({ tipo, testo }));
  const testo = JSON.stringify({ domande });
  return {
    testo,
    motivoFine: "end_turn",
    modelloUsato: "finto",
    uso: { input: 0, output: 0, cacheScrittura: 0, cacheLettura: 0 },
    tokenRagionamento: null,
    contenuto: [{ type: "text", text: testo }],
  };
};
