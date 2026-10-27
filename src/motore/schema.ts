/**
 * Forma della risposta del motore (il JSON descritto nel prompt).
 *
 * ATTENZIONE: se in una nuova versione del prompt cambi i campi del JSON,
 * aggiorna anche questo schema, altrimenti le risposte verranno scartate come non valide.
 */
import { z } from "zod";
import { INGOMBRI, TIPI_IDEA, TIPOLOGIE } from "@/config/opzioni";

export const SchemaIdea = z.object({
  titolo: z.string().min(1).max(200),
  descrizione: z.string().min(1).max(1200),
  perche: z.string().min(1).max(1200),
  tipo: z.enum(TIPI_IDEA),
  tipologia: z.enum(TIPOLOGIE),
  ingombro: z.enum(INGOMBRI),
  prezzo_min: z.number().min(0),
  prezzo_max: z.number().min(0),
  query_ricerca: z.string().min(1).max(200),
  attenzione: z.string().max(1200),
});
export type Idea = z.infer<typeof SchemaIdea>;

export const SchemaRispostaMotore = z.object({
  lettura_profilo: z.string().max(2000),
  avvisi: z.array(z.string().max(600)).max(10),
  domande_utili: z.array(z.string().max(400)).max(10),
  idee: z.array(SchemaIdea).min(1).max(10),
});
export type RispostaMotore = z.infer<typeof SchemaRispostaMotore>;

/**
 * Legge il testo restituito dal modello: deve essere JSON e rispettare lo schema.
 * Restituisce i dati puliti (spazi tolti, al massimo 2 domande) oppure il motivo dell'errore.
 */
export function leggiRispostaMotore(
  testo: string | null,
): { ok: true; dati: RispostaMotore } | { ok: false; errore: string } {
  if (!testo || !testo.trim()) return { ok: false, errore: "risposta vuota" };

  let json: unknown;
  try {
    json = JSON.parse(testo);
  } catch {
    return { ok: false, errore: "il testo non è un JSON valido" };
  }

  const esito = SchemaRispostaMotore.safeParse(json);
  if (!esito.success) {
    const dettagli = esito.error.issues
      .slice(0, 5)
      .map((p) => `${p.path.join(".") || "(radice)"}: ${p.message}`)
      .join("; ");
    return { ok: false, errore: `il JSON non rispetta lo schema (${dettagli})` };
  }

  const d = esito.data;
  const pulito = (s: string) => s.trim();
  return {
    ok: true,
    dati: {
      lettura_profilo: pulito(d.lettura_profilo),
      avvisi: d.avvisi.map(pulito).filter(Boolean),
      // La regola 6 del prompt dice "al massimo 2 domande": se sono di più teniamo le prime 2
      domande_utili: d.domande_utili.map(pulito).filter(Boolean).slice(0, 2),
      idee: d.idee.map((idea) => ({
        ...idea,
        titolo: pulito(idea.titolo),
        descrizione: pulito(idea.descrizione),
        perche: pulito(idea.perche),
        query_ricerca: pulito(idea.query_ricerca),
        attenzione: pulito(idea.attenzione),
      })),
    },
  };
}
