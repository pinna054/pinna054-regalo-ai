/**
 * Il cuore del motore: chiede le idee al modello, le valida e le controlla.
 *
 * Passi:
 * 1. prompt di sistema (prompts/<versione>.md) + messaggio con i dati del destinatario;
 * 2. la risposta deve essere un JSON valido secondo lo schema: se non lo è, 1 nuovo tentativo;
 * 3. le idee devono rispettare budget e filtri: se qualcuna non li rispetta, 1 nuovo tentativo
 *    spiegando al modello cosa correggere; se gli errori restano, si tengono solo le idee valide
 *    (completate, se serve, con le idee valide del tentativo precedente).
 * Al massimo 3 chiamate al modello per ogni generazione.
 */
import "server-only";
import type { LivelloEffort } from "@/config/modelli";
import {
  completaConIdeePrecedenti,
  controllaIdee,
  controlloSuperato,
  IDEE_RICHIESTE,
  messaggioCorrezione,
  type ProblemaIdea,
} from "./controlli";
import { USO_ZERO, sommaUso, stimaCosto, type UsoToken } from "./costi";
import { costruisciMessaggio } from "./messaggio";
import { ErroreMotore, type ChiamaModello, type MessaggioModello } from "./modello";
import { caricaPrompt } from "./prompt";
import type { RichiestaMotore } from "./richiesta";
import { leggiRispostaMotore, type Idea, type RispostaMotore } from "./schema";

/** Nome registrato come "modello" quando si usa il motore finto. */
export const MODELLO_FINTO = "finto";

/** Dettaglio di una singola chiamata al modello (salvato nel database per analisi). */
export type Tentativo = {
  numero: number;
  motivo: "prima" | "json_non_valido" | "vincoli_non_rispettati";
  modello: string;
  motivo_fine: string | null;
  uso: UsoToken;
  token_ragionamento: number | null;
  durata_ms: number;
  /** Errore di formato (JSON/schema), se la risposta è stata scartata */
  errore_json?: string;
  /** Testo grezzo, salvato solo se la risposta è stata scartata */
  testo_scartato?: string;
  /** Idee che non rispettavano budget o filtri */
  problemi?: ProblemaIdea[];
  problemi_generali?: string[];
};

export type CodiceErroreMotore = "json" | "rifiuto" | "configurazione" | "sovraccarico" | "rete" | "motore";

export type RisultatoGenerazione = {
  esito: "ok" | "parziale" | "errore";
  codiceErrore: CodiceErroreMotore | null;
  dettaglioErrore: string | null;
  /** La risposta da mostrare (con al massimo 4 idee valide), se c'è */
  risposta: RispostaMotore | null;
  tentativi: Tentativo[];
  uso: UsoToken;
  costoStimatoUsd: number | null;
  durataMs: number;
  promptVersione: string;
  modello: string;
  parametri: { effort: LivelloEffort | null };
};

export type OpzioniGenerazione = {
  promptVersione: string;
  modello: string;
  effort: LivelloEffort | null;
  chiamaModello: ChiamaModello;
};

export async function generaIdee(
  richiesta: RichiestaMotore,
  opzioni: OpzioniGenerazione,
): Promise<RisultatoGenerazione> {
  const inizio = Date.now();
  const tentativi: Tentativo[] = [];

  const risultato = (
    esito: RisultatoGenerazione["esito"],
    risposta: RispostaMotore | null,
    codiceErrore: CodiceErroreMotore | null = null,
    dettaglioErrore: string | null = null,
  ): RisultatoGenerazione => {
    const uso = tentativi.reduce((totale, t) => sommaUso(totale, t.uso), USO_ZERO);
    return {
      esito,
      codiceErrore,
      dettaglioErrore,
      risposta,
      tentativi,
      uso,
      costoStimatoUsd: opzioni.modello === MODELLO_FINTO ? 0 : stimaCosto(opzioni.modello, uso),
      durataMs: Date.now() - inizio,
      promptVersione: opzioni.promptVersione,
      modello: opzioni.modello,
      parametri: { effort: opzioni.effort },
    };
  };

  let sistema: string;
  try {
    sistema = await caricaPrompt(opzioni.promptVersione);
  } catch (errore) {
    return risultato("errore", null, "configurazione", String(errore));
  }

  const messaggi: MessaggioModello[] = [{ role: "user", content: costruisciMessaggio(richiesta) }];
  let motivo: Tentativo["motivo"] = "prima";
  let riprovaJsonFatta = false;
  let riprovaVincoliFatta = false;
  // Idee valide del tentativo precedente, per completare se il secondo tentativo ne ha meno di 4
  let ideeValidePrecedenti: Idea[] = [];
  // Ultima risposta in formato valido, da usare se l'ultimo tentativo non è leggibile
  let ultimaRispostaValida: RispostaMotore | null = null;

  for (let numero = 1; numero <= 3; numero++) {
    const inizioChiamata = Date.now();
    let chiamata;
    try {
      chiamata = await opzioni.chiamaModello({
        modello: opzioni.modello,
        effort: opzioni.effort,
        sistema,
        messaggi,
        richiesta,
        numero,
      });
    } catch (errore) {
      const codice = errore instanceof ErroreMotore ? errore.codice : "motore";
      // Se avevamo già idee valide da un tentativo precedente, meglio mostrare quelle
      if (ultimaRispostaValida && ideeValidePrecedenti.length > 0) {
        return risultato("parziale", { ...ultimaRispostaValida, idee: ideeValidePrecedenti.slice(0, IDEE_RICHIESTE) });
      }
      return risultato("errore", null, codice, String(errore));
    }

    const tentativo: Tentativo = {
      numero,
      motivo,
      modello: chiamata.modelloUsato,
      motivo_fine: chiamata.motivoFine,
      uso: chiamata.uso,
      token_ragionamento: chiamata.tokenRagionamento,
      durata_ms: Date.now() - inizioChiamata,
    };
    tentativi.push(tentativo);

    // Il modello (e l'eventuale modello di riserva) ha rifiutato la richiesta
    if (chiamata.motivoFine === "refusal") {
      return risultato("errore", null, "rifiuto", "Il modello ha rifiutato la richiesta");
    }

    // 1) Il JSON è valido?
    const letto = leggiRispostaMotore(chiamata.testo);
    if (!letto.ok) {
      tentativo.errore_json =
        chiamata.motivoFine === "max_tokens" ? `${letto.errore} (risposta troncata)` : letto.errore;
      tentativo.testo_scartato = chiamata.testo?.slice(0, 20_000) ?? "";
      if (!riprovaJsonFatta) {
        riprovaJsonFatta = true;
        motivo = "json_non_valido";
        messaggi.push(
          { role: "assistant", content: chiamata.contenuto },
          {
            role: "user",
            content: `La risposta precedente non è valida: ${letto.errore}. Rispondi di nuovo solo con il JSON completo, nel formato richiesto.`,
          },
        );
        continue;
      }
      if (ultimaRispostaValida && ideeValidePrecedenti.length > 0) {
        return risultato("parziale", { ...ultimaRispostaValida, idee: ideeValidePrecedenti.slice(0, IDEE_RICHIESTE) });
      }
      return risultato("errore", null, "json", letto.errore);
    }

    // 2) Le idee rispettano budget e filtri?
    const risposta = letto.dati;
    const controllo = controllaIdee(risposta.idee, richiesta);
    if (controlloSuperato(controllo)) {
      return risultato("ok", { ...risposta, idee: controllo.valide.slice(0, IDEE_RICHIESTE) });
    }

    tentativo.problemi = controllo.problemi;
    tentativo.problemi_generali = controllo.problemiGenerali;

    // Più di 4 idee ma almeno 4 valide: basta prendere le prime 4 valide
    if (controllo.problemiGenerali.length === 0 && controllo.valide.length >= IDEE_RICHIESTE) {
      return risultato("ok", { ...risposta, idee: controllo.valide.slice(0, IDEE_RICHIESTE) });
    }

    if (!riprovaVincoliFatta) {
      riprovaVincoliFatta = true;
      motivo = "vincoli_non_rispettati";
      ideeValidePrecedenti = controllo.valide;
      ultimaRispostaValida = risposta;
      messaggi.push(
        { role: "assistant", content: chiamata.contenuto },
        { role: "user", content: messaggioCorrezione(controllo) },
      );
      continue;
    }

    // Gli errori restano anche dopo il secondo tentativo: mostriamo solo le idee valide
    const idee = completaConIdeePrecedenti(controllo.valide, ideeValidePrecedenti);
    return risultato(idee.length >= IDEE_RICHIESTE ? "ok" : "parziale", { ...risposta, idee });
  }

  // Non si arriva mai qui (al massimo 3 chiamate), ma per sicurezza:
  return risultato("errore", null, "motore", "Numero massimo di tentativi superato");
}
