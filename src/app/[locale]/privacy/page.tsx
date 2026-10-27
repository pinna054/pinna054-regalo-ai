import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITO } from "@/config/sito";

export async function generateMetadata(props: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("titoloPrivacy", { sito: SITO.nome }) };
}

// Sezioni dell'informativa, nell'ordine in cui compaiono (testi in messages/xx.json → "privacy")
const SEZIONI_CON_TESTO = ["fornitori", "conservazione", "cookie", "affiliazione", "diritti", "minori", "extraUe", "modifiche"] as const;
const PUNTI_DATI = ["1", "2", "3", "4", "5"] as const;
const PUNTI_FINALITA = ["1", "2", "3"] as const;
const PUNTI_VERIFICARE = ["1", "2", "3", "4", "5", "6", "7"] as const;

/** Informativa privacy (BOZZA da far verificare). */
export default async function PaginaPrivacy() {
  const t = await getTranslations("privacy");
  const valori = {
    sito: SITO.nome,
    titolare: SITO.titolare,
    email: SITO.emailPrivacy,
    mesi: SITO.mesiConservazione,
  };

  return (
    <article className="mx-auto w-full max-w-3xl px-4 pt-8 sm:px-6 sm:pt-12">
      <p className="rounded-2xl border-2 border-dashed border-ocra/50 bg-ocra-chiaro px-4 py-3 font-semibold text-ocra">
        {t("bozza")}
      </p>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">{t("titolo")}</h1>
      <p className="mt-4 text-lg leading-relaxed text-tenue">{t("intro", valori)}</p>

      <Sezione titolo={t("sezioni.titolare.titolo")}>
        <p>{t("sezioni.titolare.testo", valori)}</p>
      </Sezione>

      <Sezione titolo={t("sezioni.dati.titolo")}>
        <ul className="list-disc space-y-2 pl-5">
          {PUNTI_DATI.map((n) => (
            <li key={n}>{t(`sezioni.dati.punti.${n}`)}</li>
          ))}
        </ul>
      </Sezione>

      <Sezione titolo={t("sezioni.finalita.titolo")}>
        <ul className="list-disc space-y-2 pl-5">
          {PUNTI_FINALITA.map((n) => (
            <li key={n}>{t(`sezioni.finalita.punti.${n}`)}</li>
          ))}
        </ul>
      </Sezione>

      {SEZIONI_CON_TESTO.map((sezione) => (
        <Sezione key={sezione} titolo={t(`sezioni.${sezione}.titolo`)}>
          <p>{t(`sezioni.${sezione}.testo`, valori)}</p>
        </Sezione>
      ))}

      <aside className="mt-12 rounded-3xl border border-bordo bg-sabbia/60 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">{t("verificare.titolo")}</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[0.95rem] leading-relaxed">
          {PUNTI_VERIFICARE.map((n) => (
            <li key={n}>{t(`verificare.punti.${n}`)}</li>
          ))}
        </ol>
      </aside>
    </article>
  );
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-2xl font-semibold">{titolo}</h2>
      <div className="mt-2 space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}
