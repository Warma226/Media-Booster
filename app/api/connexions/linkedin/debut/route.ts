import { NextResponse } from "next/server";
import { linkedinDisponible, nouvelEtat, urlConnexionLinkedin } from "@/lib/reseaux";

export const dynamic = "force-dynamic";

// GET → page officielle de connexion LinkedIn. Un jeton anti-falsification est gardé 10 min dans un cookie.
export async function GET(req: Request) {
  if (!linkedinDisponible()) return NextResponse.redirect(new URL("/connexions?erreur=linkedin-indisponible", req.url));
  const etat = nouvelEtat();
  const res = NextResponse.redirect(urlConnexionLinkedin(etat));
  res.cookies.set("mb_linkedin_etat", etat, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
