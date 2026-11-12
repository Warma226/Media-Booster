import { NextResponse } from "next/server";
import { isDemo } from "@/lib/store";
import { reactionsRecentes } from "@/lib/reactions";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// GET : réactions du moment des posts publiés ces 14 derniers jours (l'écran /reactions interroge toutes les 30 s).
export async function GET() {
  if (isDemo()) return NextResponse.json({ posts: [], facebook: false, linkedin: false, at: new Date().toISOString() });
  try {
    return NextResponse.json({ ...(await reactionsRecentes()), at: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
