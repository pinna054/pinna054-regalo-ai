import { getTranslations } from "next-intl/server";
import { IllustrazioneRegalo } from "@/components/Illustrazioni";
import { ModuloRegalo } from "@/components/ModuloRegalo";

/** Home: breve spiegazione e modulo. */
export default async function Home() {
  const t = await getTranslations("home");
  const passi = ["uno", "due", "tre"] as const;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      {/* Presentazione */}
      <section className="grid items-center gap-6 pt-6 pb-8 sm:pt-12 md:grid-cols-[1.25fr_1fr] md:gap-10">
        <div className="animate-comparsa">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-terracotta-chiaro px-3 py-1 text-sm font-semibold text-terracotta-scuro">
            <span className="size-1.5 rounded-full bg-terracotta" aria-hidden="true" />
            {t("occhiello")}
          </p>
          <h1 className="text-[2.35rem] leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-[3.6rem]">
            {t("titolo")}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-tenue">{t("sottotitolo")}</p>
          <a href="#modulo" className="pulsante mt-7 md:hidden">
            {t("inizia")}
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
              <path fill="currentColor" d="M10 3a1 1 0 0 1 1 1v9.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.4L9 13.6V4a1 1 0 0 1 1-1Z" />
            </svg>
          </a>
        </div>
        <IllustrazioneRegalo className="mx-auto hidden w-full max-w-sm md:block" />
      </section>

      {/* Come funziona */}
      <ol className="mb-10 divide-y divide-bordo/70 rounded-2xl border border-bordo/80 bg-carta/70 sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {passi.map((passo, indice) => (
          <li key={passo} className="flex gap-3.5 px-4 py-3.5 sm:flex-col sm:gap-3 sm:p-5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-inchiostro font-titoli text-base font-semibold text-crema sm:size-9 sm:text-lg">
              {indice + 1}
            </span>
            <span>
              <span className="block font-titoli text-lg font-semibold">{t(`passi.${passo}.titolo`)}</span>
              <span className="mt-0.5 block text-[0.95rem] leading-snug text-tenue sm:mt-1 sm:text-base">{t(`passi.${passo}.testo`)}</span>
            </span>
          </li>
        ))}
      </ol>

      {/* Modulo */}
      <section id="modulo" className="mx-auto max-w-3xl scroll-mt-6">
        <ModuloRegalo />
      </section>
    </div>
  );
}
