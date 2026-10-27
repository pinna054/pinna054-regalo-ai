"use client";

/**
 * Il modulo della home: chi è il destinatario, occasione, budget, gusti e filtri.
 * Non chiede MAI nome o cognome. I dati restano nella scheda del browser finché non si invia.
 */
import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore, useTransition, type FormEvent, type ReactNode } from "react";
import {
  CHIAVE_RELAZIONE,
  CHIAVE_TIPOLOGIA,
  INGOMBRI_MASSIMI,
  OCCASIONI,
  RELAZIONI,
  TIPOLOGIE,
  type Tipologia,
} from "@/config/opzioni";
import { deduciPaese, PAESI, trovaPaese } from "@/config/paesi";
import { useRouter } from "@/i18n/navigation";
import { leggiNumero, nomePaese, simboloValuta } from "@/lib/formato";
import {
  chiediIdee,
  interpreta,
  leggiBozzaGrezza,
  nessunaIscrizione,
  salvaBozza,
  salvaSessione,
  type StatoModulo,
} from "@/lib/sessione";
import { MASSIMO_CARATTERI, SchemaModulo, sistemaBudget, type RichiestaApi } from "@/motore/richiesta";
import type { CodiceErroreApi } from "@/motore/tipi-api";
import { Caricamento } from "./Caricamento";

type CampoConErrore = "relazione" | "occasione" | "occasione_altra" | "paese" | "budget" | "eta";
type ErroriModulo = Partial<Record<CampoConErrore, string>>;

function statoVuoto(paese: string): StatoModulo {
  return {
    paese,
    relazione: "",
    occasione: "",
    occasione_altra: "",
    budget_min: "",
    budget_max: "",
    eta: "",
    descrizione: "",
    ha_gia: "",
    non_sopporta: "",
    tipologie: [],
    ingombro_max: "qualsiasi",
  };
}

/** Controlla il modulo: restituisce i dati per l'API oppure gli errori da mostrare. */
function convalida(
  stato: StatoModulo,
): { ok: true; modulo: RichiestaApi["modulo"] } | { ok: false; errori: ErroriModulo } {
  const errori: ErroriModulo = {};
  const minimo = leggiNumero(stato.budget_min);
  const massimo = leggiNumero(stato.budget_max);
  const eta = leggiNumero(stato.eta);

  if (!stato.relazione) errori.relazione = "relazione";
  if (!stato.occasione) errori.occasione = "occasione";
  if (stato.occasione === "altra" && !stato.occasione_altra.trim()) errori.occasione_altra = "occasioneAltra";
  if (!trovaPaese(stato.paese)) errori.paese = "paese";

  const numeroNonValido = (n: number | null) => n !== null && (Number.isNaN(n) || n < 0 || n > 1_000_000);
  const budget = sistemaBudget(minimo, massimo);
  if (numeroNonValido(minimo) || numeroNonValido(massimo)) errori.budget = "budgetValore";
  else if (!budget || budget.budget_max <= 0) errori.budget = "budget";
  else if (budget.budget_min !== null && budget.budget_min > budget.budget_max) errori.budget = "budgetOrdine";

  if (eta !== null && (Number.isNaN(eta) || !Number.isInteger(eta) || eta < 0 || eta > 120)) errori.eta = "eta";

  if (Object.keys(errori).length > 0 || !budget) return { ok: false, errori };

  const esito = SchemaModulo.safeParse({
    paese: stato.paese,
    relazione: stato.relazione,
    occasione: stato.occasione,
    occasione_altra: stato.occasione === "altra" ? stato.occasione_altra.trim() : "",
    budget_min: budget.budget_min,
    budget_max: budget.budget_max,
    eta,
    descrizione: stato.descrizione.trim(),
    ha_gia: stato.ha_gia.trim(),
    non_sopporta: stato.non_sopporta.trim(),
    tipologie: stato.tipologie,
    ingombro_max: stato.ingombro_max,
  });
  return esito.success ? { ok: true, modulo: esito.data } : { ok: false, errori: { budget: "generico" } };
}

export function ModuloRegalo() {
  const t = useTranslations("modulo");
  const tOpzioni = useTranslations("opzioni");
  const tErrori = useTranslations("errori");
  const lingua = useLocale();
  const router = useRouter();

  // Dati salvati nella scheda (o paese dedotto dal browser), letti dopo il caricamento della pagina
  const bozza = useSyncExternalStore(nessunaIscrizione, leggiBozzaGrezza, () => "");
  const paeseDedotto = useSyncExternalStore(
    nessunaIscrizione,
    () => deduciPaese(lingua, navigator.languages),
    () => deduciPaese(lingua),
  );
  const [modificato, setModificato] = useState<StatoModulo | null>(null);
  const stato = modificato ?? interpreta<StatoModulo>(bozza) ?? statoVuoto(paeseDedotto);

  const [errori, setErrori] = useState<ErroriModulo>({});
  const [erroreInvio, setErroreInvio] = useState<CodiceErroreApi | null>(null);
  const [inviando, setInviando] = useState(false);
  const [cambioPagina, avviaCambioPagina] = useTransition();

  function aggiorna<K extends keyof StatoModulo>(campo: K, valore: StatoModulo[K]) {
    const nuovo = { ...stato, [campo]: valore };
    setModificato(nuovo);
    salvaBozza(nuovo);
    const campoErrore = (campo === "budget_min" || campo === "budget_max" ? "budget" : campo) as CampoConErrore;
    if (errori[campoErrore]) setErrori({ ...errori, [campoErrore]: undefined });
  }

  async function invia(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const esito = convalida(stato);
    if (!esito.ok) {
      setErrori(esito.errori);
      // porta l'utente al primo campo da correggere
      const primo = Object.keys(esito.errori)[0];
      document.getElementById(`campo-${primo}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setErrori({});
    setErroreInvio(null);
    setInviando(true);
    const risposta = await chiediIdee({
      lingua,
      modulo: esito.modulo,
      tipo: "nuova",
      risposte: [],
      escludi_titoli: [],
      genitore_id: null,
    });
    if (!risposta.ok) {
      setInviando(false);
      setErroreInvio(risposta.errore);
      return;
    }

    salvaSessione({
      lingua,
      modulo: esito.modulo,
      lotti: [{ risultato: risposta, tipo: "nuova", creato: Date.now() }],
      risposte: [],
      voti: {},
    });
    avviaCambioPagina(() => {
      setInviando(false);
      router.push("/idee");
    });
  }

  const paese = trovaPaese(stato.paese);
  const simbolo = paese ? simboloValuta(paese.valuta, lingua) : "";
  const paesiOrdinati = [...PAESI].sort((a, b) =>
    nomePaese(a.codice, lingua).localeCompare(nomePaese(b.codice, lingua), lingua),
  );
  const filtriAttivi = stato.tipologie.length + (stato.ingombro_max === "qualsiasi" ? 0 : 1);

  return (
    <>
      {(inviando || cambioPagina) && <Caricamento />}

      <form onSubmit={invia} noValidate className="scheda p-5 sm:p-8" aria-labelledby="titolo-modulo">
        <h2 id="titolo-modulo" className="text-[1.75rem] leading-tight font-semibold sm:text-3xl">
          {t("titolo")}
        </h2>
        <p className="mt-1 text-sm text-tenue">{t("obbligatori")}</p>

        <div className="mt-7 space-y-8">
          {/* Relazione */}
          <GruppoScelte
            id="campo-relazione"
            legenda={`${t("relazione.etichetta")} *`}
            errore={errori.relazione && t(`errori.${errori.relazione}`)}
          >
            {RELAZIONI.map((valore) => (
              <Pillola
                key={valore}
                tipo="radio"
                nome="relazione"
                valore={valore}
                selezionata={stato.relazione === valore}
                onChange={() => aggiorna("relazione", valore)}
              >
                {tOpzioni(`relazione.${CHIAVE_RELAZIONE[valore]}`)}
              </Pillola>
            ))}
          </GruppoScelte>

          {/* Occasione */}
          <GruppoScelte
            id="campo-occasione"
            legenda={`${t("occasione.etichetta")} *`}
            errore={errori.occasione && t(`errori.${errori.occasione}`)}
          >
            {OCCASIONI.map((valore) => (
              <Pillola
                key={valore}
                tipo="radio"
                nome="occasione"
                valore={valore}
                selezionata={stato.occasione === valore}
                onChange={() => aggiorna("occasione", valore)}
              >
                {tOpzioni(`occasione.${valore}`)}
              </Pillola>
            ))}
          </GruppoScelte>
          {stato.occasione === "altra" && (
            <div className="-mt-4 animate-comparsa">
              <label htmlFor="campo-occasione_altra" className="etichetta">
                {t("occasione.altraEtichetta")} *
              </label>
              <input
                id="campo-occasione_altra"
                className="campo"
                value={stato.occasione_altra}
                maxLength={MASSIMO_CARATTERI.occasione_altra}
                placeholder={t("occasione.altraSegnaposto")}
                aria-invalid={Boolean(errori.occasione_altra)}
                aria-describedby={errori.occasione_altra ? "errore-occasione_altra" : undefined}
                onChange={(e) => aggiorna("occasione_altra", e.target.value)}
              />
              <MessaggioErrore id="errore-occasione_altra" testo={errori.occasione_altra && t(`errori.${errori.occasione_altra}`)} />
            </div>
          )}

          {/* Paese di consegna e budget */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="campo-paese" className="etichetta">
                {t("paese.etichetta")} *
              </label>
              <select
                id="campo-paese"
                className="campo cursor-pointer"
                value={stato.paese}
                aria-invalid={Boolean(errori.paese)}
                aria-describedby="aiuto-paese"
                onChange={(e) => aggiorna("paese", e.target.value)}
              >
                {paesiOrdinati.map((p) => (
                  <option key={p.codice} value={p.codice}>
                    {nomePaese(p.codice, lingua)}
                  </option>
                ))}
              </select>
              <p id="aiuto-paese" className="mt-1.5 text-sm text-tenue">
                {paese && t("paese.aiuto", { valuta: `${paese.valuta} (${simbolo})` })}
              </p>
              <MessaggioErrore id="errore-paese" testo={errori.paese && t(`errori.${errori.paese}`)} />
            </div>

            <fieldset id="campo-budget" aria-describedby="aiuto-budget">
              <legend className="etichetta">{t("budget.etichetta")} *</legend>
              <div className="grid grid-cols-2 gap-3">
                <CampoImporto
                  etichetta={t("budget.da")}
                  simbolo={simbolo}
                  valore={stato.budget_min}
                  errore={Boolean(errori.budget)}
                  onChange={(v) => aggiorna("budget_min", v)}
                />
                <CampoImporto
                  etichetta={t("budget.a")}
                  simbolo={simbolo}
                  valore={stato.budget_max}
                  errore={Boolean(errori.budget)}
                  onChange={(v) => aggiorna("budget_max", v)}
                />
              </div>
              <p id="aiuto-budget" className="mt-1.5 text-sm text-tenue">
                {t("budget.aiuto")}
              </p>
              <MessaggioErrore id="errore-budget" testo={errori.budget && t(`errori.${errori.budget}`)} />
            </fieldset>
          </div>

          {/* Età */}
          <div className="max-w-[12rem]">
            <label htmlFor="campo-eta" className="etichetta">
              {t("eta.etichetta")} <Facoltativo testo={t("facoltativo")} />
            </label>
            <input
              id="campo-eta"
              className="campo"
              inputMode="numeric"
              autoComplete="off"
              maxLength={3}
              placeholder={t("eta.segnaposto")}
              value={stato.eta}
              aria-invalid={Boolean(errori.eta)}
              aria-describedby={errori.eta ? "errore-eta" : undefined}
              onChange={(e) => aggiorna("eta", e.target.value.replace(/[^\d]/g, ""))}
            />
            <MessaggioErrore id="errore-eta" testo={errori.eta && t(`errori.${errori.eta}`)} />
          </div>

          {/* Testi liberi */}
          <AreaTesto
            id="campo-descrizione"
            etichetta={t("descrizione.etichetta")}
            facoltativo={t("facoltativo")}
            segnaposto={t("descrizione.segnaposto")}
            valore={stato.descrizione}
            massimo={MASSIMO_CARATTERI.descrizione}
            righe={4}
            onChange={(v) => aggiorna("descrizione", v)}
          />
          <AreaTesto
            id="campo-ha_gia"
            etichetta={t("haGia.etichetta")}
            facoltativo={t("facoltativo")}
            segnaposto={t("haGia.segnaposto")}
            valore={stato.ha_gia}
            massimo={MASSIMO_CARATTERI.ha_gia}
            righe={2}
            onChange={(v) => aggiorna("ha_gia", v)}
          />
          <AreaTesto
            id="campo-non_sopporta"
            etichetta={t("nonSopporta.etichetta")}
            facoltativo={t("facoltativo")}
            segnaposto={t("nonSopporta.segnaposto")}
            valore={stato.non_sopporta}
            massimo={MASSIMO_CARATTERI.non_sopporta}
            righe={2}
            onChange={(v) => aggiorna("non_sopporta", v)}
          />

          {/* Filtri */}
          <details className="group rounded-2xl border border-bordo bg-sabbia/50 open:bg-transparent" open={filtriAttivi > 0 || undefined}>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 font-semibold">
              <span className="flex items-center gap-2">
                <svg viewBox="0 0 20 20" className="size-4 text-terracotta" aria-hidden="true">
                  <path fill="currentColor" d="M3 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm2 5a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1Zm3 4a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1Z" />
                </svg>
                {t("filtri.titolo")}
                {filtriAttivi > 0 && (
                  <span className="rounded-full bg-terracotta px-2 py-0.5 text-xs text-white">{filtriAttivi}</span>
                )}
              </span>
              <svg viewBox="0 0 20 20" className="size-4 text-tenue transition-transform group-open:rotate-180" aria-hidden="true">
                <path fill="currentColor" d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
              </svg>
            </summary>
            <div className="space-y-6 px-4 pt-1 pb-5">
              <p className="text-sm text-tenue">{t("filtri.aiuto")}</p>
              <GruppoScelte legenda={t("filtri.tipologie")}>
                {TIPOLOGIE.map((valore) => (
                  <Pillola
                    key={valore}
                    tipo="checkbox"
                    nome="tipologie"
                    valore={valore}
                    selezionata={stato.tipologie.includes(valore)}
                    onChange={() =>
                      aggiorna(
                        "tipologie",
                        stato.tipologie.includes(valore)
                          ? stato.tipologie.filter((v) => v !== valore)
                          : ([...stato.tipologie, valore] as Tipologia[]),
                      )
                    }
                  >
                    {tOpzioni(`tipologia.${CHIAVE_TIPOLOGIA[valore]}`)}
                  </Pillola>
                ))}
              </GruppoScelte>
              <GruppoScelte legenda={t("filtri.ingombro")}>
                {INGOMBRI_MASSIMI.map((valore) => (
                  <Pillola
                    key={valore}
                    tipo="radio"
                    nome="ingombro_max"
                    valore={valore}
                    selezionata={stato.ingombro_max === valore}
                    onChange={() => aggiorna("ingombro_max", valore)}
                  >
                    {tOpzioni(`ingombroMassimo.${valore}`)}
                  </Pillola>
                ))}
              </GruppoScelte>
            </div>
          </details>
        </div>

        {/* Avviso privacy e invio */}
        <p className="mt-8 flex gap-3 rounded-2xl bg-salvia-chiaro/70 px-4 py-3 text-[0.95rem] leading-snug text-salvia">
          <svg viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0" aria-hidden="true">
            <path fill="currentColor" d="M10 1.8 3.5 4.3v5.2c0 4 2.7 7.4 6.5 8.7 3.8-1.3 6.5-4.7 6.5-8.7V4.3L10 1.8Zm-1 11.6-3-3 1.4-1.4L9 10.6l3.6-3.6L14 8.4l-5 5Z" />
          </svg>
          <span>{t("avvisoPrivacy")}</span>
        </p>

        {erroreInvio && (
          <div role="alert" className="mt-5 rounded-2xl border border-errore/25 bg-errore-chiaro px-4 py-3 text-errore">
            <p className="font-semibold">{tErrori("titolo")}</p>
            <p className="mt-0.5">{tErrori(erroreInvio)}</p>
          </div>
        )}
        {Object.values(errori).some(Boolean) && (
          <p role="alert" className="mt-5 text-center font-medium text-errore">
            {t("errori.generico")}
          </p>
        )}

        <button type="submit" className="pulsante mt-5 w-full text-lg" disabled={inviando || cambioPagina}>
          {t("invia")}
          <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
            <path fill="currentColor" d="M11.3 4.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4l3.3-3.3H3a1 1 0 1 1 0-2h11.6l-3.3-3.3a1 1 0 0 1 0-1.4Z" />
          </svg>
        </button>
      </form>
    </>
  );
}

/* ---------- piccoli componenti del modulo ---------- */

function GruppoScelte({
  id,
  legenda,
  errore,
  children,
}: {
  id?: string;
  legenda: string;
  errore?: string | false;
  children: ReactNode;
}) {
  const idErrore = id ? `errore-${id.replace("campo-", "")}` : undefined;
  return (
    <fieldset id={id} aria-describedby={errore ? idErrore : undefined}>
      <legend className="etichetta">{legenda}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      {idErrore && <MessaggioErrore id={idErrore} testo={errore} />}
    </fieldset>
  );
}

function Pillola({
  tipo,
  nome,
  valore,
  selezionata,
  onChange,
  children,
}: {
  tipo: "radio" | "checkbox";
  nome: string;
  valore: string;
  selezionata: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  const id = `${nome}-${valore}`.replace(/[^\w-]/g, "_");
  return (
    <span>
      <input
        id={id}
        type={tipo}
        name={nome}
        value={valore}
        checked={selezionata}
        onChange={onChange}
        className="pillola-input sr-only"
      />
      <label htmlFor={id} className="pillola">
        {children}
      </label>
    </span>
  );
}

function CampoImporto({
  etichetta,
  simbolo,
  valore,
  errore,
  onChange,
}: {
  etichetta: string;
  simbolo: string;
  valore: string;
  errore: boolean;
  onChange: (valore: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-tenue">{etichetta}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-tenue" aria-hidden="true">
          {simbolo}
        </span>
        <input
          className="campo pl-8"
          inputMode="decimal"
          autoComplete="off"
          maxLength={9}
          value={valore}
          aria-invalid={errore}
          aria-describedby={errore ? "errore-budget" : undefined}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
        />
      </span>
    </label>
  );
}

function AreaTesto({
  id,
  etichetta,
  facoltativo,
  segnaposto,
  valore,
  massimo,
  righe,
  onChange,
}: {
  id: string;
  etichetta: string;
  facoltativo: string;
  segnaposto: string;
  valore: string;
  massimo: number;
  righe: number;
  onChange: (valore: string) => void;
}) {
  const vicinoAlLimite = valore.length > massimo * 0.8;
  return (
    <div>
      <label htmlFor={id} className="etichetta">
        {etichetta} <Facoltativo testo={facoltativo} />
      </label>
      <textarea
        id={id}
        className="campo resize-y leading-relaxed"
        rows={righe}
        maxLength={massimo}
        placeholder={segnaposto}
        value={valore}
        onChange={(e) => onChange(e.target.value)}
      />
      {vicinoAlLimite && (
        <p className="mt-1 text-right text-xs text-tenue" aria-live="polite">
          {valore.length}/{massimo}
        </p>
      )}
    </div>
  );
}

function Facoltativo({ testo }: { testo: string }) {
  return <span className="ml-1 text-sm font-normal text-tenue">({testo})</span>;
}

function MessaggioErrore({ id, testo }: { id: string; testo?: string | false }) {
  if (!testo) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-errore">
      <svg viewBox="0 0 20 20" className="size-4 shrink-0" aria-hidden="true">
        <path fill="currentColor" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-.9 4h1.8v5.2H9.1V6Zm.9 8.6a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Z" />
      </svg>
      {testo}
    </p>
  );
}
