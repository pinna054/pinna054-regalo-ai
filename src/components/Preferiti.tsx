"use client";

/** I preferiti: le idee scorse a destra, con i link per comprarle. */
import { useLocale, useTranslations } from "next-intl";
import { ASPETTO_TIPOLOGIA } from "@/config/opzioni";
import { formattaFascia } from "@/lib/formato";
import { iconaIdea } from "@/lib/icone";
import { registraClick } from "@/lib/sessione";
import type { IdeaMostrata } from "@/motore/tipi-api";

type Props = {
  idee: { idea: IdeaMostrata; valuta: string }[];
  onTogli: (idea: IdeaMostrata) => void;
};

export function Preferiti({ idee, onTogli }: Props) {
  const t = useTranslations("idee");
  const lingua = useLocale();

  if (idee.length === 0) {
    return (
      <p className="mx-auto max-w-md rounded-3xl border border-dashed border-bordo px-6 py-10 text-center text-tenue">
        {t("preferitiVuoti")}
      </p>
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {idee.map(({ idea, valuta }) => (
        <li key={idea.id} className="scheda flex animate-comparsa flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <span
              className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl"
              style={{
                background: `linear-gradient(135deg, ${ASPETTO_TIPOLOGIA[idea.tipologia].da}, ${ASPETTO_TIPOLOGIA[idea.tipologia].a})`,
              }}
              aria-hidden="true"
            >
              {iconaIdea(idea.titolo, idea.tipologia)}
            </span>
            <h3 className="flex-1 text-xl leading-tight font-semibold">{idea.titolo}</h3>
            <button
              type="button"
              onClick={() => onTogli(idea)}
              aria-label={t("togli")}
              title={t("togli")}
              className="grid size-9 shrink-0 place-items-center rounded-full text-terracotta hover:bg-terracotta-chiaro"
            >
              <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M10 17.3 8.9 16.3C4.9 12.7 2.3 10.3 2.3 7.4A4.1 4.1 0 0 1 6.5 3.2c1.4 0 2.7.6 3.5 1.7a4.6 4.6 0 0 1 3.5-1.7 4.1 4.1 0 0 1 4.2 4.2c0 2.9-2.6 5.3-6.6 8.9L10 17.3Z"
                />
              </svg>
            </button>
          </div>
          <p className="mt-1 font-titoli text-lg font-semibold text-terracotta">
            {formattaFascia(idea.prezzo_min, idea.prezzo_max, valuta, lingua)}
          </p>
          <p className="mt-2 leading-relaxed text-tenue">{idea.descrizione}</p>
          {idea.attenzione && (
            <p className="mt-2 text-sm text-ocra">
              <strong className="font-semibold">{t("attenzione")}:</strong> {idea.attenzione}
            </p>
          )}
          <div className="mt-auto grid gap-2 pt-4 sm:grid-cols-2">
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
        </li>
      ))}
    </ul>
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
        <path
          fill="currentColor"
          d="M11 3a1 1 0 1 0 0 2h2.6l-6.3 6.3a1 1 0 1 0 1.4 1.4L15 6.4V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5ZM5 5a2 2 0 0 0-2 2v8c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 0 0 0-2H5Z"
        />
      </svg>
    </a>
  );
}
