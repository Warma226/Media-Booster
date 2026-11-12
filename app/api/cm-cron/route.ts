import { NextResponse } from "next/server";
import { cmPassage } from "@/lib/cm";
import { avecEspace } from "@/lib/espace";
import { espacesActifs } from "@/lib/comptes";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Appelé toutes les 15 min par Supabase pg_cron : passage de l'agent community manager.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const bilan: { espace: string; ok: boolean; log?: unknown; error?: string }[] = [];
  const debut = Date.now();
  for (const e of await espacesActifs()) {
    if (Date.now() - debut > 240_000) break; // le reste passera dans 15 minutes
    try {
      bilan.push({ espace: e.id, ok: true, log: await avecEspace(e.id, () => cmPassage()) });
    } catch (err) {
      console.error("cm-cron", e.id, err);
      bilan.push({ espace: e.id, ok: false, error: (err as Error).message });
    }
  }
  return NextResponse.json({ ok: bilan.every((b) => b.ok), bilan });
}
