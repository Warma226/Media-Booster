import { NextResponse } from "next/server";
import { identifiants } from "@/lib/reseaux";

export const dynamic = "force-dynamic";

// GET → catégories publiques du site WordPress (nom, adresse, nombre d'articles), pour choisir où publier.
export async function GET() {
  const base = (await identifiants()).WP.url;
  if (!base) return NextResponse.json({ error: "Aucun site WordPress relié (écran Connexions)." }, { status: 400 });
  const res = await fetch(`${base}/wp-json/wp/v2/categories?per_page=100&_fields=id,name,slug,count,parent`, { cache: "no-store" });
  if (!res.ok) return NextResponse.json({ error: `WordPress a répondu ${res.status}.` }, { status: 502 });
  return NextResponse.json({ categories: await res.json() });
}
