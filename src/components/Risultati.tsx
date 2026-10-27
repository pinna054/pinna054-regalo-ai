"use client";

/**
 * Pagina dei risultati: lettura del profilo, avvisi, domande utili, 4 schede idea,
 * "Rigenera" e "Rispondi e rigenera". I dati arrivano dalla memoria della scheda (sessionStorage).
 */
import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { CHIAVE_RELAZIONE } from "@/config/opzioni";
import { SITO } from "@/config/sito";
import { Link } from "@/i18n/navigation";
import { formattaFascia, formattaPrezzo, nomePaese } from "@/lib/formato";
import {
  chiediIdee,
  interpreta,
  inviaVoto,
  leggiSessioneGrezza,
  nessunaIscrizione,
  salvaSessione,
  svuotaTutto,
  type Sessione,
} from "@/lib/sessione";
import type { CodiceErroreApi } from "@/motore/tipi-api";
import { Caricamento } from "./Caricamento";
import { IllustrazioneRegalo } from "./Illustrazioni";
import { SchedaIdea } from "./SchedaIdea";

// Valore usato mentre la pagina viene preparata sul server (la memoria del browser non c'è ancora)
const SUL_SERVER = "__server__";
// Massimo di titoli già visti da passare al motore
const MASSIMO_ESCLUSI = 60;

export function Risultati() {
  const t = useTranslations("idee");
  const tOpzioni = useTranslations("opzioni");
  const tErrori = useTranslations("errori");
  const lingua = useLocale();

  const grezza = useSyncExternalStore(nessunaIscrizione, leggiSessioneGrezza, () => SUL_SERVER);
  const [modificata, setModificata] = useState<Sessione | null>(null);
  const [inAttesa, setInAttesa] = useState(false);
  const [errore, setErrore] = useState<CodiceErroreApi | null>(null);
  const [risposte, setRisposte] = useState<Record<string, string>>({});

  if (grezza === SUL_SERVER) return <Scheletro />;
  const sessione = modificata ?? interpreta<Sessione>(grezza);
  if (!sessione || sessione.lotti.length === 0) return <Vuoto />;

  const [ultimo, ...precedenti] = sessione.lotti;
  const risultato = ultimo.risultato;
  const valuta = risultato.valuta;

  function aggiorna(nuova: Sessione) {
    setModificata(nuova);
    salvaSessione(nuova);
  }

  async function nuoveIdee(tipo: "rigenera" | "risposte", s: Sessione) {
    const nuoveRisposte =
      tipo === "risposte"
        ? [
            ...s.risposte,
            ...risultato.domande_utili
              .map((domanda) => ({ domanda, risposta: (risposte[domanda] ?? "").trim() }))
              .filter((r) => r.risposta),
          ].slice(-4)
        : s.risposte;
    // "Rigenera": il motore riceve tutti i titoli già visti e propone idee diverse
    const escludi =
      tipo === "rigenera"
        ? s.lotti.flatMap((l) => l.risultato.idee.map((i) => i.titolo)).slice(0, MASSIMO_ESCLUSI)
        : [];

    setErrore(null);
    setInAttesa(true);
    const risposta = await chiediIdee({
      lingua,
      modulo: s.modulo,
      tipo,
      risposte: nuoveRisposte,
      escludi_titoli: escludi,
      genitore_id: risultato.generazione_id,
    });
    setInAttesa(false);
    if (!risposta.ok) {
      setErrore(risposta.errore);
      return;
    }
    aggiorna({
      ...s,
      lingua,
      risposte: nuoveRisposte,
      lotti: [{ risultato: risposta, tipo, creato: Date.now() }, ...s.lotti],
    });
    setRisposte({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function vota(s: Sessione, ideaId: string, voto: 1 | -1) {
    const nuovo = s.voti[ideaId] === voto ? 0 : voto;
    const voti = { ...s.voti };
    if (nuovo === 0) delete voti[ideaId];
    else voti[ideaId] = nuovo;
    aggiorna({ ...s, voti });
    inviaVoto(ideaId, nuovo);
  }

  const m = sessione.modulo;
  const riepilogo = [
    tOpzioni(`relazione.${CHIAVE_RELAZIONE[m.relazione]}`),
    m.occasione === "altra" ? m.occasione_altra : tOpzioni(`occasione.${m.occasione}`),
    m.budget_min !== null
      ? formattaFascia(m.budget_min, m.budget_max, valuta, lingua)
      : t("budgetFinoA", { prezzo: formattaPrezzo(m.budget_max, valuta, lingua) }),
    m.eta !== null ? t("etaAnni", { eta: m.eta }) : null,
    nomePaese(risultato.paese, lingua),
  ].filter(Boolean);

  const ideeVisibili = sessione.lotti.flatMap((l) => l.risultato.idee);
  const mostraAffiliazione = ideeVisibili.some((i) => i.affiliato);
  const haRisposte = risultato.domande_utili.some((d) => (risposte[d] ?? "").trim());

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      {inAttesa && <Caricamento />}

      {/* Intestazione dei risultati */}
      <div className="flex flex-wrap items-end justify-between gap-4 pt-6 sm:pt-10">
        <div>
          <h1 className="text-[2.2rem] leading-tight font-semibold tracking-tight sm:text-5xl">{t("titolo")}</h1>
          <p className="sr-only">{t("riepilogo")}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {riepilogo.map((voce, indice) => (
              <li key={indice} className="rounded-full border border-bordo bg-carta px-3 py-1 text-sm text-tenue">
                {voce}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={{ pathname: "/", hash: "modulo" }} className="pulsante-secondario">
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
              <path fill="currentColor" d="M13.6 2.6a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8l-9 9-4.4 1.1 1.1-4.4 8.5-9.5Z" />
            </svg>
            {t("modifica")}
          </Link>
          {/* Link normale (non gestito da Next.js): ricarica la home con il modulo vuoto */}
          <a href={`/${lingua}`} onClick={svuotaTutto} className="pulsante-secondario">
            {t("nuovaRicerca")}
          </a>
        </div>
      </div>

      {risultato.demo && (
        <p className="mt-6 rounded-2xl border-2 border-dashed border-ocra/50 bg-ocra-chiaro px-4 py-3 font-semibold text-ocra">
          {t("demo")}
        </p>
      )}

      {/* Lettura del profilo, avvisi, domande */}
      <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="scheda p-5 sm:p-6" aria-labelledby="titolo-lettura">
          <h2 id="titolo-lettura" className="text-sm font-semibold tracking-wide text-terracotta uppercase [font-family:var(--font-testo)]">
            {t("letturaTitolo")}
          </h2>
          <p className="mt-2 font-titoli text-xl leading-snug [font-variation-settings:'SOFT'_100]">
            {risultato.lettura_profilo}
          </p>
          {risultato.avvisi.length > 0 && (
            <div className="mt-5 rounded-2xl bg-ocra-chiaro/80 px-4 py-3 text-ocra">
              <h3 className="text-sm font-bold [font-family:var(--font-testo)]">{t("avvisiTitolo")}</h3>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 leading-snug">
                {risultato.avvisi.map((avviso, i) => (
                  <li key={i}>{avviso}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {risultato.domande_utili.length > 0 && (
          <section className="scheda bg-salvia-chiaro/40 p-5 sm:p-6" aria-labelledby="titolo-domande">
            <h2 id="titolo-domande" className="text-xl font-semibold">
              {t("domandeTitolo")}
            </h2>
            <p className="mt-1 text-sm text-tenue">{t("domandeAiuto")}</p>
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (haRisposte) void nuoveIdee("risposte", sessione);
              }}
            >
              {risultato.domande_utili.map((domanda, i) => (
                <div key={domanda}>
                  <label htmlFor={`risposta-${i}`} className="mb-1.5 block font-medium">
                    {domanda}
                  </label>
                  <input
                    id={`risposta-${i}`}
                    className="campo"
                    maxLength={500}
                    placeholder={t("rispostaSegnaposto")}
                    value={risposte[domanda] ?? ""}
                    onChange={(e) => setRisposte({ ...risposte, [domanda]: e.target.value })}
                  />
                </div>
              ))}
              <button type="submit" className="pulsante w-full" disabled={!haRisposte || inAttesa}>
                {t("rispondiRigenera")}
              </button>
            </form>
          </section>
        )}
      </div>

      {/* Le idee */}
      {risultato.parziale && (
        <p className="mt-6 rounded-2xl bg-sabbia px-4 py-3 text-tenue">
          {risultato.idee.length === 0 ? t("nessuna") : t("parziale", { numero: risultato.idee.length })}
        </p>
      )}
      <div key={risultato.generazione_id} className="mt-6 grid gap-5 md:grid-cols-2">
        {risultato.idee.map((idea, i) => (
          <SchedaIdea
            key={idea.id}
            idea={idea}
            valuta={valuta}
            ordine={i}
            voto={sessione.voti[idea.id]}
            onVota={(voto) => vota(sessione, idea.id, voto)}
          />
        ))}
      </div>

      {/* Rigenera */}
      <section className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-bordo px-5 py-8 text-center">
        <h2 className="text-2xl font-semibold">{t("rigeneraTitolo")}</h2>
        <p className="mt-2 max-w-md text-tenue">{t("rigeneraTesto")}</p>
        <button
          type="button"
          className="pulsante mt-5"
          disabled={inAttesa}
          onClick={() => void nuoveIdee("rigenera", sessione)}
        >
          <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
            <path fill="currentColor" d="M10 3a7 7 0 0 1 6.3 4H14a1 1 0 1 0 0 2h4.5a.5.5 0 0 0 .5-.5V4a1 1 0 1 0-2 0v1.4A9 9 0 0 0 1.1 9.9a1 1 0 0 0 2 .2A7 7 0 0 1 10 3Zm7.9 6.9a1 1 0 0 0-1.1.9A7 7 0 0 1 3.7 13H6a1 1 0 1 0 0-2H1.5a.5.5 0 0 0-.5.5V16a1 1 0 1 0 2 0v-1.4a9 9 0 0 0 15.9-3.6 1 1 0 0 0-1-1.1Z" />
          </svg>
          {t("rigenera")}
        </button>
      </section>

      {/* Proposte precedenti */}
      {precedenti.length > 0 && (
        <details className="group mt-8 rounded-3xl border border-bordo bg-carta/60">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 font-semibold">
            {t("precedenti")} ({precedenti.length})
            <svg viewBox="0 0 20 20" className="size-4 text-tenue transition-transform group-open:rotate-180" aria-hidden="true">
              <path fill="currentColor" d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
            </svg>
          </summary>
          <div className="space-y-8 px-4 pb-6 sm:px-5">
            {precedenti.map((lotto, indice) => (
              <section key={lotto.risultato.generazione_id}>
                <h3 className="mb-3 text-lg font-semibold">
                  {t("proposta", { numero: precedenti.length - indice })}
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {lotto.risultato.idee.map((idea) => (
                    <SchedaIdea
                      key={idea.id}
                      idea={idea}
                      valuta={lotto.risultato.valuta}
                      voto={sessione.voti[idea.id]}
                      onVota={(voto) => vota(sessione, idea.id, voto)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </details>
      )}

      {/* Note */}
      <div className="mt-8 space-y-2 text-sm leading-relaxed text-tenue">
        <p>{t("notaPrezzi")}</p>
        {mostraAffiliazione && <p>{t("affiliazione", { sito: SITO.nome })}</p>}
      </div>

      {/* Messaggio di errore (in basso, sempre visibile) */}
      {errore && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-lg animate-comparsa items-start gap-3 rounded-2xl border border-errore/25 bg-errore-chiaro px-4 py-3 text-errore shadow-sollevata"
        >
          <div className="flex-1">
            <p className="font-semibold">{tErrori("titolo")}</p>
            <p>{tErrori(errore)}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrore(null)}
            className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-errore/10"
            aria-label={t("chiudi")}
          >
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
              <path fill="currentColor" d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

/** Mostrato per un attimo mentre la pagina si carica. */
function Scheletro() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-10 sm:px-6" aria-hidden="true">
      <div className="h-12 w-2/3 animate-pulse rounded-2xl bg-sabbia" />
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-3xl bg-sabbia/70" />
        ))}
      </div>
    </div>
  );
}

/** Nessuna idea ancora: invito a compilare il modulo. */
function Vuoto() {
  const t = useTranslations("idee.vuoto");
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-10 text-center">
      <IllustrazioneRegalo className="w-56" />
      <h1 className="mt-4 text-3xl font-semibold">{t("titolo")}</h1>
      <p className="mt-2 text-tenue">{t("testo")}</p>
      <Link href={{ pathname: "/", hash: "modulo" }} className="pulsante mt-6">
        {t("azione")}
      </Link>
    </div>
  );
}
