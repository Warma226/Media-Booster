import { NextResponse } from "next/server";
import { dbGlobal } from "@/lib/store";
import { moi } from "@/lib/equipe";
import { prolonger } from "@/lib/paiement";
import { FORMULES, accesOuvert, type Espace, type Formule } from "@/lib/abonnement";

export const dynamic = "force-dynamic";

// Administration de la plateforme (propriétaire de Media Booster) : tous les espaces clients, abonnements et paiements.
// Accès réservé aux e-mails listés dans PLATEFORME_ADMINS (séparés par des virgules).
async function autorise(): Promise<boolean> {
  const admins = (process.env.PLATEFORME_ADMINS ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!admins.length) return false;
  const m = await moi().catch(() => null);
  if (!m) return false;
  const { data } = await dbGlobal().from("membres").select("contact").eq("id", m.uid).eq("espace_id", m.espace).maybeSingle();
  return admins.includes(String(data?.contact ?? "").toLowerCase());
}

export async function GET() {
  if (!(await autorise())) return NextResponse.json({ error: "Réservé à l'administration de Media Booster." }, { status: 403 });
  const g = dbGlobal();
  const [{ data: espaces }, { data: membres }, { data: paiements }] = await Promise.all([
    g.from("espaces").select("id,nom,created_at,formule,statut,essai_fin,payee_jusqu").order("created_at", { ascending: false }).limit(1000),
    g.from("membres").select("espace_id,contact,role,derniere_connexion").limit(10000),
    g.from("paiements").select("espace_id,montant,statut,created_at").eq("statut", "accepte").limit(10000),
  ]);
  const liste = ((espaces ?? []) as Espace[]).map((e) => {
    const ms = (membres ?? []).filter((m) => m.espace_id === e.id);
    const ps = (paiements ?? []).filter((p) => p.espace_id === e.id);
    return {
      ...e, acces: accesOuvert(e),
      proprietaire: ms.find((m) => m.role === "admin")?.contact ?? "",
      membres: ms.length,
      derniereConnexion: ms.map((m) => m.derniere_connexion).filter(Boolean).sort().pop() ?? null,
      encaisse: ps.reduce((s, p) => s + (p.montant as number), 0),
    };
  });
  const mois = new Date(); mois.setUTCDate(1); mois.setUTCHours(0, 0, 0, 0);
  return NextResponse.json({
    espaces: liste,
    totaux: {
      clients: liste.length,
      actifs: liste.filter((e) => e.acces).length,
      payants: liste.filter((e) => e.payee_jusqu && new Date(e.payee_jusqu).getTime() > Date.now()).length,
      encaisseMois: (paiements ?? []).filter((p) => new Date(p.created_at as string) >= mois).reduce((s, p) => s + (p.montant as number), 0),
    },
  });
}

// POST { action: "prolonger", espace, jours, formule } | { action: "suspendre" | "reactiver", espace }
export async function POST(req: Request) {
  if (!(await autorise())) return NextResponse.json({ error: "Réservé à l'administration de Media Booster." }, { status: 403 });
  try {
    const b = (await req.json().catch(() => ({}))) as { action?: string; espace?: string; jours?: number; formule?: Formule };
    if (!b.espace) throw new Error("Espace manquant.");
    if (b.action === "prolonger") await prolonger(b.espace, b.formule && FORMULES[b.formule] ? b.formule : "demarrage", Math.max(1, Math.min(366, Number(b.jours) || 30)));
    else if (b.action === "suspendre" || b.action === "reactiver") {
      const { error } = await dbGlobal().from("espaces").update({ statut: b.action === "suspendre" ? "suspendu" : "actif" }).eq("id", b.espace);
      if (error) throw new Error(error.message);
    } else throw new Error("Action inconnue.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
