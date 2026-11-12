// Paiement des abonnements par CinetPay (mobile money et carte).
// Déroulé : l'app crée la transaction → le client paie sur la page CinetPay → CinetPay prévient l'app (notification)
// → l'app VÉRIFIE toujours le statut auprès de CinetPay avant d'ouvrir l'accès (la notification seule ne prouve rien).
// Clés de la plateforme : CINETPAY_API_KEY et CINETPAY_SITE_ID (compte marchand Media Booster), CINETPAY_DEVISE (XOF par défaut).
import { db, dbGlobal } from "./store";
import { espaceId } from "./espace";
import { appUrl } from "./sign";
import { DUREE_JOURS, FORMULES, type Formule } from "./abonnement";

const API = "https://api-checkout.cinetpay.com/v2";
export const paiementDisponible = () => Boolean(process.env.CINETPAY_API_KEY && process.env.CINETPAY_SITE_ID);
const devise = () => (process.env.CINETPAY_DEVISE || "XOF").toUpperCase();

export type Paiement = { id: string; created_at: string; transaction_id: string; formule: Formule; montant: number; statut: "en_attente" | "accepte" | "refuse"; detail: Record<string, unknown> };

/** Crée la transaction et renvoie l'adresse de la page de paiement CinetPay. */
export async function demarrerPaiement(formule: Formule, client: { nom: string; email: string }): Promise<string> {
  if (!paiementDisponible()) throw new Error("Le paiement en ligne n'est pas encore activé. Réessayez plus tard.");
  const f = FORMULES[formule];
  if (!f) throw new Error("Formule inconnue.");
  const montant = Math.ceil(f.prix / 5) * 5; // CinetPay exige un multiple de 5
  const e = await espaceId();
  const transaction_id = `MB${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const { error } = await db().from("paiements").insert({ transaction_id, formule, montant, statut: "en_attente" });
  if (error) throw new Error(error.message);
  const [prenom, ...reste] = client.nom.trim().split(/\s+/);
  const r = await fetch(`${API}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id,
      amount: montant,
      currency: devise(),
      description: `Abonnement Media Booster ${f.nom} 30 jours`,
      notify_url: `${appUrl()}/api/abonnement/notification`,
      return_url: `${appUrl()}/abonnement?retour=${transaction_id}`,
      channels: "ALL",
      lang: "fr",
      metadata: e,
      customer_name: prenom || "Client",
      customer_surname: reste.join(" ") || prenom || "Media Booster",
      customer_email: client.email,
    }),
    signal: AbortSignal.timeout(20000),
  });
  const j = (await r.json().catch(() => ({}))) as { code?: string; description?: string; message?: string; data?: { payment_url?: string } };
  if (j.code !== "201" || !j.data?.payment_url) {
    await db().from("paiements").update({ statut: "refuse", detail: { erreur: j.description ?? j.message ?? r.status } }).eq("transaction_id", transaction_id);
    throw new Error(`CinetPay : ${j.description ?? j.message ?? `erreur ${r.status}`}`);
  }
  return j.data.payment_url;
}

/**
 * Vérifie une transaction auprès de CinetPay et, si elle est acceptée, prolonge l'accès de l'espace de 30 jours.
 * Sans session (appelée par la notification) : retrouve l'espace par la transaction. Idempotente.
 */
export async function verifierPaiement(transaction_id: string): Promise<Paiement["statut"]> {
  const g = dbGlobal();
  const { data: p } = await g.from("paiements").select("id,espace_id,formule,montant,statut").eq("transaction_id", transaction_id).maybeSingle();
  if (!p) throw new Error("Transaction inconnue.");
  if (p.statut === "accepte") return "accepte"; // notification reçue plusieurs fois : rien à refaire
  const r = await fetch(`${API}/payment/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: process.env.CINETPAY_API_KEY, site_id: process.env.CINETPAY_SITE_ID, transaction_id }),
    signal: AbortSignal.timeout(20000),
  });
  const j = (await r.json().catch(() => ({}))) as { code?: string; message?: string; data?: { status?: string; amount?: string; currency?: string; payment_method?: string; payment_date?: string } };
  const statut = j.data?.status;
  if (statut === "ACCEPTED" && Number(j.data?.amount) >= p.montant && (j.data?.currency ?? devise()).toUpperCase() === devise()) {
    // Verrou : seule la première mise à jour « en_attente → accepte » prolonge l'abonnement.
    const { data: maj } = await g.from("paiements").update({ statut: "accepte", detail: j.data }).eq("id", p.id).neq("statut", "accepte").select("id");
    if (maj && maj.length) await prolonger(p.espace_id, p.formule as Formule, DUREE_JOURS);
    return "accepte";
  }
  if (statut === "REFUSED" || j.code === "627") {
    await g.from("paiements").update({ statut: "refuse", detail: j.data ?? { message: j.message } }).eq("id", p.id).eq("statut", "en_attente");
    return "refuse";
  }
  return "en_attente"; // paiement en cours (confirmation sur le téléphone…)
}

/** Ajoute des jours d'accès à un espace (à partir de la fin actuelle si elle est future). */
export async function prolonger(espace: string, formule: Formule, jours: number) {
  const g = dbGlobal();
  const { data: e } = await g.from("espaces").select("payee_jusqu").eq("id", espace).maybeSingle();
  const depart = Math.max(Date.now(), e?.payee_jusqu ? new Date(e.payee_jusqu).getTime() : 0);
  const { error } = await g.from("espaces").update({ statut: "actif", formule, payee_jusqu: new Date(depart + jours * 864e5).toISOString() }).eq("id", espace);
  if (error) throw new Error(error.message);
}

export async function historiquePaiements(): Promise<Paiement[]> {
  const { data } = await db().from("paiements").select("id,created_at,transaction_id,formule,montant,statut,detail").order("created_at", { ascending: false }).limit(24);
  return (data ?? []) as Paiement[];
}
