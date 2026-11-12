import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ecrireReseaux, terminerLinkedin } from "@/lib/reseaux";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// GET ?code&state → retour de LinkedIn : le compte est relié à l'espace du client connecté, puis retour à Connexions.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const retour = (q: string) => {
    const res = NextResponse.redirect(new URL(`/connexions?${q}`, req.url));
    res.cookies.set("mb_linkedin_etat", "", { path: "/", maxAge: 0 });
    return res;
  };
  const etat = (await cookies()).get("mb_linkedin_etat")?.value;
  if (url.searchParams.get("error")) return retour("erreur=linkedin-refus");
  if (!etat || etat !== url.searchParams.get("state")) return retour("erreur=linkedin-expire");
  const code = url.searchParams.get("code");
  if (!code) return retour("erreur=linkedin-refus");
  try {
    const compte = await terminerLinkedin(code);
    await ecrireReseaux({ linkedin: compte });
    return retour("ok=linkedin");
  } catch (e) {
    console.error("linkedin", e);
    return retour(`erreur=linkedin-echec&detail=${encodeURIComponent((e as Error).message.slice(0, 160))}`);
  }
}
