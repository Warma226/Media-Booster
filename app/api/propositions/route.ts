import { NextResponse } from "next/server";
import { getSettings } from "@/lib/store";
import { completerMarque, rubriquesActives } from "@/lib/marque";
import { aiConfigured } from "@/lib/claude";
import { allSources } from "@/lib/config";
import { proposerSuite } from "@/lib/propositions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST : propose sources, thèmes et règles de publication d'après la marque et les rubriques de l'espace.
// Rien n'est enregistré : l'écran /proposition montre la proposition et le client applique ce qu'il garde.
export async function POST() {
  if (!aiConfigured()) return NextResponse.json({ error: "La proposition automatique demande une clé d'IA dans Vercel (GEMINI_API_KEY)." }, { status: 503 });
  const s = await getSettings();
  const m = s.marque ?? {};
  if (!(m.ligne || m.description || m.public)) {
    return NextResponse.json({ error: "Décrivez d'abord votre média dans Ma marque (public visé, ligne éditoriale) : la proposition part de là." }, { status: 422 });
  }
  try {
    const proposition = await proposerSuite(completerMarque(m), rubriquesActives(s.rubriques), {
      themes: s.themes ?? [],
      domaines: allSources(s.customSources).map((x) => x.domain),
    });
    return NextResponse.json({ proposition });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
