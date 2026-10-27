/**
 * Connessione al database Postgres di Supabase (solo lato server).
 *
 * Usa la stringa di connessione DATABASE_URL del "Transaction pooler" di Supabase
 * (Supabase → Connect → Transaction pooler), adatta a Vercel.
 */
import "server-only";
import postgres from "postgres";
import { urlDatabase } from "./ambiente";

// In sviluppo Next.js ricarica i file spesso: teniamo una sola connessione condivisa
const globale = globalThis as unknown as { connessioneDb?: postgres.Sql };

/** Restituisce la connessione al database, oppure null se DATABASE_URL non è impostata. */
export function db(): postgres.Sql | null {
  const url = urlDatabase();
  if (!url) return null;

  if (!globale.connessioneDb) {
    const locale = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);
    globale.connessioneDb = postgres(url, {
      prepare: false, // obbligatorio con il Transaction pooler di Supabase
      max: 3, // poche connessioni per ogni istanza del server
      idle_timeout: 20,
      connect_timeout: 10,
      // Supabase richiede connessioni cifrate; in locale no (salvo indicazioni nella stringa)
      ssl: url.includes("sslmode=") ? undefined : locale ? false : "require",
      onnotice: () => {},
    });
  }
  return globale.connessioneDb;
}
