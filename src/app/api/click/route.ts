/**
 * POST /api/click — conta i click sui link di ricerca.
 * Il browser lo chiama con navigator.sendBeacon mentre apre il negozio, senza attendere la risposta.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { ipRichiesta } from "@/lib/ip";
import { controllaLimiteAzione } from "@/lib/limiti";
import { registraClick } from "@/lib/registro";

const SchemaClick = z.object({
  idea_id: z.uuid(),
  negozio: z.enum(["amazon", "google"]),
});

export async function POST(request: Request) {
  let corpo: unknown = null;
  try {
    corpo = JSON.parse(await request.text());
  } catch {
    // corpo non valido: gestito sotto
  }
  const lettura = SchemaClick.safeParse(corpo);
  if (!lettura.success) return new NextResponse(null, { status: 400 });

  try {
    if (await controllaLimiteAzione("click", ipRichiesta(request.headers), 300)) {
      await registraClick(lettura.data.idea_id, lettura.data.negozio);
    }
  } catch (e) {
    console.error("[click] Registrazione non riuscita", e);
  }
  return new NextResponse(null, { status: 204 });
}
