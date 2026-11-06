/**
 * MOTORE FINTO (demo): nessuna chiamata all'AI, usato con MOTORE_FINTO=1.
 * Domande e regali vengono dall'archivio in src/motore/demo/. Non attivarlo mai in produzione.
 */
import { domandeDemo, ideeDemo } from "./demo/motore";
import type { ChiamaModello, EsitoChiamata } from "./modello";

function esito(dati: unknown): EsitoChiamata {
  const testo = JSON.stringify(dati);
  return {
    testo,
    motivoFine: "end_turn",
    modelloUsato: "finto",
    uso: { input: 0, output: 0, cacheScrittura: 0, cacheLettura: 0 },
    tokenRagionamento: null,
    contenuto: [{ type: "text", text: testo }],
  };
}

/** Idee demo, scelte in base a risposte, preferenze, budget e filtri. */
export const chiamaMotoreFinto: ChiamaModello = async ({ richiesta }) => {
  await new Promise((fatto) => setTimeout(fatto, 1100));
  return esito(ideeDemo(richiesta));
};

/** Domande demo per il quiz. */
export const chiamaDomandeFinte: ChiamaModello = async ({ richiesta }) => {
  await new Promise((fatto) => setTimeout(fatto, 700));
  return esito({ domande: domandeDemo(richiesta.richiesta.lingua) });
};
