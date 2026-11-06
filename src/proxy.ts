import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

// Sceglie la lingua (dal browser o dalla scelta dell'utente) e aggiunge /it, /en, ... agli indirizzi.
const lingue = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  // La pagina principale è Gifty (public/gifty.html): l'indirizzo resta "/".
  // La versione precedente del sito resta raggiungibile su /it e /en.
  if (request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/gifty.html", request.url));
  }
  return lingue(request);
}

export const config = {
  // Vale per tutte le pagine tranne: API, area valutazione, file interni di Next.js e file con estensione.
  matcher: "/((?!api|valutazione|_next|_vercel|.*\\..*).*)",
};
