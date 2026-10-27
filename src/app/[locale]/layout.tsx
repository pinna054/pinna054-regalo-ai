import "@fontsource-variable/fraunces/soft.css";
import "@fontsource-variable/figtree";
import "../globals.css";
import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { SITO } from "@/config/sito";
import { routing } from "@/i18n/routing";
import { Intestazione } from "@/components/Intestazione";
import { PiePagina } from "@/components/PiePagina";

// Le pagine di ogni lingua vengono preparate in anticipo
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(props: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const indirizzo = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return {
    metadataBase: new URL(indirizzo ? `https://${indirizzo}` : "http://localhost:3000"),
    title: t("titolo", { sito: SITO.nome }),
    description: t("descrizione"),
    openGraph: {
      title: t("titolo", { sito: SITO.nome }),
      description: t("descrizione"),
      siteName: SITO.nome,
      locale,
      type: "website",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#fbf6ef",
};

export default async function LayoutLingua({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Al browser mandiamo tutte le traduzioni tranne il lungo testo della privacy (resta sul server)
  const traduzioniBrowser = Object.fromEntries(
    Object.entries(await getMessages()).filter(([sezione]) => sezione !== "privacy"),
  );

  return (
    <html lang={locale}>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider messages={traduzioniBrowser}>
          <Intestazione />
          <main className="flex-1">{children}</main>
          <PiePagina />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
