/**
 * Registrazione anonima di generazioni, voti e click nel database.
 * Serve a migliorare il motore: nessun dato che identifichi le persone.
 */
import "server-only";
import type { RisultatoGenerazione } from "@/motore/genera";
import type { RichiestaMotore } from "@/motore/richiesta";
import type { Idea } from "@/motore/schema";
import { db } from "./db";

export type IdeaDaSalvare = Idea & { id: string; posizione: number };

export type DatiGenerazione = {
  id: string;
  origine: "sito" | "valutazione";
  tipoRichiesta: "nuova" | "rigenera" | "risposte";
  genitoreId: string | null;
  richiesta: RichiestaMotore;
  risultato: RisultatoGenerazione;
  idee: IdeaDaSalvare[];
};

/** Salva una generazione e le sue idee. Restituisce false se il database non è configurato. */
export async function salvaGenerazione(dati: DatiGenerazione): Promise<boolean> {
  const sql = db();
  if (!sql) return false;

  const { risultato, richiesta } = dati;
  const output = risultato.risposta
    ? {
        lettura_profilo: risultato.risposta.lettura_profilo,
        avvisi: risultato.risposta.avvisi,
        domande_utili: risultato.risposta.domande_utili,
        idee: dati.idee,
      }
    : null;
  const errore = risultato.codiceErrore
    ? `${risultato.codiceErrore}: ${risultato.dettaglioErrore ?? ""}`.slice(0, 2000)
    : null;

  await sql.begin(async (tx) => {
    await tx`
      insert into generazioni (
        id, origine, tipo_richiesta, genitore_id, lingua, paese, valuta,
        input, output, tentativi, esito, errore, prompt_versione, modello, parametri,
        token_input, token_output, token_cache_scrittura, token_cache_lettura,
        costo_stimato_usd, durata_ms, numero_chiamate
      ) values (
        ${dati.id}, ${dati.origine}, ${dati.tipoRichiesta},
        (select id from generazioni where id = ${dati.genitoreId}),
        ${richiesta.richiesta.lingua}, ${richiesta.richiesta.paese}, ${richiesta.richiesta.valuta},
        ${tx.json(richiesta)}, ${output ? tx.json(output) : null}, ${tx.json(risultato.tentativi)},
        ${risultato.esito}, ${errore}, ${risultato.promptVersione}, ${risultato.modello},
        ${tx.json(risultato.parametri)},
        ${risultato.uso.input}, ${risultato.uso.output},
        ${risultato.uso.cacheScrittura}, ${risultato.uso.cacheLettura},
        ${risultato.costoStimatoUsd}, ${risultato.durataMs}, ${risultato.tentativi.length}
      )
    `;

    if (dati.idee.length > 0) {
      const righe = dati.idee.map((idea) => ({
        id: idea.id,
        generazione_id: dati.id,
        posizione: idea.posizione,
        titolo: idea.titolo,
        tipo: idea.tipo,
        tipologia: idea.tipologia,
        ingombro: idea.ingombro,
        prezzo_min: idea.prezzo_min,
        prezzo_max: idea.prezzo_max,
        query_ricerca: idea.query_ricerca,
        dati: tx.json(idea),
      }));
      await tx`insert into idee ${tx(righe)}`;
    }
  });
  return true;
}

/** Salva 👍 (1), 👎 (-1) o toglie il voto (null). Restituisce true se l'idea esiste. */
export async function salvaVoto(ideaId: string, voto: 1 | -1 | null): Promise<boolean> {
  const sql = db();
  if (!sql) return false;
  const risultato = await sql`
    update idee set voto = ${voto}, votata_il = now() where id = ${ideaId}
  `;
  return risultato.count > 0;
}

/** Conta un click su un link di ricerca. */
export async function registraClick(ideaId: string, negozio: "amazon" | "google"): Promise<boolean> {
  const sql = db();
  if (!sql) return false;
  const risultato =
    negozio === "amazon"
      ? await sql`update idee set click_amazon = click_amazon + 1 where id = ${ideaId}`
      : await sql`update idee set click_google = click_google + 1 where id = ${ideaId}`;
  return risultato.count > 0;
}
