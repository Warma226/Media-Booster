import { NextResponse } from "next/server";
import { SESSION_COOKIE, createSession } from "@/lib/session";
import { appareilDe, membreParContact, ouvrirSession, verifier } from "@/lib/equipe";

export const dynamic = "force-dynamic";

const pause = () => new Promise((r) => setTimeout(r, 800)); // freine les essais en série

// POST { email, password } → cookie de session (30 jours) sur l'espace du compte.
export async function POST(req: Request) {
  const { email, password } = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  if (!process.env.APP_SECRET) return NextResponse.json({ error: "Configuration incomplète : ajoute APP_SECRET dans Vercel." }, { status: 503 });
  if (!email?.trim() || !password) return NextResponse.json({ error: "Entrez votre e-mail et votre mot de passe." }, { status: 400 });
  const m = await membreParContact(email).catch(() => null);
  if (!m || m.statut !== "actif" || !verifier(password, m.mdp_hash)) {
    await pause();
    const msg = m?.statut === "suspendu" ? "Ce compte est suspendu. Contactez l'administrateur de votre espace." : m?.statut === "invite" ? "Ce compte n'est pas encore activé : ouvrez le lien d'invitation reçu." : "E-mail ou mot de passe incorrect.";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
  const sid = await ouvrirSession(m.id, m.espace_id, appareilDe(req.headers.get("user-agent") ?? ""));
  const session = await createSession(m.id, m.role, sid, m.espace_id);
  const res = NextResponse.json({ ok: true, role: m.role });
  res.cookies.set(SESSION_COOKIE, session.value, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: session.maxAge });
  return res;
}
