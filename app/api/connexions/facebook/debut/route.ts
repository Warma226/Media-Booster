import { NextResponse } from "next/server";
import { facebookDisponible, nouvelEtat, urlConnexionFacebook } from "@/lib/reseaux";

export const dynamic = "force-dynamic";

// GET → page officielle de connexion Facebook. Un jeton anti-falsification est gardé 10 min dans un cookie.
export async function GET(req: Request) {
  if (!facebookDisponible()) return NextResponse.redirect(new URL("/connexions?erreur=facebook-indisponible", req.url));
  const etat = nouvelEtat();
  const res = NextResponse.redirect(urlConnexionFacebook(etat));
  res.cookies.set("mb_facebook_etat", etat, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
