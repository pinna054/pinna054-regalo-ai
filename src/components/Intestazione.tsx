import { getTranslations } from "next-intl/server";
import { SITO } from "@/config/sito";
import { Link } from "@/i18n/navigation";
import { Marchio } from "./Illustrazioni";
import { SelettoreLingua } from "./SelettoreLingua";

/** Barra in alto: nome del sito e scelta della lingua. */
export async function Intestazione() {
  const t = await getTranslations("intestazione");
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 pt-5 pb-2 sm:px-6">
      <Link
        href="/"
        className="group inline-flex items-center gap-2.5 rounded-xl"
        aria-label={t("home", { sito: SITO.nome })}
      >
        <Marchio className="size-9 transition-transform group-hover:-rotate-6" />
        <span className="font-titoli text-[1.4rem] font-semibold tracking-tight [font-variation-settings:'SOFT'_100]">
          {SITO.nome}
        </span>
      </Link>
      <SelettoreLingua />
    </header>
  );
}
