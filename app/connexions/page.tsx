"use client";
// Connexions : le client relie ses comptes sans rien de technique.
// Facebook et LinkedIn : bouton officiel « Se connecter », puis la liste de ses pages s'affiche et il coche la sienne.
// Site WordPress : adresse, identifiant et mot de passe d'application. TikTok : connexion officielle. WhatsApp : bouton Partager.
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/BottomNav";

type Comptes = {
  disponible: { facebook: boolean; linkedin: boolean; linkedinPages: boolean; tiktok: boolean };
  facebook: { utilisateur: string; pageId: string | null; pages: { id: string; nom: string; categorie: string; photo: string }[] } | null;
  linkedin: { personne: { urn: string; nom: string }; organisations: { urn: string; nom: string }[]; auteur: string; expire: string; pagesAutorisees: boolean } | null;
  wordpress: { url: string; utilisateur: string } | null;
  tiktok: boolean;
};

const MESSAGES: Record<string, string> = {
  "ok=facebook": "Facebook est relié. Choisissez la page sur laquelle publier.",
  "ok=linkedin": "LinkedIn est relié.",
  "erreur=facebook-indisponible": "La connexion Facebook n'est pas encore activée sur Media Booster. Réessayez plus tard.",
  "erreur=linkedin-indisponible": "La connexion LinkedIn n'est pas encore activée sur Media Booster. Réessayez plus tard.",
  "erreur=facebook-refus": "Connexion Facebook annulée.",
  "erreur=linkedin-refus": "Connexion LinkedIn annulée.",
  "erreur=facebook-expire": "La connexion a pris trop de temps. Recommencez.",
  "erreur=linkedin-expire": "La connexion a pris trop de temps. Recommencez.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Connexions />
    </Suspense>
  );
}

function Connexions() {
  const q = useSearchParams();
  const [c, setC] = useState<Comptes | null>(null);
  const [info, setInfo] = useState("");
  const [erreur, setErreur] = useState("");
  const [busy, setBusy] = useState("");
  const [wp, setWp] = useState({ url: "", utilisateur: "", motDePasse: "" });
  const [wpOuvert, setWpOuvert] = useState(false);
  const [tests, setTests] = useState<Record<string, { ok: boolean; detail: string }> | null>(null);

  const charger = () => fetch("/api/connexions/comptes", { cache: "no-store" }).then((r) => r.json()).then(setC).catch(() => setErreur("Impossible de lire vos connexions."));
  useEffect(() => {
    void charger();
    const tt = q.get("tiktok");
    if (tt) { if (tt === "ok") setInfo("TikTok est relié."); else setErreur(`TikTok : ${tt}`); }
    const cle = [...q.entries()].map(([k, v]) => `${k}=${v}`).find((k) => MESSAGES[k] || k.startsWith("erreur="));
    if (cle) {
      if (cle.startsWith("ok=")) setInfo(MESSAGES[cle]);
      else setErreur(MESSAGES[cle] ?? `La connexion a échoué. ${q.get("detail") ?? ""}`);
    }
  }, [q]);

  async function action(corps: Record<string, string>, ok: string) {
    setBusy(corps.action + (corps.reseau ?? ""));
    setErreur("");
    setInfo("");
    try {
      const r = await fetch("/api/connexions/comptes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(d.error || `Erreur ${r.status}`);
      setInfo(ok);
      await charger();
      return true;
    } catch (e) {
      setErreur((e as Error).message);
      return false;
    } finally {
      setBusy("");
    }
  }
  const delier = (reseau: string, nom: string) => { if (window.confirm(`Délier ${nom} ? Media Booster ne pourra plus y publier.`)) void action({ action: "delier", reseau }, `${nom} est délié.`); };

  async function tester() {
    setBusy("test");
    const r = await fetch("/api/connexions", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    setTests(r?.results ?? null);
    setBusy("");
  }

  const liExpire = c?.linkedin ? new Date(c.linkedin.expire) : null;
  const liBientot = liExpire ? liExpire.getTime() - Date.now() < 7 * 864e5 : false;

  return (
    <>
      <TopBar title="Connexions" back="/demarrage" />
      <main className="page sub mb-cnx">
        <p className="muted">Reliez les comptes sur lesquels Media Booster publie pour vous. Vous gardez la main : chaque autorisation se retire en un clic, ici ou depuis le réseau concerné.</p>
        {info ? <p className="notice vert" role="status">{info}</p> : null}
        {erreur ? <p className="notice rouge" role="alert">{erreur}</p> : null}
        {!c ? <p className="muted">Chargement…</p> : (
          <>
            {/* Facebook */}
            <section className="card mb-cnx-carte">
              <header><span className="mb-cnx-logo" style={{ background: "#1877F2" }}>f</span><span><strong>Facebook</strong><small>Publication sur votre page, réponses de NOVA aux commentaires</small></span></header>
              {!c.facebook ? (
                c.disponible.facebook
                  ? <a className="mb-cnx-btn fb" href="/api/connexions/facebook/debut">Se connecter avec Facebook</a>
                  : <p className="muted small">La connexion Facebook sera bientôt disponible.</p>
              ) : (
                <>
                  <p className="small muted">Connecté en tant que <strong>{c.facebook.utilisateur || "vous"}</strong>. {c.facebook.pages.length ? "Choisissez la page de votre média :" : ""}</p>
                  {c.facebook.pages.length === 0 ? (
                    <p className="notice ambre">Aucune page trouvée. Vérifiez que vous êtes administrateur d&apos;une page Facebook et que vous l&apos;avez cochée pendant la connexion, puis reconnectez.</p>
                  ) : (
                    <div className="mb-cnx-liste" role="radiogroup" aria-label="Page Facebook utilisée">
                      {c.facebook.pages.map((p) => (
                        <button key={p.id} type="button" role="radio" aria-checked={c.facebook?.pageId === p.id} className="mb-cnx-page" disabled={!!busy}
                          onClick={() => void action({ action: "page-facebook", id: p.id }, `Media Booster publiera sur « ${p.nom} ».`)}>
                          {p.photo ? <img src={p.photo} alt="" width={40} height={40} /> : <span className="mb-cnx-ini">{p.nom.charAt(0)}</span>}
                          <span><strong>{p.nom}</strong><small>{p.categorie}</small></span>
                          <span className="mb-cnx-coche" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="row mb-cnx-actions">
                    <a className="btn small" href="/api/connexions/facebook/debut">Actualiser la liste</a>
                    <button type="button" className="btn small" onClick={() => delier("facebook", "Facebook")}>Délier</button>
                  </div>
                </>
              )}
            </section>

            {/* LinkedIn */}
            <section className="card mb-cnx-carte">
              <header><span className="mb-cnx-logo" style={{ background: "#0A66C2" }}>in</span><span><strong>LinkedIn</strong><small>{c.disponible.linkedinPages ? "Publication sur votre profil ou vos pages entreprise" : "Publication sur votre profil LinkedIn"}</small></span></header>
              {!c.linkedin ? (
                c.disponible.linkedin
                  ? <a className="mb-cnx-btn li" href="/api/connexions/linkedin/debut">Se connecter avec LinkedIn</a>
                  : <p className="muted small">La connexion LinkedIn sera bientôt disponible.</p>
              ) : (
                <>
                  <p className="small muted">Publier au nom de :</p>
                  <div className="mb-cnx-liste" role="radiogroup" aria-label="Compte LinkedIn utilisé">
                    {[{ urn: c.linkedin.personne.urn, nom: c.linkedin.personne.nom, type: "Votre profil" }, ...c.linkedin.organisations.map((o) => ({ ...o, type: "Page entreprise" }))].map((a) => (
                      <button key={a.urn} type="button" role="radio" aria-checked={c.linkedin?.auteur === a.urn} className="mb-cnx-page" disabled={!!busy}
                        onClick={() => void action({ action: "auteur-linkedin", urn: a.urn }, `Media Booster publiera au nom de « ${a.nom} ».`)}>
                        <span className="mb-cnx-ini">{a.nom.charAt(0)}</span>
                        <span><strong>{a.nom}</strong><small>{a.type}</small></span>
                        <span className="mb-cnx-coche" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                  {!c.linkedin.pagesAutorisees ? <p className="small muted">Les pages entreprise LinkedIn arriveront dès que LinkedIn aura validé Media Booster.</p> : null}
                  {liExpire ? <p className={`small ${liBientot ? "notice ambre" : "muted"}`}>LinkedIn demande de se reconnecter tous les 60 jours. Prochaine fois : avant le {liExpire.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.</p> : null}
                  <div className="row mb-cnx-actions">
                    <a className="btn small" href="/api/connexions/linkedin/debut">Reconnecter</a>
                    <button type="button" className="btn small" onClick={() => delier("linkedin", "LinkedIn")}>Délier</button>
                  </div>
                </>
              )}
            </section>

            {/* WhatsApp */}
            <section className="card mb-cnx-carte">
              <header><span className="mb-cnx-logo" style={{ background: "#25D366" }}>W</span><span><strong>WhatsApp</strong><small>Chaînes et groupes</small></span></header>
              <p className="small muted">WhatsApp ne permet à aucune application de publier seule dans une chaîne ou un groupe. Sur chaque post, le bouton <strong>Partager sur WhatsApp</strong> ouvre WhatsApp avec le texte et le visuel prêts : vous choisissez la chaîne ou le groupe et vous envoyez.</p>
            </section>

            {/* Site WordPress */}
            <section className="card mb-cnx-carte">
              <header><span className="mb-cnx-logo" style={{ background: "#21759B" }}>W</span><span><strong>Site WordPress</strong><small>Articles complets avec image, catégories et étiquettes</small></span></header>
              {c.wordpress && !wpOuvert ? (
                <>
                  <p className="small muted">Relié à <strong>{c.wordpress.url.replace(/^https?:\/\//, "")}</strong> ({c.wordpress.utilisateur}).</p>
                  <div className="row mb-cnx-actions">
                    <button type="button" className="btn small" onClick={() => { setWp({ url: c.wordpress?.url ?? "", utilisateur: c.wordpress?.utilisateur ?? "", motDePasse: "" }); setWpOuvert(true); }}>Modifier</button>
                    <button type="button" className="btn small" onClick={() => delier("wordpress", "le site")}>Délier</button>
                  </div>
                </>
              ) : !wpOuvert ? (
                <button type="button" className="mb-cnx-btn wp" onClick={() => setWpOuvert(true)}>Relier mon site</button>
              ) : (
                <form className="stack mb-form" style={{ gap: 10 }} onSubmit={async (e) => { e.preventDefault(); if (await action({ action: "wordpress", ...wp }, "Site relié : Media Booster peut y publier.")) setWpOuvert(false); }}>
                  <label className="field">Adresse du site<input type="text" inputMode="url" placeholder="www.monmedia.com" value={wp.url} onChange={(e) => setWp({ ...wp, url: e.target.value })} required /></label>
                  <label className="field">Identifiant WordPress<input type="text" autoComplete="off" value={wp.utilisateur} onChange={(e) => setWp({ ...wp, utilisateur: e.target.value })} required /></label>
                  <label className="field">Mot de passe d&apos;application<input type="text" autoComplete="off" placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" value={wp.motDePasse} onChange={(e) => setWp({ ...wp, motDePasse: e.target.value })} required /></label>
                  <p className="small muted">À créer dans votre WordPress : <strong>Utilisateurs › Profil › Mots de passe d&apos;application</strong>, nom « Media Booster ». Ce n&apos;est pas votre mot de passe habituel.</p>
                  <div className="row" style={{ gap: 8 }}>
                    <button type="submit" className="btn primary small" disabled={!!busy}>{busy === "wordpress" ? "Vérification…" : "Relier le site"}</button>
                    <button type="button" className="btn small" onClick={() => setWpOuvert(false)}>Annuler</button>
                  </div>
                </form>
              )}
            </section>

            {/* TikTok */}
            <section className="card mb-cnx-carte">
              <header><span className="mb-cnx-logo" style={{ background: "#111" }}>♪</span><span><strong>TikTok</strong><small>Photos et carrousels</small></span></header>
              {!c.disponible.tiktok ? <p className="muted small">La connexion TikTok sera bientôt disponible.</p> : c.tiktok ? (
                <div className="row mb-cnx-actions"><span className="small muted" style={{ flex: 1 }}>Compte TikTok relié.</span><button type="button" className="btn small" onClick={() => delier("tiktok", "TikTok")}>Délier</button></div>
              ) : <a className="mb-cnx-btn tt" href="/api/tiktok/login">Se connecter avec TikTok</a>}
            </section>

            <section className="stack" style={{ gap: 10 }}>
              <button type="button" className="btn" onClick={tester} disabled={busy === "test"}>{busy === "test" ? "Vérification…" : "Vérifier mes connexions"}</button>
              {tests ? Object.entries(tests).map(([k, t]) => <p key={k} className={`notice ${t.ok ? "vert" : "ambre"}`}><strong style={{ textTransform: "capitalize" }}>{k}</strong> : {t.detail}</p>) : null}
            </section>
          </>
        )}
      </main>
    </>
  );
}
