import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Sceglie la lingua (dal browser o dalla scelta dell'utente) e aggiunge /it, /en, ... agli indirizzi.
export default createMiddleware(routing);

export const config = {
  // Vale per tutte le pagine tranne: API, area valutazione, file interni di Next.js e file con estensione.
  matcher: "/((?!api|valutazione|_next|_vercel|.*\\..*).*)",
};
