/**
 * DEMO: archivio di domande per il quiz quando il sito gira senza AI (MOTORE_FINTO=1).
 *
 * Ogni domanda sì/no ha dei "temi": se la risposta è Sì, i regali con quei temi salgono
 * in classifica; se è No, scendono. Con l'AI vera le domande le scrive il modello
 * (prompts/domande-v1.md) e questo file non viene usato.
 */
import type { Tema } from "./temi";

export type DomandaDemo = { temi: Tema[]; it: string; en: string };

/** Domande sì/no, raggruppate per area (a ogni quiz ne esce al massimo una per area). */
export const DOMANDE_SI_NO: Record<string, DomandaDemo[]> = {
  musica: [
    { temi: ["musica", "feste"], it: "{nome} andrebbe mai a un concerto di Travis Scott?", en: "Would {nome} ever go to a Travis Scott concert?" },
    { temi: ["musica"], it: "{nome} sa a memoria almeno un album dei Måneskin?", en: "Does {nome} know a whole Måneskin album by heart?" },
    { temi: ["musica", "feste"], it: "{nome} canterebbe al karaoke davanti a degli sconosciuti?", en: "Would {nome} sing karaoke in front of strangers?" },
    { temi: ["musica", "vintage", "arte"], it: "{nome} comprerebbe un vinile solo per la copertina?", en: "Would {nome} buy a vinyl just for the cover art?" },
    { temi: ["musica", "cultura"], it: "{nome} passerebbe una domenica a un festival jazz?", en: "Would {nome} spend a Sunday at a jazz festival?" },
  ],
  cibo: [
    { temi: ["benessere", "cibo"], it: "{nome} comprerebbe mai il tofu?", en: "Would {nome} ever buy tofu?" },
    { temi: ["avventura", "cibo"], it: "{nome} metterebbe l’ananas sulla pizza senza vergogna?", en: "Would {nome} put pineapple on pizza, no shame?" },
    { temi: ["cibo", "viaggi"], it: "{nome} farebbe un’ora di fila per il ramen più famoso della città?", en: "Would {nome} queue an hour for the city’s most famous ramen?" },
    { temi: ["cucina"], it: "{nome} ha mai fatto il pane in casa con il lievito madre?", en: "Has {nome} ever baked sourdough bread at home?" },
    { temi: ["avventura", "cibo"], it: "{nome} assaggerebbe un piatto con gli insetti?", en: "Would {nome} try a dish made with insects?" },
    { temi: ["cucina", "feste"], it: "{nome} organizzerebbe una cena a tema messicano per gli amici?", en: "Would {nome} host a Mexican-themed dinner for friends?" },
  ],
  caffe: [
    { temi: ["caffe"], it: "{nome} beve l’espresso rigorosamente senza zucchero?", en: "Does {nome} drink espresso strictly without sugar?" },
    { temi: ["caffe", "benessere"], it: "{nome} ordina il cappuccino con il latte d’avena?", en: "Does {nome} order cappuccino with oat milk?" },
    { temi: ["te", "benessere"], it: "{nome} beve almeno tre tisane al giorno?", en: "Does {nome} drink at least three herbal teas a day?" },
  ],
  viaggi: [
    { temi: ["natura", "relax"], it: "{nome} passerebbe un weekend in una baita senza wifi?", en: "Would {nome} spend a weekend in a cabin with no wifi?" },
    { temi: ["viaggi", "avventura"], it: "{nome} partirebbe domani per Tokyo con solo uno zaino?", en: "Would {nome} leave for Tokyo tomorrow with just a backpack?" },
    { temi: ["viaggi", "relax"], it: "{nome} sceglierebbe un’isola greca invece di una capitale europea?", en: "Would {nome} pick a Greek island over a European capital?" },
    { temi: ["natura", "avventura"], it: "{nome} dormirebbe in tenda sotto le stelle?", en: "Would {nome} sleep in a tent under the stars?" },
    { temi: ["viaggi", "ordine"], it: "{nome} pianifica i viaggi con un foglio Excel?", en: "Does {nome} plan trips with a spreadsheet?" },
    { temi: ["viaggi", "vintage"], it: "{nome} prenderebbe un treno notturno per Vienna?", en: "Would {nome} take a night train to Vienna?" },
  ],
  sport: [
    { temi: ["sport"], it: "{nome} si alzerebbe alle 6 per andare a correre?", en: "Would {nome} get up at 6 to go running?" },
    { temi: ["sport", "feste"], it: "{nome} proverebbe il padel con gli amici?", en: "Would {nome} try padel with friends?" },
    { temi: ["sport", "feste"], it: "{nome} guarderebbe la finale di Champions in piedi sul divano?", en: "Would {nome} watch the Champions League final standing on the sofa?" },
    { temi: ["sport", "avventura", "viaggi"], it: "{nome} farebbe un corso di surf in Portogallo?", en: "Would {nome} take a surf course in Portugal?" },
    { temi: ["natura", "sport"], it: "{nome} ha più scarpe da trekking che scarpe eleganti?", en: "Does {nome} own more hiking boots than smart shoes?" },
    { temi: ["benessere", "sport"], it: "{nome} farebbe yoga al tramonto in spiaggia?", en: "Would {nome} do sunset yoga on the beach?" },
  ],
  casa: [
    { temi: ["piante", "casa"], it: "{nome} riempirebbe la casa di piante?", en: "Would {nome} fill the house with plants?" },
    { temi: ["ordine", "casa"], it: "{nome} riordina l’armadio per colore?", en: "Does {nome} sort their wardrobe by colour?" },
    { temi: ["relax", "casa"], it: "{nome} accende una candela profumata appena torna a casa?", en: "Does {nome} light a scented candle as soon as they get home?" },
    { temi: ["casa", "fai-da-te"], it: "{nome} passerebbe volentieri il sabato all’IKEA?", en: "Would {nome} happily spend Saturday at IKEA?" },
    { temi: ["lettura", "casa"], it: "{nome} ha un angolo della casa dedicato solo ai libri?", en: "Does {nome} have a corner of the house just for books?" },
  ],
  tecnologia: [
    { temi: ["tech"], it: "{nome} compra l’ultimo smartphone appena esce?", en: "Does {nome} buy the latest smartphone as soon as it’s out?" },
    { temi: ["tech", "casa"], it: "{nome} dà ordini all’assistente vocale di casa?", en: "Does {nome} give orders to a smart speaker at home?" },
    { temi: ["gaming", "tech"], it: "{nome} giocherebbe tutta la notte alla nuova uscita Nintendo?", en: "Would {nome} play the new Nintendo release all night?" },
    { temi: ["tech", "fai-da-te"], it: "{nome} monterebbe da sé un computer, pezzo per pezzo?", en: "Would {nome} build a computer from scratch?" },
    { temi: ["tech", "sport"], it: "{nome} ha più di tre app per allenarsi?", en: "Does {nome} have more than three workout apps?" },
  ],
  cultura: [
    { temi: ["lettura"], it: "{nome} leggerebbe un romanzo di 800 pagine in vacanza?", en: "Would {nome} read an 800-page novel on holiday?" },
    { temi: ["arte", "cultura"], it: "{nome} farebbe la fila per una mostra di Van Gogh?", en: "Would {nome} queue for a Van Gogh exhibition?" },
    { temi: ["film", "cultura"], it: "{nome} guarderebbe un film coreano con i sottotitoli?", en: "Would {nome} watch a Korean film with subtitles?" },
    { temi: ["film"], it: "{nome} ha visto tutte le stagioni di Stranger Things?", en: "Has {nome} watched every season of Stranger Things?" },
    { temi: ["giochi", "feste", "cultura"], it: "{nome} vincerebbe un quiz di cultura generale al pub?", en: "Would {nome} win a pub quiz?" },
  ],
  creativita: [
    { temi: ["arte", "fai-da-te"], it: "{nome} farebbe un corso di ceramica il sabato mattina?", en: "Would {nome} take a pottery class on Saturday mornings?" },
    { temi: ["foto", "vintage"], it: "{nome} userebbe una macchina fotografica a rullino?", en: "Would {nome} use a film camera?" },
    { temi: ["scrittura", "lettura"], it: "{nome} scrive ancora un diario a mano?", en: "Does {nome} still keep a handwritten diary?" },
    { temi: ["fai-da-te", "casa", "arte"], it: "{nome} ridipingerebbe da sé una parete di casa?", en: "Would {nome} repaint a wall at home themselves?" },
    { temi: ["fai-da-te", "relax"], it: "{nome} lavorerebbe a maglia guardando una serie?", en: "Would {nome} knit while watching a series?" },
  ],
  benessere: [
    { temi: ["benessere", "relax"], it: "{nome} sceglierebbe una spa invece di una discoteca?", en: "Would {nome} pick a spa over a nightclub?" },
    { temi: ["relax"], it: "{nome} va a dormire prima delle 23 anche il sabato?", en: "Does {nome} go to bed before 11pm even on Saturdays?" },
    { temi: ["avventura", "benessere"], it: "{nome} proverebbe un bagno nel ghiaccio?", en: "Would {nome} try an ice bath?" },
  ],
  carattere: [
    { temi: ["feste", "cucina"], it: "È sempre {nome} a organizzare le cene di gruppo?", en: "Is {nome} always the one organising group dinners?" },
    { temi: ["feste"], it: "{nome} si presenterebbe a una festa in costume a tema?", en: "Would {nome} show up to a party in a themed costume?" },
    { temi: ["ricordi", "musica"], it: "{nome} conserva i biglietti dei concerti in una scatola?", en: "Does {nome} keep old concert tickets in a box?" },
    { temi: ["animali"], it: "{nome} parla al proprio animale come a una persona?", en: "Does {nome} talk to their pet like a person?" },
    { temi: ["vintage", "stile"], it: "{nome} perderebbe la testa in un mercatino dell’usato?", en: "Would {nome} lose their mind at a flea market?" },
    { temi: ["stile"], it: "{nome} nota subito se un accessorio è di qualità?", en: "Does {nome} instantly notice a quality accessory?" },
  ],
};

/** Domande aperte: chi fa il regalo scrive qualche riga. */
export const DOMANDE_APERTE: DomandaDemo[] = [
  { temi: [], it: "Qual è l’ultima cosa di cui {nome} ti ha parlato con entusiasmo?", en: "What’s the last thing {nome} talked about with excitement?" },
  { temi: [], it: "Com’è una giornata perfetta per {nome}?", en: "What does a perfect day look like for {nome}?" },
  { temi: [], it: "C’è un oggetto che {nome} usa ogni giorno ed è ormai da cambiare?", en: "Is there something {nome} uses every day that really needs replacing?" },
  { temi: [], it: "Qual è il posto dove {nome} sogna di andare?", en: "Where does {nome} dream of going?" },
  { temi: [], it: "Cosa fa {nome} quando ha un pomeriggio tutto per sé?", en: "What does {nome} do with an afternoon all to themselves?" },
  { temi: [], it: "C’è una passione di {nome} che conoscono in pochi?", en: "Is there a passion of {nome}’s that few people know about?" },
  { temi: [], it: "Che serie o che libro sta divorando {nome} in questo periodo?", en: "What series or book is {nome} devouring right now?" },
  { temi: [], it: "C’è qualcosa che {nome} vorrebbe imparare da tempo?", en: "Is there something {nome} has wanted to learn for ages?" },
  { temi: [], it: "Quale piccola abitudine rende felice {nome} ogni giorno?", en: "What small daily habit makes {nome} happy?" },
  { temi: [], it: "Cosa ha guardato {nome} in una vetrina dicendo «che bello»?", en: "What did {nome} last look at in a shop window and say “how lovely”?" },
];
