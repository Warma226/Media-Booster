import { NextResponse } from "next/server";
import { cmAimer, cmAnnuler, cmDiagnostic, cmEtat, cmMarquerTraite, cmMasquer, cmPassage, cmReformuler, cmRepondre, cmSauverReglages, type CmReglages } from "@/lib/cm";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// GET → état de l'assistante (réglages, à valider, déjà traité) ; ?diag=1 → ce que le jeton Facebook permet.
export async function GET(req: Request) {
  try {
    const diag = new URL(req.url).searchParams.get("diag") === "1";
    return NextResponse.json({ ...(await cmEtat()), ...(diag ? { diagnostic: await cmDiagnostic() } : {}) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST → { reglages } | { repondre, texte } | { aimer } | { masquer } | { reformuler, ton } | { traite } | { annuler } | { lancer }
export async function POST(req: Request) {
  try {
    const b = (await req.json().catch(() => ({}))) as {
      reglages?: Partial<CmReglages>; traite?: string; lancer?: boolean; annuler?: string;
      repondre?: string; texte?: string; aimer?: string; masquer?: string; reformuler?: string; ton?: string;
    };
    if (b.repondre) return NextResponse.json({ log: [await cmRepondre(b.repondre, b.texte ?? "")] });
    if (b.aimer) return NextResponse.json({ log: [await cmAimer(b.aimer)] });
    if (b.masquer) return NextResponse.json({ log: [await cmMasquer(b.masquer)] });
    if (b.reformuler) return NextResponse.json({ reponse: await cmReformuler(b.reformuler, b.ton ?? "chaleureux", b.texte) });
    if (b.annuler) return NextResponse.json({ log: [await cmAnnuler(b.annuler)] });
    if (b.reglages) {
      const r = b.reglages;
      return NextResponse.json({ reglages: await cmSauverReglages({ ...(typeof r.actif === "boolean" ? { actif: r.actif } : {}), ...(r.autonomie === "auto" || r.autonomie === "propose" ? { autonomie: r.autonomie } : {}) }) });
    }
    if (b.traite) { await cmMarquerTraite(b.traite); return NextResponse.json({ ok: true }); }
    if (b.lancer) return NextResponse.json({ log: await cmPassage({ force: true }) });
    return NextResponse.json({ error: "Requête inconnue." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
