"use client";
// Abonnement : état de l'essai ou de l'abonnement, choix d'une formule et paiement par CinetPay (mobile money ou carte).
// Au retour de la page de paiement (?retour=<transaction>), la transaction est vérifiée puis l'accès rouvert.
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/BottomNav";
import { prixTexte, type DetailFormule, type Formule } from "@/lib/abonnement";

type Etat = {
  espace: { nom: string; formule: Formule; statut: string; essai_fin: string | null; payee_jusqu: string | null; acces: boolean } | null;
  formules: DetailFormule[];
  paiements: { id: string; created_at: string; formule: Formule; montant: number; statut: string }[];
  paiementDisponible: boolean;
  peutPayer: boolean;
};

const date = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const heure = (iso: string) => { const d = new Date(iso); return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, "0")}`; };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Abonnement />
    </Suspense>
  );
}

function Abonnement() {
  const q = useSearchParams();
  const [e, setE] = useState<Etat | null>(null);
  const [busy, setBusy] = useState<Formule | "">("");
  const [msg, setMsg] = useState<{ t: string; type: "vert" | "rouge" | "ambre" } | null>(null);

  const charger = () => fetch("/api/abonnement", { cache: "no-store" }).then((r) => r.json()).then(setE).catch(() => setMsg({ t: "Impossible de lire votre abonnement.", type: "rouge" }));
  useEffect(() => { void charger(); }, []);

  // Retour de CinetPay : vérification (quelques essais, le temps que le paiement mobile soit confirmé).
  useEffect(() => {
    const tx = q.get("retour");
    if (!tx) return;
    let fini = false;
    setMsg({ t: "Vérification de votre paiement…", type: "ambre" });
    (async () => {
      for (let i = 0; i < 8 && !fini; i++) {
        const r = await fetch(`/api/abonnement/verifier?tx=${encodeURIComponent(tx)}`, { cache: "no-store" }).then((x) => x.json()).catch(() => ({}));
        if (r.statut === "accepte") { setMsg({ t: "Paiement reçu, merci ! Votre accès est ouvert pour 30 jours.", type: "vert" }); await charger(); return; }
        if (r.statut === "refuse") { setMsg({ t: "Le paiement n'a pas abouti. Vous pouvez réessayer.", type: "rouge" }); return; }
        await new Promise((ok) => setTimeout(ok, 4000));
      }
      if (!fini) setMsg({ t: "Paiement en cours de confirmation. Votre accès s'ouvrira dès que l'opérateur l'aura validé (rechargez la page dans une minute).", type: "ambre" });
    })();
    return () => { fini = true; };
  }, [q]);

  async function payer(f: Formule) {
    setBusy(f);
    setMsg(null);
    try {
      const r = await fetch("/api/abonnement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ formule: f }) });
      const d = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!r.ok || !d.url) throw new Error(d.error || "Paiement impossible pour le moment.");
      window.location.href = d.url;
    } catch (err) {
      setMsg({ t: (err as Error).message, type: "rouge" });
      setBusy("");
    }
  }

  const esp = e?.espace;
  const enEssai = esp?.statut === "essai" && esp.essai_fin && new Date(esp.essai_fin).getTime() > Date.now() && !(esp.payee_jusqu && new Date(esp.payee_jusqu).getTime() > Date.now());
  const paye = esp?.payee_jusqu && new Date(esp.payee_jusqu).getTime() > Date.now();

  return (
    <>
      <TopBar title="Abonnement" back="/" />
      <main className="page sub mb-abo">
        {!e ? <p className="muted">Chargement…</p> : (
          <>
            <section className={`mb-abo-etat ${esp?.acces ? "ok" : "ko"}`}>
              {paye ? (
                <><strong>Abonnement {e.formules.find((f) => f.id === esp?.formule)?.nom} actif</strong><span>Jusqu&apos;au {date(esp!.payee_jusqu!)}. Un nouveau paiement ajoute 30 jours à cette date.</span></>
              ) : enEssai ? (
                <><strong>Essai gratuit en cours</strong><span>Jusqu&apos;au {date(esp!.essai_fin!)} à {heure(esp!.essai_fin!)}. Choisissez une formule pour continuer ensuite.</span></>
              ) : (
                <><strong>{esp?.statut === "suspendu" ? "Espace suspendu" : "Votre essai ou abonnement est terminé"}</strong><span>Vos posts, réglages et comptes reliés sont conservés. Choisissez une formule pour rouvrir l&apos;accès.</span></>
              )}
            </section>

            {msg ? <p className={`notice ${msg.type}`} role={msg.type === "rouge" ? "alert" : "status"}>{msg.t}</p> : null}
            {!e.peutPayer ? <p className="notice">Seul l&apos;administrateur de l&apos;espace peut régler l&apos;abonnement.</p> : !e.paiementDisponible ? <p className="notice ambre">Le paiement en ligne sera disponible très bientôt.</p> : null}

            <div className="mb-formules">
              {e.formules.map((f) => (
                <section key={f.id} className={`mb-formule${f.id === "pro" ? " vedette" : ""}${esp?.formule === f.id && paye ? " actuelle" : ""}`}>
                  {f.id === "pro" ? <span className="mb-formule-badge">Le plus choisi</span> : null}
                  <h2>{f.nom}</h2>
                  <p className="mb-formule-accroche">{f.accroche}</p>
                  <p className="mb-formule-prix"><strong>{prixTexte(f.prix)}</strong><span>/ mois</span></p>
                  <ul>{f.atouts.map((a) => <li key={a}>{a}</li>)}</ul>
                  <button type="button" className={`btn ${f.id === "pro" ? "primary" : ""}`} disabled={!e.peutPayer || !e.paiementDisponible || Boolean(busy)} onClick={() => payer(f.id)}>
                    {busy === f.id ? "Ouverture du paiement…" : esp?.formule === f.id && paye ? "Prolonger de 30 jours" : `Choisir ${f.nom}`}
                  </button>
                </section>
              ))}
            </div>
            <p className="small muted" style={{ textAlign: "center" }}>Paiement sécurisé par CinetPay : Orange Money, MTN, Moov, Wave, carte bancaire. Sans renouvellement automatique.</p>

            {e.paiements.length ? (
              <section className="card">
                <h2 style={{ fontSize: 16 }}>Derniers paiements</h2>
                {e.paiements.map((p) => (
                  <div key={p.id} className="row" style={{ justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #EFEDE6", fontSize: 14 }}>
                    <span>{date(p.created_at)} · {e.formules.find((f) => f.id === p.formule)?.nom}</span>
                    <span><strong>{prixTexte(p.montant)}</strong> <span className={`tv-pill`} style={{ marginLeft: 6 }}>{p.statut === "accepte" ? "Payé" : p.statut === "refuse" ? "Échoué" : "En attente"}</span></span>
                  </div>
                ))}
              </section>
            ) : null}
          </>
        )}
      </main>
    </>
  );
}
