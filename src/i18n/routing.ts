import { defineRouting } from "next-intl/routing";

// Elenco delle lingue: viene dai file in /messages (vedi next.config.ts).
export const LINGUE = (process.env.LINGUE_DISPONIBILI || "en,it").split(",");

// Lingua usata quando il browser chiede una lingua che il sito non ha.
export const LINGUA_PREDEFINITA = LINGUE.includes("en") ? "en" : LINGUE[0];

export const routing = defineRouting({
  locales: LINGUE,
  defaultLocale: LINGUA_PREDEFINITA,
});
