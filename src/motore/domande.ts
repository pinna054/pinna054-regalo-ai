/**
 * Il quiz: domande sul destinatario a cui rispondere scorrendo (sì / no) o scrivendo.
 *
 * Le domande usano il segnaposto {nome}: il browser lo sostituisce con il soprannome che
 * l'utente ha scritto (che non arriva mai al server). Le risposte tornano poi al motore
 * delle idee come "risposte" (vedi messaggio.ts).
 */
import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { LivelloEffort } from "@/config/modelli";
import { USO_ZERO, sommaUso, stimaCosto, type UsoToken } from "./costi";
import { costruisciMessaggio } from "./messaggio";
import { chiamaAnthropic, ErroreMotore, type ChiamaModello, type MessaggioModello } from "./modello";
import { caricaPromptFile } from "./prompt";
import type { RichiestaMotore } from "./richiesta";

export const DOMANDE_SI_NO = 8;
export const DOMANDE_APERTE = 2;

export const SchemaDomande = z.object({
  domande: z
    .array(
      z.object({
        tipo: z.enum(["si_no", "aperta"]),
        testo: z.string().min(5).max(200),
      }),
    )
    .min(1)
    .max(20),
});
export type Domanda = z.infer<typeof SchemaDomande>["domande"][number];

export const FORMATO_DOMANDE = betaZodOutputFormat(SchemaDomande);

/** Mette in ordine le domande: prima le sì/no, poi le aperte, nei numeri previsti. */
function sistema(domande: Domanda[]): Domanda[] {
  const pulite = domande.map((d) => ({ ...d, testo: d.testo.trim() }));
  return [
    ...pulite.filter((d) => d.tipo === "si_no").slice(0, DOMANDE_SI_NO),
    ...pulite.filter((d) => d.tipo === "aperta").slice(0, DOMANDE_APERTE),
  ];
}

export type RisultatoDomande = {
  domande: Domanda[] | null;
  codiceErrore: "json" | "rifiuto" | ErroreMotore["codice"] | null;
  uso: UsoToken;
  costoStimatoUsd: number | null;
};

/** Chiede le domande al modello (1 nuovo tentativo se il JSON non è valido). */
export async function generaDomande(
  richiesta: RichiestaMotore,
  opzioni: { modello: string; effort: LivelloEffort | null; chiamaModello?: ChiamaModello; promptVersione?: string },
): Promise<RisultatoDomande> {
  const chiama = opzioni.chiamaModello ?? chiamaAnthropic;
  const sistemaPrompt = await caricaPromptFile(opzioni.promptVersione ?? "domande-v1");
  const messaggi: MessaggioModello[] = [{ role: "user", content: costruisciMessaggio(richiesta) }];
  let uso = USO_ZERO;

  for (let tentativo = 1; tentativo <= 2; tentativo++) {
    let chiamata;
    try {
      chiamata = await chiama({
        modello: opzioni.modello,
        effort: opzioni.effort,
        sistema: sistemaPrompt,
        messaggi,
        richiesta,
        numero: tentativo,
        formato: FORMATO_DOMANDE,
      });
    } catch (errore) {
      const codice = errore instanceof ErroreMotore ? errore.codice : "motore";
      return { domande: null, codiceErrore: codice, uso, costoStimatoUsd: stimaCosto(opzioni.modello, uso) };
    }
    uso = sommaUso(uso, chiamata.uso);
    if (chiamata.motivoFine === "refusal") {
      return { domande: null, codiceErrore: "rifiuto", uso, costoStimatoUsd: stimaCosto(opzioni.modello, uso) };
    }

    let errore = "risposta vuota";
    try {
      const esito = SchemaDomande.safeParse(JSON.parse(chiamata.testo ?? ""));
      if (esito.success) {
        const domande = sistema(esito.data.domande);
        if (domande.length >= 4) {
          return { domande, codiceErrore: null, uso, costoStimatoUsd: stimaCosto(opzioni.modello, uso) };
        }
        errore = "troppe poche domande";
      } else {
        errore = esito.error.issues[0]?.message ?? "schema non rispettato";
      }
    } catch {
      errore = "il testo non è un JSON valido";
    }
    messaggi.push(
      { role: "assistant", content: chiamata.contenuto },
      { role: "user", content: `La risposta precedente non è valida (${errore}). Rispondi di nuovo solo con il JSON completo.` },
    );
  }
  return { domande: null, codiceErrore: "json", uso, costoStimatoUsd: stimaCosto(opzioni.modello, uso) };
}
