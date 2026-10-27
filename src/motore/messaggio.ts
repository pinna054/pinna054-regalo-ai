/**
 * Costruisce il messaggio con i dati del destinatario che viene inviato al modello,
 * insieme al prompt di sistema (prompts/motore-vN.md).
 *
 * Il messaggio è in italiano come il prompt; i testi liberi scritti dall'utente sono
 * racchiusi tra marcatori, così il modello li tratta come dati e non come istruzioni.
 *
 * NOTA per la fase 2: qui non arriva MAI la difficoltà degli scenari di test,
 * solo ciò che scriverebbe un utente vero.
 */
import type { Occasione } from "@/config/opzioni";
import { trovaPaese } from "@/config/paesi";
import { sogliaMinima } from "./controlli";
import type { RichiestaMotore } from "./richiesta";

// Spiegazione per il modello di alcune occasioni (il valore interno resta quello italiano)
const DESCRIZIONE_OCCASIONE: Partial<Record<Occasione, string>> = {
  natale: "natale (festività di fine anno)",
  scuse: "scuse (regalo per farsi perdonare)",
  consolazione: "consolazione (regalo per consolare)",
  trasloco: "trasloco (casa nuova)",
  ringraziamento: "ringraziamento (regalo per dire grazie)",
  nessuna: "nessuna in particolare",
};

/** Nome di una lingua o di un paese in italiano, es. "en" → "inglese", "DE" → "Germania". */
function nomeInItaliano(codice: string, tipo: "language" | "region"): string {
  try {
    return new Intl.DisplayNames(["it"], { type: tipo }).of(codice) ?? codice;
  } catch {
    return codice;
  }
}

function blocco(titolo: string, etichetta: string, testo: string): string {
  return testo ? `${titolo}:\n<${etichetta}>\n${testo}\n</${etichetta}>` : `${titolo}: (non indicato)`;
}

export function costruisciMessaggio(r: RichiestaMotore): string {
  const { profilo, richiesta } = r;
  const paese = trovaPaese(richiesta.paese);
  const valuta = richiesta.valuta;

  const occasione =
    richiesta.occasione === "altra"
      ? `altra: «${richiesta.occasione_altra}»`
      : (DESCRIZIONE_OCCASIONE[richiesta.occasione] ?? richiesta.occasione);

  const budget =
    richiesta.budget_min !== null
      ? `da ${richiesta.budget_min} a ${richiesta.budget_max} ${valuta}`
      : `un solo valore, ${richiesta.budget_max} ${valuta} (quindi idee tra ${sogliaMinima(richiesta)} e ${richiesta.budget_max} ${valuta})`;

  const tipologie =
    richiesta.tipologie.length > 0 ? richiesta.tipologie.join(", ") : "tutte";

  const ingombro = {
    piccolo: 'piccolo (solo idee con ingombro "piccolo")',
    medio: 'medio (solo idee con ingombro "piccolo" o "medio")',
    qualsiasi: "qualsiasi",
  }[richiesta.ingombro_max];

  const righe = [
    "Dati della richiesta",
    "",
    `Lingua dei testi: ${nomeInItaliano(richiesta.lingua, "language")} (${richiesta.lingua})`,
    `Paese di consegna: ${nomeInItaliano(richiesta.paese, "region")} (${richiesta.paese})`,
    `Valuta: ${valuta}`,
    paese
      ? `Negozi online di riferimento: ${paese.amazon.dominio} e Google Shopping`
      : "",
    "",
    `Relazione: ${profilo.relazione}`,
    `Occasione: ${occasione}`,
    `Budget: ${budget}`,
    `Età del destinatario: ${profilo.eta ? `${profilo.eta} anni` : "(non indicata)"}`,
    "",
    "Filtri:",
    `- tipologie ammesse: ${tipologie}`,
    `- ingombro massimo: ${ingombro}`,
    "",
    blocco(
      "Com’è, cosa gli/le piace, cosa no, che carattere ha (scritto da chi fa il regalo)",
      "descrizione",
      profilo.descrizione,
    ),
    "",
    blocco("Cosa ha già o ha ricevuto di recente", "ha_gia", profilo.ha_gia),
    "",
    blocco("Cosa non sopporta", "non_sopporta", profilo.non_sopporta),
  ];

  if (r.risposte.length > 0) {
    righe.push("", "Risposte di chi fa il regalo alle tue domande precedenti:");
    for (const { domanda, risposta } of r.risposte) {
      righe.push(`- Domanda: ${domanda}`, `  Risposta: <risposta>${risposta}</risposta>`);
    }
  }

  if (r.escludi_titoli.length > 0) {
    righe.push("", "Idee già proposte, da non ripetere:");
    for (const titolo of r.escludi_titoli) righe.push(`- ${titolo}`);
  }

  return righe.filter((riga, i, tutte) => !(riga === "" && tutte[i - 1] === "")).join("\n");
}
