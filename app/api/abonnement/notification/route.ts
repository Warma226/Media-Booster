import { NextResponse } from "next/server";
import { verifierPaiement } from "@/lib/paiement";

export const dynamic = "force-dynamic";

// Notification de CinetPay (sans session). Elle ne prouve rien par elle-même : le statut est toujours
// revérifié auprès de CinetPay avant d'ouvrir l'accès. GET : simple test de disponibilité par CinetPay.
export async function GET() {
  return new NextResponse("ok", { status: 200 });
}

export async function POST(req: Request) {
  try {
    const type = req.headers.get("content-type") ?? "";
    let tx = "";
    if (type.includes("application/json")) tx = String(((await req.json().catch(() => ({}))) as { cpm_trans_id?: string }).cpm_trans_id ?? "");
    else tx = String((await req.formData().catch(() => null))?.get("cpm_trans_id") ?? "");
    if (tx && /^MB[A-Z0-9]{6,30}$/.test(tx)) await verifierPaiement(tx);
  } catch (e) {
    console.error("notification CinetPay", e);
  }
  return new NextResponse("ok", { status: 200 }); // toujours 200 : CinetPay renverra sinon la notification
}
