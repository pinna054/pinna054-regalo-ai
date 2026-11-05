"use client";

/**
 * Il quiz sul destinatario, prima delle idee:
 * - domande sì/no da scorrere (destra = Sì, sinistra = No, pulsante centrale = Non so);
 * - poi qualche domanda aperta a cui rispondere con poche parole (si può saltare).
 * Il soprannome sostituisce {nome} solo qui, nel browser.
 */
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { conNome } from "@/lib/sessione";
import type { DomandaQuiz } from "@/motore/tipi-api";
import { ICONE, MazzoScorrevole } from "./MazzoScorrevole";

type Props = {
  domande: DomandaQuiz[];
  /** Una risposta per domanda: "si", "no", "nonso", un testo, "" (saltata) o null (non ancora) */
  risposte: (string | null)[];
  soprannome: string;
  onRispondi: (indice: number, risposta: string) => void;
  onSaltaTutto: () => void;
};

export function Quiz({ domande, risposte, soprannome, onRispondi, onSaltaTutto }: Props) {
  const t = useTranslations("quiz");
  const [testo, setTesto] = useState("");
  const idCampo = useId();
  const frase = (d: DomandaQuiz) => conNome(d.testo, soprannome, t("laPersona"));

  const daFare = domande.map((d, indice) => ({ d, indice })).filter(({ indice }) => risposte[indice] === null);
  const siNo = daFare.filter(({ d }) => d.tipo === "si_no");
  const aperta = daFare.find(({ d }) => d.tipo === "aperta");
  const fatte = domande.length - daFare.length;

  return (
    <section className="mx-auto w-full max-w-md" aria-label={t("titolo")}>
      {/* Avanzamento */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-sabbia">
          <div className="h-full rounded-full bg-terracotta transition-[width] duration-300" style={{ width: `${(fatte / domande.length) * 100}%` }} />
        </div>
        <span className="text-sm font-semibold text-tenue tabular-nums">
          {Math.min(fatte + 1, domande.length)}/{domande.length}
        </span>
      </div>

      {siNo.length > 0 ? (
        <MazzoScorrevole
          elementi={siNo}
          chiave={({ indice }) => String(indice)}
          disegna={({ d }) => (
            <article className="scheda grid min-h-72 place-items-center p-8 text-center shadow-sollevata">
              <p className="font-titoli text-[1.9rem] leading-tight font-semibold [font-variation-settings:'SOFT'_100]">{frase(d)}</p>
            </article>
          )}
          onScegli={({ indice }, scelta) => onRispondi(indice, scelta === 1 ? "si" : "no")}
          etichette={{ destra: t("si"), sinistra: t("no"), istruzioni: t("istruzioni") }}
          icone={{ destra: ICONE.spunta, sinistra: ICONE.croce }}
          centrale={{ etichetta: t("nonso"), icona: ICONE.forse, onClick: () => onRispondi(siNo[0].indice, "nonso") }}
        />
      ) : (
        aperta && (
          <form
            key={aperta.indice}
            className="scheda animate-comparsa p-6 shadow-sollevata"
            onSubmit={(e) => {
              e.preventDefault();
              onRispondi(aperta.indice, testo.trim());
              setTesto("");
            }}
          >
            <label htmlFor={idCampo} className="block font-titoli text-2xl leading-tight font-semibold [font-variation-settings:'SOFT'_100]">
              {frase(aperta.d)}
            </label>
            <textarea
              id={idCampo}
              className="campo mt-4 resize-y leading-relaxed"
              rows={3}
              maxLength={500}
              placeholder={t("segnaposto")}
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="pulsante-secondario flex-1"
                onClick={() => {
                  onRispondi(aperta.indice, "");
                  setTesto("");
                }}
              >
                {t("salta")}
              </button>
              <button type="submit" className="pulsante flex-1" disabled={!testo.trim()}>
                {daFare.length === 1 ? t("fine") : t("avanti")}
              </button>
            </div>
          </form>
        )
      )}

      <p className="mt-6 text-center">
        <button type="button" onClick={onSaltaTutto} className="text-sm font-medium text-tenue underline underline-offset-4 hover:text-inchiostro">
          {t("saltaTutto")}
        </button>
      </p>
    </section>
  );
}
