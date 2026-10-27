/**
 * Limiti di richieste per IP, contro abusi e costi dell'API.
 *
 * I contatori stanno nella tabella limiti_richieste (con un hash dell'IP, mai l'IP vero).
 * Senza database (solo in sviluppo) i contatori restano in memoria.
 */
import "server-only";
import { limiti } from "./ambiente";
import { db } from "./db";
import { hashIp } from "./ip";

type Contatore = { chiave: string; secondi: number };

// Contatori in memoria, usati solo se manca il database (sviluppo locale)
const memoria = new Map<string, number>();

function inizioFinestra(secondi: number, adesso = Date.now()): Date {
  return new Date(Math.floor(adesso / (secondi * 1000)) * secondi * 1000);
}

/** Incrementa i contatori indicati e restituisce i nuovi valori, nello stesso ordine. */
async function incrementa(contatori: Contatore[]): Promise<number[]> {
  const sql = db();
  if (!sql) {
    return contatori.map(({ chiave, secondi }) => {
      const id = `${chiave}|${inizioFinestra(secondi).toISOString()}`;
      const valore = (memoria.get(id) ?? 0) + 1;
      memoria.set(id, valore);
      return valore;
    });
  }

  const righe = contatori.map(({ chiave, secondi }) => ({
    chiave,
    finestra_inizio: inizioFinestra(secondi),
    conteggio: 1,
  }));
  const risultato = await sql<{ chiave: string; conteggio: number }[]>`
    insert into limiti_richieste ${sql(righe, "chiave", "finestra_inizio", "conteggio")}
    on conflict (chiave, finestra_inizio)
    do update set conteggio = limiti_richieste.conteggio + 1
    returning chiave, conteggio
  `;

  // Ogni tanto (circa 1 volta su 50) cancelliamo i contatori più vecchi di 48 ore
  if (Math.random() < 0.02) {
    await sql`delete from limiti_richieste where finestra_inizio < now() - interval '48 hours'`;
  }

  return contatori.map(({ chiave }) => risultato.find((r) => r.chiave === chiave)?.conteggio ?? 0);
}

/** Controlla i limiti per una nuova richiesta di idee. */
export async function controllaLimitiGenerazione(
  ip: string,
): Promise<"ok" | "limite" | "limiteGlobale"> {
  const { perOra, perGiorno, globaleGiorno } = limiti();
  const codice = hashIp(ip);
  const [ora, giorno, globale] = await incrementa([
    { chiave: `genera:ora:${codice}`, secondi: 3600 },
    { chiave: `genera:giorno:${codice}`, secondi: 86400 },
    { chiave: "genera:globale", secondi: 86400 },
  ]);
  if (ora > perOra || giorno > perGiorno) return "limite";
  if (globale > globaleGiorno) return "limiteGlobale";
  return "ok";
}

/** Limite semplice per azioni leggere (voti, click): true se l'azione è permessa. */
export async function controllaLimiteAzione(
  azione: string,
  ip: string,
  massimo: number,
  secondi = 3600,
): Promise<boolean> {
  const [conteggio] = await incrementa([{ chiave: `${azione}:${hashIp(ip)}`, secondi }]);
  return conteggio <= massimo;
}
