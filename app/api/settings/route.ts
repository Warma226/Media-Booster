import { NextResponse } from "next/server";
import { getSettings, saveSettings, mergeSettings, isDemo, type Settings } from "@/lib/store";
import { connectionStatus } from "@/lib/publish";
import { aiProvider } from "@/lib/claude";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({
    settings,
    demo: isDemo(),
    ai: aiProvider() !== null,
    aiProvider: aiProvider(),
    connections: await connectionStatus(),
  });
}

// Bornes des réglages saisis par le client (marque, rubriques, thèmes).
const txt = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
function nettoyer(b: Partial<Settings>): Partial<Settings> {
  const out: Partial<Settings> = { ...b };
  if (b.marque) {
    const m = b.marque;
    out.marque = {
      nom: txt(m.nom, 60), court: txt(m.court, 8), site: txt(m.site, 120), facebook: txt(m.facebook, 200), description: txt(m.description, 160),
      public: txt(m.public, 120), ligne: txt(m.ligne, 800), devise: txt(m.devise, 8), ton: m.ton === "chaleureux" || m.ton === "dynamique" ? m.ton : "neutre",
    };
  }
  if (Array.isArray(b.rubriques)) {
    const ids = ["actu", "cyberbase", "portrait", "citation"];
    out.rubriques = b.rubriques.filter((r) => ids.includes(r?.id)).slice(0, 4).map((r) => ({
      id: r.id, nom: txt(r.nom, 40) ?? "", hashtag: txt(r.hashtag, 30) ?? "", description: txt(r.description, 200) ?? "",
      heure: typeof r.heure === "number" && r.heure >= 0 && r.heure <= 23 ? Math.round(r.heure) : null, active: Boolean(r.active),
    }));
  }
  if (Array.isArray(b.themes)) {
    out.themes = b.themes.slice(0, 30).map((th) => ({
      id: txt(th.id, 40) ?? "", label: txt(th.label, 40) ?? "", poids: Math.max(0, Math.min(40, Number(th.poids) || 0)),
      keywords: (Array.isArray(th.keywords) ? th.keywords : []).map((k) => txt(k, 60) ?? "").filter(Boolean).slice(0, 40),
    })).filter((th) => th.id && th.label);
  }
  return out;
}

export async function POST(req: Request) {
  const body = nettoyer((await req.json()) as Partial<Settings>);
  const current = await getSettings();
  const next: Settings = mergeSettings(current, body);
  return NextResponse.json({ settings: await saveSettings(next) });
}
