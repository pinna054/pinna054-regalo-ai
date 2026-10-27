/** Indirizzo IP della richiesta, usato SOLO in forma di hash per i limiti di richieste. */
import "server-only";
import { createHmac } from "node:crypto";
import { segretoHashIp } from "./ambiente";

/** IP del visitatore (su Vercel arriva nelle intestazioni x-real-ip / x-forwarded-for). */
export function ipRichiesta(intestazioni: Headers): string {
  return (
    intestazioni.get("x-real-ip")?.trim() ||
    intestazioni.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "sconosciuto"
  );
}

/** Trasforma l'IP in un codice non reversibile: l'IP vero non viene mai salvato. */
export function hashIp(ip: string): string {
  return createHmac("sha256", segretoHashIp()).update(ip).digest("hex").slice(0, 32);
}
