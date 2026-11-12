import { NextResponse } from "next/server";
import { SESSION_COOKIE, createSession } from "@/lib/session";
import { appareilDe, ouvrirSession } from "@/lib/equipe";
import { inscrire } from "@/lib/comptes";

export const dynamic = "force-dynamic";

// POST { media, nom, email, password } → espace créé (24 h d'essai), compte propriétaire connecté.
export async function POST(req: Request) {
  try {
    if (!process.env.APP_SECRET) return NextResponse.json({ error: "Configuration incomplète : ajoute APP_SECRET dans Vercel." }, { status: 503 });
    const b = (await req.json().catch(() => ({}))) as { media?: string; nom?: string; email?: string; password?: string };
    const { espace, membreId } = await inscrire({ media: b.media ?? "", nom: b.nom ?? "", email: b.email ?? "", motDePasse: b.password ?? "" });
    const sid = await ouvrirSession(membreId, espace.id, appareilDe(req.headers.get("user-agent") ?? ""));
    const s = await createSession(membreId, "admin", sid, espace.id);
    const res = NextResponse.json({ ok: true, essai_fin: espace.essai_fin });
    res.cookies.set(SESSION_COOKIE, s.value, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: s.maxAge });
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
