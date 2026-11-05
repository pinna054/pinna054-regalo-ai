/**
 * POST /api/domande — prepara le domande del quiz (sì/no da scorrere e qualche domanda aperta)
 * a partire dai dati del modulo. Le domande contengono il segnaposto {nome}.
 */
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { effortMotore, modelloMotore, motoreFinto } from "@/lib/ambiente";
import { ipRichiesta } from "@/lib/ip";
import { controllaLimitiGenerazione } from "@/lib/limiti";
import { generaDomande } from "@/motore/domande";
import { chiamaDomandeFinte } from "@/motore/finto";
import { preparaRichiesta, SchemaRichiestaApi } from "@/motore/richiesta";
import type { CodiceErroreApi, RispostaDomande } from "@/motore/tipi-api";

export const maxDuration = 120;

function errore(stato: number, codice: CodiceErroreApi) {
  return NextResponse.json<RispostaDomande>({ ok: false, errore: codice }, { status: stato });
}

export async function POST(request: Request) {
  const lettura = SchemaRichiestaApi.safeParse(await request.json().catch(() => null));
  if (!lettura.success) return errore(400, "dati");
  const lingua = routing.locales.includes(lettura.data.lingua) ? lettura.data.lingua : routing.defaultLocale;

  const finto = motoreFinto();
  if (!finto && !process.env.ANTHROPIC_API_KEY) return errore(503, "configurazione");

  try {
    const limite = await controllaLimitiGenerazione(ipRichiesta(request.headers), "domande");
    if (limite !== "ok") return errore(429, limite);
  } catch (e) {
    console.error("[domande] Controllo dei limiti non riuscito", e);
    return errore(503, "motore");
  }

  const richiesta = preparaRichiesta({ ...lettura.data, lingua });
  const risultato = await generaDomande(richiesta, {
    modello: modelloMotore(),
    effort: finto ? null : effortMotore(),
    chiamaModello: finto ? chiamaDomandeFinte : undefined,
  });
  if (!risultato.domande) {
    console.error(`[domande] Errore: ${risultato.codiceErrore}`);
    return errore(risultato.codiceErrore === "configurazione" ? 503 : 502, risultato.codiceErrore === "rifiuto" ? "rifiuto" : "motore");
  }
  return NextResponse.json<RispostaDomande>({ ok: true, domande: risultato.domande });
}
