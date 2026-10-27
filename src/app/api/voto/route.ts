/** POST /api/voto — salva 👍 / 👎 su un'idea (voto 0 = toglie il voto). */
import { NextResponse } from "next/server";
import { z } from "zod";
import { ipRichiesta } from "@/lib/ip";
import { controllaLimiteAzione } from "@/lib/limiti";
import { salvaVoto } from "@/lib/registro";

const SchemaVoto = z.object({
  idea_id: z.uuid(),
  voto: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});

export async function POST(request: Request) {
  const lettura = SchemaVoto.safeParse(await request.json().catch(() => null));
  if (!lettura.success) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    if (!(await controllaLimiteAzione("voto", ipRichiesta(request.headers), 300))) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }
    const { idea_id, voto } = lettura.data;
    await salvaVoto(idea_id, voto === 0 ? null : voto);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[voto] Salvataggio non riuscito", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
