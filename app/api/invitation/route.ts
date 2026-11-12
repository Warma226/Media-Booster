import { NextResponse } from "next/server";
import { SESSION_COOKIE, createSession } from "@/lib/session";
import { accepterInvitation, appareilDe, invitationValide, ouvrirSession } from "@/lib/equipe";
import { ROLE_NOM } from "@/lib/roles";
import { lireEspace } from "@/lib/comptes";

export const dynamic = "force-dynamic";

// GET ?t=jeton → qui est invité ; POST { t, password } → compte activé et connecté.
export async function GET(req: Request) {
  const m = await invitationValide(new URL(req.url).searchParams.get("t") ?? "").catch(() => null);
  if (!m) return NextResponse.json({ error: "Ce lien d'invitation n'est plus valable. Demandez-en un nouveau à l'administration." }, { status: 404 });
  const espace = await lireEspace(m.espace_id).catch(() => null);
  return NextResponse.json({ nom: m.nom, contact: m.contact, role: m.role, roleNom: ROLE_NOM[m.role], expire: m.invitation_expire, espace: espace?.nom ?? "" });
}

export async function POST(req: Request) {
  try {
    const { t, password } = (await req.json().catch(() => ({}))) as { t?: string; password?: string };
    const m = await accepterInvitation(t ?? "", password ?? "");
    const sid = await ouvrirSession(m.id, m.espace_id, appareilDe(req.headers.get("user-agent") ?? ""));
    const s = await createSession(m.id, m.role, sid, m.espace_id);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, s.value, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: s.maxAge });
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
