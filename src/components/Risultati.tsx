"use client";

/**
 * Pagina dei risultati, come un'app di incontri ma per i regali:
 * 1. Quiz: domande sul destinatario da scorrere (sì / no) e qualche domanda aperta;
 * 2. "Scopri": le idee una alla volta, da scorrere a destra (♥) o a sinistra (✕);
 *    quando stanno per finire il motore ne prepara altre tenendo conto delle scelte;
 * 3. "Preferiti": le idee che sono piaciute, con i link per comprarle.
 * Sotto: cosa ha capito il motore, avvisi e domande utili.
 * Tutto resta nella memoria della scheda (sessionStorage).
 */
import { useLocale, useTranslations } from "next-intl";
import { useId, useRef, useState, useSyncExternalStore } from "react";
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
import type { CodiceErroreApi, IdeaMostrata } from "@/motore/tipi-api";
import { Caricamento } from "./Caricamento";
import { IllustrazioneRegalo } from "./Illustrazioni";
import { MazzoIdee } from "./MazzoIdee";
import { Preferiti } from "./Preferiti";
import { Quiz } from "./Quiz";

// Valore usato mentre la pagina viene preparata sul server (la memoria del browser non c'è ancora)
const SUL_SERVER = "__server__";
// Massimo di titoli già visti da passare al motore
const MASSIMO_ESCLUSI = 60;
// Come il motore legge le risposte del quiz
const RISPOSTA_PER_MOTORE: Record<string, string> = { si: "Sì", no: "No", nonso: "Non so" };

type TipoRichiesta = "nuova" | "rigenera" | "risposte";

export function Risultati() {
  const t = useTranslations("idee");
  const tQuiz = useTranslations("quiz");
  const tOpzioni = useTranslations("opzioni");
  const tErrori = useTranslations("errori");
  const lingua = useLocale();

  const grezza = useSyncExternalStore(nessunaIscrizione, leggiSessioneGrezza, () => SUL_SERVER);
  const [modificata, setModificata] = useState<Sessione | null>(null);
  const [inAttesa, setInAttesa] = useState(false);
  // Ricerca di altre idee mentre si scorrono le carte (senza schermata di attesa)
  const [cercando, setCercando] = useState(false);
  const [errore, setErrore] = useState<CodiceErroreApi | null>(null);
  const [risposte, setRisposte] = useState<Record<string, string>>({});
  const [vista, setVista] = useState<"scopri" | "preferiti">("scopri");
  // Ultima idea scelta, per poter annullare la scelta
  const [ultimaScelta, setUltimaScelta] = useState<string | null>(null);
  const [avvisoPreferito, setAvvisoPreferito] = useState(false);
  const timerAvviso = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prefisso = useId();

  if (grezza === SUL_SERVER) return <Scheletro />;
  const salvata = interpreta<Sessione>(grezza);
  // (i campi mancanti in una sessione salvata da una versione precedente prendono un valore vuoto)
  const sessione =
    modificata ??
    (salvata && { ...salvata, lotti: salvata.lotti ?? [], risposte: salvata.risposte ?? [], voti: salvata.voti ?? {} });
  if (!sessione || (sessione.lotti.length === 0 && !sessione.quiz)) return <Vuoto />;

  const risultato = sessione.lotti[0]?.risultato;
  const quizInCorso = sessione.quiz && !sessione.quiz.finito;

  function aggiorna(nuova: Sessione) {
    setModificata(nuova);
    salvaSessione(nuova);
  }

  async function nuoveIdee(tipo: TipoRichiesta, s: Sessione, inSottofondo = false) {
    const nuoveRisposte =
      tipo === "risposte" && risultato
        ? [
            ...s.risposte,
            ...risultato.domande_utili
              .map((domanda) => ({ domanda, risposta: (risposte[domanda] ?? "").trim() }))
              .filter((r) => r.risposta),
          ].slice(-16)
        : s.risposte;
    // Il motore riceve i titoli già visti (da non ripetere) e le scelte fatte con le carte
    const tutte = s.lotti.flatMap((l) => l.risultato.idee);
    const escludi = tipo === "rigenera" ? tutte.map((i) => i.titolo).slice(0, MASSIMO_ESCLUSI) : [];
    const piaciute = tutte.filter((i) => s.voti[i.id] === 1).map((i) => i.titolo).slice(0, 30);
    const scartate = tutte.filter((i) => s.voti[i.id] === -1).map((i) => i.titolo).slice(0, 30);

    setErrore(null);
    if (inSottofondo) setCercando(true);
    else setInAttesa(true);
    const risposta = await chiediIdee({
      lingua,
      modulo: s.modulo,
      tipo,
      risposte: nuoveRisposte,
      escludi_titoli: escludi,
      piaciute,
      scartate,
      genitore_id: s.lotti[0]?.risultato.generazione_id ?? null,
    });
    setInAttesa(false);
    setCercando(false);
    if (!risposta.ok) {
      setErrore(risposta.errore);
      return;
    }
    // Rilegge la sessione salvata: nel frattempo l'utente può aver scelto altre carte
    const attuale = interpreta<Sessione>(leggiSessioneGrezza()) ?? s;
    aggiorna({
      ...attuale,
      lingua,
      risposte: nuoveRisposte,
      lotti: [{ risultato: risposta, tipo, creato: Date.now() }, ...attuale.lotti],
    });
    if (!inSottofondo) {
      setRisposte({});
      setVista("scopri");
    }
  }

  /** Fine del quiz: le risposte entrano nel profilo e si chiedono le prime idee. */
  function concludiQuiz(s: Sessione) {
    const quiz = s.quiz;
    if (!quiz) return;
    const dalQuiz = quiz.domande.flatMap((d, i) => {
      const r = quiz.risposte[i];
      if (!r) return [];
      // al motore il destinatario arriva sempre come "la persona", mai con il soprannome
      return [{ domanda: d.testo.replaceAll("{nome}", "la persona"), risposta: RISPOSTA_PER_MOTORE[r] ?? r }];
    });
    const nuova = { ...s, risposte: dalQuiz.slice(0, 16), quiz: { ...quiz, finito: true } };
    aggiorna(nuova);
    void nuoveIdee("nuova", nuova);
  }

  function rispondiQuiz(vista: Sessione, indice: number, valore: string) {
    const s = interpreta<Sessione>(leggiSessioneGrezza()) ?? vista;
    if (!s.quiz) return;
    const risposteQuiz = [...s.quiz.risposte];
    risposteQuiz[indice] = valore;
    const nuova = { ...s, quiz: { ...s.quiz, risposte: risposteQuiz } };
    if (risposteQuiz.every((r) => r !== null)) concludiQuiz(nuova);
    else aggiorna(nuova);
  }

  /** Scelta su una carta: 1 = mi piace (va nei preferiti), -1 = scartata, 0 = annullata. */
  function scegli(vista: Sessione, ideaId: string, voto: 1 | -1 | 0) {
    // Parte dalla sessione salvata più recente: nel frattempo può essere arrivato un nuovo gruppo di idee
    const s = interpreta<Sessione>(leggiSessioneGrezza()) ?? vista;
    const voti = { ...s.voti };
    if (voto === 0) delete voti[ideaId];
    else voti[ideaId] = voto;
    const nuova = { ...s, voti };
    aggiorna(nuova);
    inviaVoto(ideaId, voto);
    setUltimaScelta(voto === 0 ? null : ideaId);
    if (voto === 1) {
      setAvvisoPreferito(true);
      clearTimeout(timerAvviso.current);
      timerAvviso.current = setTimeout(() => setAvvisoPreferito(false), 1600);
    }
    // Quando resta al massimo una carta, il motore ne prepara altre in sottofondo
    if (voto !== 0 && !cercando && !inAttesa && daScegliere(nuova).length <= 1) {
      void nuoveIdee("rigenera", nuova, true);
    }
  }

  const m = sessione.modulo;
  const valuta = risultato?.valuta;
  const riepilogo = [
    sessione.soprannome || tOpzioni(`relazione.${CHIAVE_RELAZIONE[m.relazione]}`),
    m.occasione === "altra" ? m.occasione_altra : tOpzioni(`occasione.${m.occasione}`),
    valuta
      ? m.budget_min !== null
        ? formattaFascia(m.budget_min, m.budget_max, valuta, lingua)
        : t("budgetFinoA", { prezzo: formattaPrezzo(m.budget_max, valuta, lingua) })
      : null,
    m.eta !== null ? t("etaAnni", { eta: m.eta }) : null,
    nomePaese(risultato?.paese ?? m.paese, lingua),
  ].filter(Boolean);

  const mazzo = daScegliere(sessione);
  const preferite = tutteLeIdee(sessione).filter(({ idea }) => sessione.voti[idea.id] === 1);
  const mostraAffiliazione = sessione.lotti.some((l) => l.risultato.idee.some((i) => i.affiliato));
  const haRisposte = risultato?.domande_utili.some((d) => (risposte[d] ?? "").trim()) ?? false;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      {inAttesa && <Caricamento />}

      {/* Intestazione compatta, così le carte restano in vista anche sul telefono */}
      <div className="pt-4 sm:pt-8">
        <h1 className="text-[1.9rem] leading-tight font-semibold tracking-tight sm:text-4xl">
          {quizInCorso ? tQuiz("titolo") : t("titolo")}
        </h1>
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t("riepilogo")}>
          {riepilogo.map((voce, indice) => (
            <li key={indice} className="rounded-full border border-bordo bg-carta px-2.5 py-0.5 text-sm text-tenue">
              {voce}
            </li>
          ))}
        </ul>
      </div>

      {risultato?.demo && (
        <p className="mt-3 rounded-xl border border-dashed border-ocra/50 bg-ocra-chiaro px-3 py-1.5 text-sm font-semibold text-ocra">
          {t("demo")}
        </p>
      )}

      {quizInCorso && sessione.quiz ? (
        <div className="mt-5">
          <Quiz
            domande={sessione.quiz.domande}
            risposte={sessione.quiz.risposte}
            soprannome={sessione.soprannome ?? ""}
            onRispondi={(indice, valore) => rispondiQuiz(sessione, indice, valore)}
            onSaltaTutto={() => concludiQuiz(sessione)}
          />
        </div>
      ) : (
        <>
          {/* Schede: Scopri / Preferiti */}
          <div
            className="sticky top-2 z-30 mx-auto mt-5 flex w-fit gap-1 rounded-full border border-bordo bg-carta/95 p-1 shadow-morbida backdrop-blur"
            role="tablist"
          >
            {(["scopri", "preferiti"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={vista === v}
                onClick={() => setVista(v)}
                className={`min-h-10 rounded-full px-5 text-[0.95rem] font-semibold transition ${
                  vista === v ? "bg-inchiostro text-crema" : "text-tenue hover:text-inchiostro"
                }`}
              >
                {v === "scopri" ? t("scopri") : `${t("preferiti")} (${preferite.length})`}
              </button>
            ))}
          </div>

          <div className="mt-5" role="tabpanel">
            {vista === "preferiti" ? (
              <Preferiti idee={preferite} onTogli={(idea) => scegli(sessione, idea.id, 0)} />
            ) : mazzo.length > 0 ? (
              <MazzoIdee
                idee={mazzo}
                onScegli={(idea, voto) => scegli(sessione, idea.id, voto)}
                onAnnulla={ultimaScelta ? () => scegli(sessione, ultimaScelta, 0) : null}
              />
            ) : (
              <section className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-dashed border-bordo px-5 py-10 text-center">
                {cercando || inAttesa ? (
                  <>
                    <div className="size-10 animate-spin rounded-full border-4 border-sabbia border-t-terracotta" aria-hidden="true" />
                    <p className="mt-4 font-semibold" role="status">
                      {t("cercoAltre")}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-semibold">{t("finite")}</h2>
                    <p className="mt-2 text-tenue">{t("finiteTesto")}</p>
                    <button
                      type="button"
                      className="pulsante mt-5"
                      onClick={() => void nuoveIdee(sessione.lotti.length ? "rigenera" : "nuova", sessione, true)}
                    >
                      {t("altreIdee")}
                    </button>
                    {preferite.length > 0 && (
                      <button type="button" className="pulsante-secondario mt-3" onClick={() => setVista("preferiti")}>
                        {t("vaiPreferiti")}
                      </button>
                    )}
                  </>
                )}
              </section>
            )}
          </div>
        </>
      )}

      {/* Cosa ha capito il motore, avvisi e domande utili */}
      {risultato && !quizInCorso && (
        <div className="mx-auto mt-10 grid max-w-3xl gap-4">
          <section className="scheda p-5 sm:p-6" aria-labelledby={`${prefisso}-lettura`}>
            <h2
              id={`${prefisso}-lettura`}
              className="text-sm font-semibold tracking-wide text-terracotta uppercase [font-family:var(--font-testo)]"
            >
              {t("letturaTitolo")}
            </h2>
            <p className="mt-2 font-titoli text-xl leading-snug [font-variation-settings:'SOFT'_100]">{risultato.lettura_profilo}</p>
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
            <section className="scheda bg-salvia-chiaro/40 p-5 sm:p-6" aria-labelledby={`${prefisso}-domande`}>
              <h2 id={`${prefisso}-domande`} className="text-xl font-semibold">
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
                    <label htmlFor={`${prefisso}-risposta-${i}`} className="mb-1.5 block font-medium">
                      {domanda}
                    </label>
                    <input
                      id={`${prefisso}-risposta-${i}`}
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
      )}

      {/* Azioni e note */}
      <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
        <Link href={{ pathname: "/", hash: "modulo" }} className="pulsante-secondario">
          {t("modifica")}
        </Link>
        {/* Link normale (non gestito da Next.js): ricarica la home con il modulo vuoto */}
        <a href={`/${lingua}`} onClick={svuotaTutto} className="pulsante-secondario">
          {t("nuovaRicerca")}
        </a>
      </div>
      <div className="mx-auto mt-6 max-w-3xl space-y-2 text-sm leading-relaxed text-tenue">
        <p>{t("notaPrezzi")}</p>
        {mostraAffiliazione && <p>{t("affiliazione", { sito: SITO.nome })}</p>}
      </div>

      {/* Avviso breve quando un'idea finisce nei preferiti */}
      {avvisoPreferito && (
        <p
          role="status"
          className="fixed inset-x-0 bottom-6 z-40 mx-auto flex w-fit animate-comparsa items-center gap-2 rounded-full bg-inchiostro px-5 py-2.5 font-semibold text-crema shadow-sollevata"
        >
          <span aria-hidden="true">♥</span> {t("aggiuntaPreferiti")}
        </p>
      )}

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
              <path
                fill="currentColor"
                d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

/** Tutte le idee ricevute, dalla più vecchia alla più recente, con la loro valuta. */
function tutteLeIdee(s: Sessione): { idea: IdeaMostrata; valuta: string }[] {
  return [...s.lotti].reverse().flatMap((l) => l.risultato.idee.map((idea) => ({ idea, valuta: l.risultato.valuta })));
}

/** Le carte ancora da scegliere (né piaciute né scartate). */
function daScegliere(s: Sessione) {
  return tutteLeIdee(s).filter(({ idea }) => s.voti[idea.id] === undefined);
}

/** Mostrato per un attimo mentre la pagina si carica. */
function Scheletro() {
  return (
    <div className="mx-auto w-full max-w-md px-4 pt-8" aria-hidden="true">
      <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-sabbia" />
      <div className="mt-8 h-96 animate-pulse rounded-3xl bg-sabbia/70" />
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
