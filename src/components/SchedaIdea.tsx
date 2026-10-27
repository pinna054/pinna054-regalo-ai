"use client";

/** Scheda di una singola idea regalo, con i link di ricerca e 👍 / 👎. */
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { CHIAVE_TIPOLOGIA } from "@/config/opzioni";
import { formattaFascia } from "@/lib/formato";
import { registraClick } from "@/lib/sessione";
import type { IdeaMostrata } from "@/motore/tipi-api";

type Props = {
  idea: IdeaMostrata;
  valuta: string;
  voto: 1 | -1 | undefined;
  onVota: (voto: 1 | -1) => void;
  /** Posizione nella griglia, per far comparire le schede una dopo l'altra */
  ordine?: number;
};

export function SchedaIdea({ idea, valuta, voto, onVota, ordine = 0 }: Props) {
  const t = useTranslations("idee");
  const tOpzioni = useTranslations("opzioni");
  const lingua = useLocale();
  const [ringraziato, setRingraziato] = useState(false);

  const originale = idea.tipo === "originale";

  function vota(valore: 1 | -1) {
    onVota(valore);
    setRingraziato(voto !== valore);
  }

  return (
    <article
      className="scheda flex animate-comparsa flex-col p-5 sm:p-6"
      style={{ animationDelay: `${ordine * 90}ms` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${
            originale ? "bg-terracotta-chiaro text-terracotta-scuro" : "bg-salvia-chiaro text-salvia"
          }`}
        >
          <span aria-hidden="true">{originale ? "✦" : "●"}</span>
          {tOpzioni(`tipo.${idea.tipo}`)}
        </span>
        <span className="text-xs font-semibold tracking-wide text-tenue uppercase">
          {tOpzioni(`tipologia.${CHIAVE_TIPOLOGIA[idea.tipologia]}`)}
        </span>
      </div>

      <h3 className="mt-3 text-[1.45rem] leading-tight font-semibold">{idea.titolo}</h3>
      <p className="mt-2 leading-relaxed">{idea.descrizione}</p>

      <div className="mt-4 rounded-2xl bg-sabbia/70 px-4 py-3">
        <p className="text-sm font-semibold text-tenue">{t("perche")}</p>
        <p className="mt-1 leading-relaxed">{idea.perche}</p>
      </div>

      {idea.attenzione && (
        <p className="mt-3 flex gap-2 rounded-2xl bg-ocra-chiaro/70 px-4 py-2.5 text-sm leading-snug text-ocra">
          <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" aria-hidden="true">
            <path fill="currentColor" d="M8.3 3.2a2 2 0 0 1 3.4 0l6.1 10.6A2 2 0 0 1 16.1 17H3.9a2 2 0 0 1-1.7-3.2L8.3 3.2ZM9.1 7v4.4h1.8V7H9.1Zm.9 7.6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
          </svg>
          <span>
            <strong className="font-semibold">{t("attenzione")}:</strong> {idea.attenzione}
          </span>
        </p>
      )}

      <div className="mt-auto pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-tenue">{t("prezzo")}</span>
          <span className="font-titoli text-xl font-semibold whitespace-nowrap">
            {formattaFascia(idea.prezzo_min, idea.prezzo_max, valuta, lingua)}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <LinkNegozio
            href={idea.link_amazon}
            affiliato={idea.affiliato}
            onApri={() => registraClick(idea.id, "amazon")}
          >
            {t("cercaAmazon")}
          </LinkNegozio>
          <LinkNegozio href={idea.link_google} affiliato={false} onApri={() => registraClick(idea.id, "google")}>
            {t("cercaGoogle")}
          </LinkNegozio>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-bordo pt-3">
          <span className="text-sm text-tenue" aria-live="polite">
            {ringraziato && voto ? t("grazie") : t("tiPiace")}
          </span>
          <div className="flex gap-1.5">
            <PulsanteVoto attivo={voto === 1} etichetta={t("votoSu")} onClick={() => vota(1)}>
              👍
            </PulsanteVoto>
            <PulsanteVoto attivo={voto === -1} etichetta={t("votoGiu")} onClick={() => vota(-1)}>
              👎
            </PulsanteVoto>
          </div>
        </div>
      </div>
    </article>
  );
}

function LinkNegozio({
  href,
  affiliato,
  onApri,
  children,
}: {
  href: string;
  affiliato: boolean;
  onApri: () => void;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      // "sponsored" segnala ai motori di ricerca i link di affiliazione
      rel={affiliato ? "sponsored nofollow noopener" : "nofollow noopener"}
      onClick={onApri}
      onAuxClick={(e) => e.button === 1 && onApri()}
      className="pulsante-secondario w-full text-center"
    >
      {children}
      <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-tenue" aria-hidden="true">
        <path fill="currentColor" d="M11 3a1 1 0 1 0 0 2h2.6l-6.3 6.3a1 1 0 1 0 1.4 1.4L15 6.4V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5ZM5 5a2 2 0 0 0-2 2v8c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 0 0 0-2H5Z" />
      </svg>
    </a>
  );
}

function PulsanteVoto({
  attivo,
  etichetta,
  onClick,
  children,
}: {
  attivo: boolean;
  etichetta: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={attivo}
      aria-label={etichetta}
      title={etichetta}
      className={`grid size-11 place-items-center rounded-full border text-lg transition active:scale-95 ${
        attivo
          ? "border-terracotta bg-terracotta-chiaro"
          : "border-bordo bg-white grayscale-[35%] hover:border-tenue/40 hover:grayscale-0"
      }`}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
