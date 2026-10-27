import { getTranslations } from "next-intl/server";
import { SITO } from "@/config/sito";
import { Link } from "@/i18n/navigation";

/** Piè di pagina: avvertenza sull'AI e link alla privacy. */
export async function PiePagina() {
  const t = await getTranslations("piede");
  return (
    <footer className="mx-auto mt-16 w-full max-w-5xl px-4 pb-10 sm:px-6">
      <div className="border-t border-bordo pt-6 text-sm leading-relaxed text-tenue">
        <p className="max-w-2xl">{t("avvertenza")}</p>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-titoli font-semibold text-inchiostro">{SITO.nome}</span>
          <Link href="/privacy" className="underline decoration-bordo underline-offset-4 hover:text-inchiostro">
            {t("privacy")}
          </Link>
          <span>{t("cookie")}</span>
        </p>
      </div>
    </footer>
  );
}
