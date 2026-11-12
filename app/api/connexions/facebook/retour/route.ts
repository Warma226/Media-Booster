import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ecrireReseaux, terminerFacebook } from "@/lib/reseaux";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// GET ?code&state → retour de Facebook : le compte est relié à l'espace du client connecté, puis retour à Connexions.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const retour = (q: string) => {
    const res = NextResponse.redirect(new URL(`/connexions?${q}`, req.url));
    res.cookies.set("mb_facebook_etat", "", { path: "/", maxAge: 0 });
    return res;
  };
  const etat = (await cookies()).get("mb_facebook_etat")?.value;
  if (url.searchParams.get("error")) return retour("erreur=facebook-refus");
  if (!etat || etat !== url.searchParams.get("state")) return retour("erreur=facebook-expire");
  const code = url.searchParams.get("code");
  if (!code) return retour("erreur=facebook-refus");
  try {
    const compte = await terminerFacebook(code);
    await ecrireReseaux({ facebook: compte });
    return retour("ok=facebook");
  } catch (e) {
    console.error("facebook", e);
    return retour(`erreur=facebook-echec&detail=${encodeURIComponent((e as Error).message.slice(0, 160))}`);
  }
}
