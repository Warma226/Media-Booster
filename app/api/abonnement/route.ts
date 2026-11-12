import { NextResponse } from "next/server";
import { db } from "@/lib/store";
import { moi } from "@/lib/equipe";
import { lireEspace } from "@/lib/comptes";
import { demarrerPaiement, historiquePaiements, paiementDisponible } from "@/lib/paiement";
import { FORMULES, accesOuvert, type Formule } from "@/lib/abonnement";

export const dynamic = "force-dynamic";

// GET → état de l'abonnement de l'espace, formules, derniers paiements.
export async function GET() {
  try {
    const m = await moi();
    const e = await lireEspace(m.espace);
    return NextResponse.json({
      espace: e ? { nom: e.nom, formule: e.formule, statut: e.statut, essai_fin: e.essai_fin, payee_jusqu: e.payee_jusqu, acces: accesOuvert(e) } : null,
      formules: Object.values(FORMULES),
      paiements: m.role === "admin" ? await historiquePaiements() : [],
      paiementDisponible: paiementDisponible(),
      peutPayer: m.role === "admin",
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST { formule } → adresse de la page de paiement CinetPay (administrateur de l'espace seulement).
export async function POST(req: Request) {
  try {
    const m = await moi();
    if (m.role !== "admin") return NextResponse.json({ error: "Seul l'administrateur de l'espace peut payer l'abonnement." }, { status: 403 });
    const { formule } = (await req.json().catch(() => ({}))) as { formule?: Formule };
    if (!formule || !FORMULES[formule]) return NextResponse.json({ error: "Choisissez une formule." }, { status: 400 });
    const { data } = await db().from("membres").select("nom,contact").eq("id", m.uid).maybeSingle();
    const url = await demarrerPaiement(formule, { nom: (data?.nom as string) ?? "", email: (data?.contact as string) ?? "" });
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
