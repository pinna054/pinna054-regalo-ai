import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Risultati } from "@/components/Risultati";
import { SITO } from "@/config/sito";

export async function generateMetadata(props: PageProps<"/[locale]/idee">): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("titoloIdee", { sito: SITO.nome }),
    // pagina personale: non va nei motori di ricerca
    robots: { index: false, follow: false },
  };
}

/** Pagina dei risultati (il contenuto è nel browser: vedi components/Risultati.tsx). */
export default function PaginaIdee() {
  return <Risultati />;
}
