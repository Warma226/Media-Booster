import { NextResponse } from "next/server";
import { db } from "@/lib/store";
import { verifierPaiement } from "@/lib/paiement";

export const dynamic = "force-dynamic";

// GET ?tx= → au retour de la page de paiement, vérifie tout de suite la transaction (si elle appartient à cet espace).
export async function GET(req: Request) {
  const tx = new URL(req.url).searchParams.get("tx") ?? "";
  const { data } = await db().from("paiements").select("id").eq("transaction_id", tx).maybeSingle();
  if (!data) return NextResponse.json({ error: "Transaction inconnue." }, { status: 404 });
  try {
    return NextResponse.json({ statut: await verifierPaiement(tx) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
