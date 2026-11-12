"use client";
import { CadreAuth } from "@/components/CadreAuth";
// Invitation d'un membre : il choisit son mot de passe, puis entre directement dans l'application.
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DROITS, ZONE_NOM, type Role, type Zone } from "@/lib/roles";

type Invit = { nom: string; contact: string; role: Role; roleNom: string; expire: string; espace?: string };

export default function InvitationPage() {
  return <Suspense fallback={null}><Invitation /></Suspense>;
}

function force(m: string): number {
  let n = 0;
  if (m.length >= 10) n++;
  if (m.length >= 14) n++;
  if (/[a-zA-Z]/.test(m) && /\d/.test(m)) n++;
  if (/[^a-zA-Z0-9]/.test(m) || (/[a-z]/.test(m) && /[A-Z]/.test(m))) n++;
  return n;
}

function Invitation() {
  const t = useSearchParams().get("t") ?? "";
  const [inv, setInv] = useState<Invit | null>(null);
  const [erreurLien, setErreurLien] = useState("");
  const [mdp, setMdp] = useState("");
  const [mdp2, setMdp2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/invitation?t=${encodeURIComponent(t)}`).then(async (r) => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErreurLien(d.error || "Lien invalide."); else setInv(d as Invit);
    }).catch(() => setErreurLien("Connexion impossible. Réessayez."));
  }, [t]);
  const f = force(mdp);
  async function valider(e: React.FormEvent) {
    e.preventDefault();
    if (mdp !== mdp2) return setError("Les deux mots de passe ne sont pas identiques.");
    setBusy(true); setError("");
    const r = await fetch("/api/invitation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t, password: mdp }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d.error || "Impossible d'activer le compte."); setBusy(false); return; }
    window.location.href = "/";
  }
  const prenom = inv?.nom.split(/\s+/)[0] ?? "";
  const zones = inv ? (Object.keys(DROITS[inv.role]) as Zone[]).filter((z) => DROITS[inv.role][z] !== "-") : [];

  return (
    <CadreAuth
      titre={inv ? `Bienvenue dans l'équipe, ${prenom}` : erreurLien ? "Ce lien ne fonctionne plus" : "Un instant…"}
      sousTitre={inv ? `L'équipe de ${inv.espace || "votre média"} vous a ajouté(e) comme ${inv.roleNom.toLowerCase()}. Choisissez votre mot de passe pour commencer.` : erreurLien || undefined}
    >
      {inv ? (
        <form className="mb-auth-form" onSubmit={valider} noValidate>
          <div className="row" style={{ gap: 12 }}>
            <span style={{ width: 44, height: 44, borderRadius: 22, background: "var(--emeraude-pale)", color: "var(--emeraude-fonce)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{inv.nom.split(/\s+/).map((x) => x[0]).join("").slice(0, 2).toUpperCase()}</span>
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><strong>{inv.nom}</strong><small className="muted" style={{ overflowWrap: "anywhere" }}>{inv.contact}</small></span>
          </div>
          {zones.length ? <p className="muted small" style={{ margin: 0 }}>Vous aurez accès à : {zones.map((z) => `${ZONE_NOM[z]}${DROITS[inv.role][z] === "l" ? " (lecture)" : ""}`).join(", ")}.</p> : null}
          <label className="field">Choisissez un mot de passe
            <input type="password" autoComplete="new-password" value={mdp} onChange={(e) => setMdp(e.target.value)} />
          </label>
          <div className="row" style={{ gap: 4 }}>{[0, 1, 2, 3].map((i) => <span key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < f ? (f >= 3 ? "#047857" : "#C26A12") : "var(--ligne)" }} />)}</div>
          <small className="muted" style={{ marginTop: -8 }}>{mdp && f >= 3 ? "Solide" : "10 caractères au moins, lettres et chiffres"}</small>
          <label className="field">Confirmez-le
            <input type="password" autoComplete="new-password" value={mdp2} onChange={(e) => setMdp2(e.target.value)} />
          </label>
          {error ? <p className="notice rouge" role="alert">{error}</p> : null}
          <button type="submit" className="btn primary" disabled={busy}>{busy ? "Activation…" : "Rejoindre l'équipe"}</button>
          <p className="muted small" style={{ margin: 0 }}>Ce lien ne sert qu&apos;une fois. Ensuite, connectez-vous avec {inv.contact} et ce mot de passe.</p>
        </form>
      ) : null}
    </CadreAuth>
  );
}
