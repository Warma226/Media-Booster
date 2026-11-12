"use client";
// Inscription : crée l'espace du média (24 h d'essai gratuit) et le compte de son propriétaire.
import { useState } from "react";
import { CadreAuth, ChampMotDePasse } from "@/components/CadreAuth";
import { ESSAI_HEURES } from "@/lib/abonnement";

export default function Inscription() {
  const [media, setMedia] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!media.trim() || !nom.trim() || !email.trim() || !password) return setError("Remplissez les quatre champs.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/inscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ media, nom, email, password }) });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error || `Inscription impossible (${res.status}).`);
      window.location.href = "/demarrage";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <CadreAuth
      titre="Créer votre espace"
      sousTitre={`${ESSAI_HEURES} h d'essai gratuit, sans carte bancaire.`}
      pied={<>Déjà inscrit ? <a href="/acces">Se connecter</a></>}
    >
      <form onSubmit={submit} className="mb-auth-form" noValidate>
        <label htmlFor="media">Nom de votre média
          <input id="media" type="text" autoComplete="organization" placeholder="Ex. Dakar Info" value={media} onChange={(e) => setMedia(e.target.value)} maxLength={60} required />
        </label>
        <label htmlFor="nom">Votre nom
          <input id="nom" type="text" autoComplete="name" placeholder="Prénom et nom" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={60} required />
        </label>
        <label htmlFor="email">E-mail
          <input id="email" type="email" inputMode="email" autoComplete="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label htmlFor="password">Mot de passe
          <ChampMotDePasse id="password" value={password} onChange={setPassword} autoComplete="new-password" placeholder="10 caractères, lettres et chiffres" />
        </label>
        {error ? <p className="notice rouge" role="alert">{error}</p> : null}
        <button type="submit" className="mb-auth-go" disabled={busy}>{busy ? "Création de l'espace…" : "Commencer l'essai gratuit"}</button>
        <p className="mb-auth-note">En créant un compte, vous acceptez les <a href="/cgu">conditions d&apos;utilisation</a>.</p>
      </form>
    </CadreAuth>
  );
}
