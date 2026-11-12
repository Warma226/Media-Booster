"use client";
// Écran de connexion : le mot de passe administrateur (APP_PASSWORD) ouvre l'app pour 30 jours sur cet appareil.
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";
import { LogoTuile, Trait } from "@/components/BottomNav";
import Voa from "@/components/Voa";
import { safeNext } from "@/lib/session";
import { APP_NOM, ASSISTANTE, MEDIA_FACEBOOK, MEDIA_NOM, MEDIA_SITE, MEDIA_URL } from "@/lib/brand";

export default function AccesPage() {
  return (
    <Suspense fallback={null}>
      <Acces />
    </Suspense>
  );
}

function Acces() {
  const q = useSearchParams();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [majuscules, setMajuscules] = useState(false);
  const [qui, setQui] = useState<"admin" | "membre">("admin");
  const [contact, setContact] = useState("");
  const [titres, setTitres] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/vitrine").then((r) => (r.ok ? r.json() : null)).then((d: { titres?: string[] } | null) => setTitres(d?.titres ?? [])).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (qui === "membre" && !contact.trim()) return setError("Entrez votre e-mail ou téléphone.");
    if (!password) return setError("Entrez le mot de passe.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(qui === "membre" ? { password, contact } : { password }) });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error || `Connexion impossible (${res.status}).`);
      window.location.href = safeNext(q.get("next"));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const une = titres[0];
  const fil = titres.length ? titres : ["Veille tech", "Actus cyber", "IA", "Réseaux sociaux", "Startups africaines", "Mobile money"];

  return (
    <div className="login tv-acces">
      <span className="fond" aria-hidden="true" />
      <span className="voile" aria-hidden="true" />
      <span className="lueur" aria-hidden="true" />
      <header className="haut">
        <span className="badge"><Trait d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" size={14} stroke={2.2} />Accès réservé à l&apos;équipe</span>
        {MEDIA_URL ? <a className="site" href={MEDIA_URL} target="_blank" rel="noopener noreferrer">{MEDIA_SITE.replace(/^www\./, "")} <Trait d="M7 17L17 7M9 7h8v8" size={13} stroke={2.4} /></a> : null}
      </header>

      <div className="scene">
        <section className="gauche">
          <h1>Ton média,<br /><span>en mode turbo.</span></h1>
          <div className="definition">
            <p><strong>Media Booster</strong> <span>/ˈmi.dja ˈbus.tœʁ/</span> <em>nom propre</em></p>
            <p><b>1.</b> Veille, rédaction et visuels : une actu repérée le matin devient un post prêt à publier.</p>
            <p><b>2.</b> Publication partout en même temps : site, Facebook, LinkedIn, TikTok.</p>
          </div>
          <div className="cartes" aria-hidden="true">
            <div className="poste">
              <div className="tete"><span className="av">{MEDIA_NOM.charAt(0)}</span><span><strong>{MEDIA_NOM}</strong><small>Facebook · 🌐</small></span></div>
              <div className="visuel"><i>ACTU</i><strong>{une ?? "La tech, expliquée simplement"}</strong></div>
            </div>
            <div className="voa-ecrit">
              <span className="voa"><Voa humeur="parle" taille={64} decor /></span>
              <span className="bulle"><small>{ASSISTANTE} ÉCRIT POUR VOUS</small><span className="ligne"><span>Un texte par plateforme, dans le ton du média</span></span><span className="onde">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.08}s` }} />)}</span></span>
            </div>
            <div className="planif">
              <small><Trait d="M12 8v4l3 2M12 22a10 10 0 110-20 10 10 0 010 20z" size={13} stroke={2.2} />CRÉNEAUX DU JOUR</small>
              <span>{["08:00", "12:00", "14:30", "19:00"].map((h) => <b key={h} data-on={h === "14:30"}>{h}</b>)}</span>
            </div>
          </div>
        </section>

        <main className="droite">
          <div className="autocollant" aria-hidden="true">
            <span className="rond" />
            <span className="anneau">{"ON PUBLIE ? • ON PUBLIE ? • ".split("").map((c, i, a) => <i key={i} style={{ transform: `translateX(-50%) rotate(${(i * 360) / a.length}deg)` }}>{c}</i>)}</span>
            <span className="photo" />
          </div>
          <div className="carte-wrap">
            <span className="languette" aria-hidden="true" />
            <div className="carte">
              <div className="ident">
                <LogoTuile taille={56} bord="#fff" />
                <strong>{APP_NOM}</strong>
                <span>Espace de publication de {MEDIA_NOM}</span>
              </div>
              <form onSubmit={submit} className="stack" style={{ gap: 14 }} noValidate>
                <div className="qui" role="tablist" aria-label="Type de compte">
                  <button type="button" role="tab" aria-selected={qui === "admin"} onClick={() => { setQui("admin"); setError(""); }}>Administration</button>
                  <button type="button" role="tab" aria-selected={qui === "membre"} onClick={() => { setQui("membre"); setError(""); }}>Membre de l&apos;équipe</button>
                </div>
                {qui === "membre" ? (
                  <label className="field" htmlFor="contact">E-mail ou téléphone
                    <input id="contact" name="username" type="text" autoComplete="username" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Celui donné à l'administration" style={{ height: 52, background: "#f7f9fc", borderRadius: 14 }} />
                  </label>
                ) : <input type="text" name="username" autoComplete="username" value="mediabooster" readOnly hidden />}
                <label className="field" htmlFor="password">
                  Mot de passe
                  <span className="login-pass">
                    <input
                      id="password"
                      name="password"
                      type={show ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Entrez votre mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyUp={(e) => setMajuscules(e.getModifierState("CapsLock"))}
                      onKeyDown={(e) => setMajuscules(e.getModifierState("CapsLock"))}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? "login-error" : majuscules ? "login-maj" : undefined}
                    />
                    <button type="button" className="login-eye" onClick={() => setShow(!show)} title="Afficher le mot de passe" aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={show}>
                      <Icon name={show ? "oeilBarre" : "oeil"} size={20} />
                    </button>
                  </span>
                </label>
                {majuscules ? <p id="login-maj" className="maj"><Trait d="M12 3l9 16H3zM12 10v4M12 17h.01" size={14} stroke={2.2} />Majuscules activées</p> : null}
                {error ? <p id="login-error" className="notice rouge" role="alert">{error}</p> : null}
                <button type="submit" className="go" disabled={busy}>
                  {busy ? "Connexion…" : <>Se connecter <Trait d="M5 12h14M13 6l6 6-6 6" size={18} stroke={2.4} /></>}
                </button>
              </form>
              <p className="note"><Trait d="M6 10V8a6 6 0 1112 0v2M5 10h14a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z" size={15} stroke={2.2} /><span>Connexion chiffrée. Vous restez connecté <strong>30 jours</strong> sur cet appareil, puis le mot de passe vous sera redemandé.</span></p>
              {MEDIA_URL || MEDIA_FACEBOOK ? (
                <div className="public">
                  <small>PENDANT CE TEMPS, CÔTÉ PUBLIC</small>
                  <span>
                    {MEDIA_URL ? <a href={MEDIA_URL} target="_blank" rel="noopener noreferrer">{MEDIA_SITE.replace(/^www\./, "")} <Trait d="M7 17L17 7M9 7h8v8" size={13} stroke={2.4} /></a> : null}
                    {MEDIA_FACEBOOK ? <a href={MEDIA_FACEBOOK} target="_blank" rel="noopener noreferrer"><i>f</i>Page Facebook <Trait d="M7 17L17 7M9 7h8v8" size={13} stroke={2.4} /></a> : null}
                  </span>
                </div>
              ) : null}
            </div>
            <p className="legal">En vous connectant, vous acceptez les <a href="/cgu">conditions d&apos;utilisation</a> et la <a href="/confidentialite">confidentialité</a>.</p>
          </div>
        </main>
      </div>

      <div className="bande" aria-label="Dernières actus publiées">
        <span className="direct"><i />{titres.length ? "DERNIÈRES ACTUS PUBLIÉES" : "AU MENU DE MEDIA BOOSTER"}</span>
        <span className="defile"><span>{[...fil, ...fil].map((x, i) => <span key={i}><i />{x}</span>)}</span></span>
      </div>
      <footer className="bas"><span>© {new Date().getFullYear()} {MEDIA_NOM}</span><span>{MEDIA_SITE || APP_NOM}</span></footer>
    </div>
  );
}
