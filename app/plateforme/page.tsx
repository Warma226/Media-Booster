"use client";
// Administration de Media Booster (propriétaire de la plateforme) : clients, abonnements, encaissements.
// Permet aussi d'ouvrir l'accès à la main (paiement reçu hors CinetPay, geste commercial) ou de suspendre un espace.
import { useEffect, useState } from "react";
import { TopBar } from "@/components/BottomNav";
import { FORMULES, prixTexte, type Formule } from "@/lib/abonnement";

type Ligne = { id: string; nom: string; created_at: string; formule: Formule; statut: string; essai_fin: string | null; payee_jusqu: string | null; acces: boolean; proprietaire: string; membres: number; derniereConnexion: string | null; encaisse: number };
type Donnees = { espaces: Ligne[]; totaux: { clients: number; actifs: number; payants: number; encaisseMois: number } };

const jour = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—");

export default function Plateforme() {
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState("");
  const [filtre, setFiltre] = useState("");
  const charger = () => fetch("/api/plateforme", { cache: "no-store" }).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setD(j); }).catch((e) => setErreur((e as Error).message));
  useEffect(() => { void charger(); }, []);

  async function agir(corps: Record<string, unknown>, question: string) {
    if (!window.confirm(question)) return;
    const r = await fetch("/api/plateforme", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setErreur(j.error ?? "Action impossible.");
    await charger();
  }

  const liste = (d?.espaces ?? []).filter((e) => !filtre || `${e.nom} ${e.proprietaire}`.toLowerCase().includes(filtre.toLowerCase()));
  return (
    <>
      <TopBar title="Plateforme" back="/" wide />
      <main className="page sub wide" style={{ gap: 14 }}>
        {erreur ? <p className="notice rouge">{erreur}</p> : null}
        {d ? (
          <>
            <div className="grid2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
              {[["Clients", d.totaux.clients], ["Accès ouvert", d.totaux.actifs], ["Abonnés payants", d.totaux.payants], ["Encaissé ce mois", prixTexte(d.totaux.encaisseMois)]].map(([l, v]) => (
                <div key={String(l)} className="card" style={{ gap: 2 }}><span className="small muted">{l}</span><strong style={{ fontSize: 22 }}>{v}</strong></div>
              ))}
            </div>
            <input type="search" placeholder="Rechercher un média ou un e-mail" value={filtre} onChange={(e) => setFiltre(e.target.value)} className="mb-form" style={{ height: 44, padding: "0 12px", borderRadius: 12, border: "1px solid #D6D3CB" }} />
            <div className="stack" style={{ gap: 10 }}>
              {liste.map((e) => (
                <section key={e.id} className="card" style={{ gap: 6 }}>
                  <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <strong>{e.nom}</strong>
                    <span className="tv-pill" style={{ background: e.acces ? "#D1FAE5" : "#FEE2E2", color: e.acces ? "#065F46" : "#991B1B" }}>{e.statut === "suspendu" ? "Suspendu" : e.acces ? (e.payee_jusqu && new Date(e.payee_jusqu) > new Date() ? `${FORMULES[e.formule]?.nom} · ${jour(e.payee_jusqu)}` : `Essai · ${jour(e.essai_fin)}`) : "Expiré"}</span>
                  </div>
                  <span className="small muted">{e.proprietaire} · {e.membres} compte(s) · inscrit le {jour(e.created_at)} · vu le {jour(e.derniereConnexion)} · encaissé {prixTexte(e.encaisse)}</span>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                    {(Object.keys(FORMULES) as Formule[]).map((f) => (
                      <button key={f} type="button" className="btn small" onClick={() => agir({ action: "prolonger", espace: e.id, formule: f, jours: 30 }, `Ouvrir 30 jours de ${FORMULES[f].nom} pour « ${e.nom} » ?`)}>+30 j {FORMULES[f].nom}</button>
                    ))}
                    {e.statut === "suspendu"
                      ? <button type="button" className="btn small" onClick={() => agir({ action: "reactiver", espace: e.id }, `Réactiver « ${e.nom} » ?`)}>Réactiver</button>
                      : <button type="button" className="btn small" onClick={() => agir({ action: "suspendre", espace: e.id }, `Suspendre « ${e.nom} » ? Ses membres ne pourront plus accéder à l'app.`)}>Suspendre</button>}
                  </div>
                </section>
              ))}
            </div>
          </>
        ) : !erreur ? <p className="muted">Chargement…</p> : null}
      </main>
    </>
  );
}
