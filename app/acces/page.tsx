"use client";
// Connexion : e-mail et mot de passe. Le compte ouvre directement l'espace de son média (30 jours sur cet appareil).
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CadreAuth, ChampMotDePasse } from "@/components/CadreAuth";
import { safeNext } from "@/lib/session";

export default function AccesPage() {
  return (
    <Suspense fallback={null}>
      <Acces />
    </Suspense>
  );
}

function Acces() {
  const q = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return setError("Entrez votre e-mail et votre mot de passe.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error || `Connexion impossible (${res.status}).`);
      window.location.href = safeNext(q.get("next"));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <CadreAuth
      titre="Connexion"
      sousTitre="Retrouvez votre espace de publication."
      pied={<>Pas encore de compte ? <a href="/inscription">Essayer gratuitement 24 h</a></>}
    >
      <form onSubmit={submit} className="mb-auth-form" noValidate>
        <label htmlFor="email">E-mail
          <input id="email" name="email" type="email" inputMode="email" autoComplete="username" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label htmlFor="password">Mot de passe
          <ChampMotDePasse id="password" value={password} onChange={setPassword} autoComplete="current-password" placeholder="Votre mot de passe" />
        </label>
        {error ? <p className="notice rouge" role="alert">{error}</p> : null}
        <button type="submit" className="mb-auth-go" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
        <p className="mb-auth-note">Vous restez connecté 30 jours sur cet appareil.</p>
      </form>
    </CadreAuth>
  );
}
