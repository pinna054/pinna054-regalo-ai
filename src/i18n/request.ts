import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { routing } from "./routing";

type Messaggi = { [chiave: string]: string | Messaggi | unknown };

/** Unisce due oggetti di traduzioni: le chiavi di "lingua" prevalgono su quelle di "base". */
function unisci(base: Messaggi, lingua: Messaggi): Messaggi {
  const risultato: Messaggi = { ...base };
  for (const [chiave, valore] of Object.entries(lingua)) {
    const valoreBase = base[chiave];
    const sonoOggetti =
      valore && typeof valore === "object" && !Array.isArray(valore) &&
      valoreBase && typeof valoreBase === "object" && !Array.isArray(valoreBase);
    risultato[chiave] = sonoOggetti ? unisci(valoreBase as Messaggi, valore as Messaggi) : valore;
  }
  return risultato;
}

export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    const valore = await rootParams.locale();
    if (hasLocale(routing.locales, valore)) {
      locale = valore;
    } else {
      notFound();
    }
  }

  // Le frasi che mancano nella lingua scelta vengono prese dall'inglese:
  // così un file di traduzione incompleto non rompe il sito.
  const inglese = (await import("../../messages/en.json")).default as Messaggi;
  const traduzioni =
    locale === "en"
      ? inglese
      : unisci(inglese, (await import(`../../messages/${locale}.json`)).default as Messaggi);

  return { locale, messages: traduzioni as Record<string, never> };
});
