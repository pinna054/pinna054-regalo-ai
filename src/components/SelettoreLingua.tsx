"use client";

/** Menu per cambiare lingua. Le lingue sono quelle dei file in /messages. */
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { nomeLingua } from "@/lib/formato";

export function SelettoreLingua() {
  const t = useTranslations("intestazione");
  const lingua = useLocale();
  const router = useRouter();
  const percorso = usePathname();

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t("lingua")}</span>
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-3 size-4 text-tenue" aria-hidden="true">
        <path
          fill="currentColor"
          d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm5.9 7.75h-2.92a13.3 13.3 0 0 0-1.15-4.9 7 7 0 0 1 4.07 4.9Zm-5.9 7.6c-.7-.8-1.7-2.86-1.97-6.1h3.94c-.27 3.24-1.27 5.3-1.97 6.1Zm-1.97-7.6c.27-3.24 1.27-5.3 1.97-6.1.7.8 1.7 2.86 1.97 6.1H8.03Zm.14-4.9a13.3 13.3 0 0 0-1.15 4.9H4.1a7 7 0 0 1 4.07-4.9ZM4.1 10.75h2.92c.1 1.84.5 3.53 1.15 4.9a7 7 0 0 1-4.07-4.9Zm7.73 4.9c.65-1.37 1.05-3.06 1.15-4.9h2.92a7 7 0 0 1-4.07 4.9Z"
        />
      </svg>
      <select
        value={lingua}
        onChange={(evento) => router.replace(percorso, { locale: evento.target.value })}
        className="min-h-10 cursor-pointer appearance-none rounded-full border border-bordo bg-carta/80 py-1.5 pr-8 pl-9 text-sm font-medium text-inchiostro transition hover:border-tenue/40"
      >
        {routing.locales.map((codice) => (
          <option key={codice} value={codice}>
            {nomeLingua(codice)}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-3 size-3.5 text-tenue" aria-hidden="true">
        <path fill="currentColor" d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
      </svg>
    </label>
  );
}
