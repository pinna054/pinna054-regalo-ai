import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** Pagina "non trovata" per gli indirizzi che non esistono. */
export default async function NonTrovato() {
  const t = await getTranslations("nonTrovato");
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-16 text-center">
      <p className="font-titoli text-7xl font-semibold text-terracotta">404</p>
      <h1 className="mt-4 text-3xl font-semibold">{t("titolo")}</h1>
      <p className="mt-2 text-tenue">{t("testo")}</p>
      <Link href="/" className="pulsante mt-6">
        {t("azione")}
      </Link>
    </div>
  );
}
