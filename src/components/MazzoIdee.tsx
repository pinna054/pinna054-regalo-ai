"use client";

/**
 * Le idee una alla volta: scorri a destra (♥) se ti piace, a sinistra (✕) se no.
 * Le idee piaciute finiscono nei preferiti.
 */
import { useLocale, useTranslations } from "next-intl";
import { CHIAVE_TIPOLOGIA } from "@/config/opzioni";
import { formattaFascia } from "@/lib/formato";
import type { IdeaMostrata } from "@/motore/tipi-api";
import { ICONE, MazzoScorrevole } from "./MazzoScorrevole";

type Elemento = { idea: IdeaMostrata; valuta: string };

type Props = {
  /** Idee ancora da scegliere: la prima è quella in cima */
  idee: Elemento[];
  onScegli: (idea: IdeaMostrata, voto: 1 | -1) => void;
  onAnnulla: (() => void) | null;
};

export function MazzoIdee({ idee, onScegli, onAnnulla }: Props) {
  const t = useTranslations("idee");
  return (
    <MazzoScorrevole
      elementi={idee}
      chiave={(e) => e.idea.id}
      disegna={(e) => <Carta idea={e.idea} valuta={e.valuta} />}
      onScegli={(e, scelta) => onScegli(e.idea, scelta)}
      etichette={{ destra: t("piace"), sinistra: t("scarta"), istruzioni: t("istruzioni") }}
      icone={{ destra: ICONE.cuore, sinistra: ICONE.croce }}
      centrale={{ etichetta: t("annulla"), icona: ICONE.annulla, onClick: () => onAnnulla?.(), disabilitato: !onAnnulla }}
    />
  );
}

/** La carta di un'idea. */
function Carta({ idea, valuta }: Elemento) {
  const t = useTranslations("idee");
  const tOpzioni = useTranslations("opzioni");
  const lingua = useLocale();
  const originale = idea.tipo === "originale";

  return (
    <article className="scheda overflow-hidden p-6 shadow-sollevata">
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

      <h3 className="mt-4 text-[1.75rem] leading-tight font-semibold">{idea.titolo}</h3>
      <p className="mt-2 font-titoli text-2xl font-semibold text-terracotta">
        {formattaFascia(idea.prezzo_min, idea.prezzo_max, valuta, lingua)}
      </p>
      <p className="mt-3 leading-relaxed">{idea.descrizione}</p>

      <div className="mt-4 rounded-2xl bg-sabbia/70 px-4 py-3">
        <p className="text-sm font-semibold text-tenue">{t("perche")}</p>
        <p className="mt-1 leading-relaxed">{idea.perche}</p>
      </div>

      {idea.attenzione && (
        <p className="mt-3 rounded-2xl bg-ocra-chiaro/70 px-4 py-2.5 text-sm leading-snug text-ocra">
          <strong className="font-semibold">{t("attenzione")}:</strong> {idea.attenzione}
        </p>
      )}
    </article>
  );
}
