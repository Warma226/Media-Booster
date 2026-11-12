"use client";
// Commentaires : NOVA, l'assistante community manager, lit les commentaires et messages de la Page
// et prépare une réponse. Le client la relit, la modifie s'il veut, puis l'envoie d'un bouton.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TopBar } from "@/components/BottomNav";
import { getInfo } from "@/lib/client";
import type { CmLigne, CmReglages } from "@/lib/cm";

type Etat = { reglages: CmReglages; journal: CmLigne[]; aTraiter: CmLigne[]; delaiAnnulation: number; error?: string };
const CANAL: Record<string, string> = { commentaire: "Commentaire", message: "Message privé", mention: "Mention de votre page" };
const FAIT: Record<string, string> = { repondu: "Répondu", aime: "Aimé", masque: "Masqué" };

function quand(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return min <= 1 ? "à l'instant" : `il y a ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `il y a ${h} h` : new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

async function api(body?: Record<string, unknown>) {
  const r = await fetch("/api/cm", body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? "Action impossible pour le moment.");
  return j;
}

function Echange({ l, onFait }: { l: CmLigne; onFait: (msg: string) => void }) {
  const [texte, setTexte] = useState(l.reponse ?? "");
  const [occupe, setOccupe] = useState<"" | "envoi" | "autre" | "ignorer">("");
  const [erreur, setErreur] = useState("");
  async function faire(quoi: "envoi" | "autre" | "ignorer") {
    setOccupe(quoi);
    setErreur("");
    try {
      if (quoi === "envoi") onFait((await api({ repondre: l.id, texte })).log?.[0] ?? "Réponse envoyée.");
      else if (quoi === "ignorer") { await api({ traite: l.id }); onFait("Mis de côté."); }
      else setTexte((await api({ reformuler: l.id, texte })).reponse ?? texte);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setOccupe("");
    }
  }
  return (
    <li className="mb-cm-echange">
      <div className="mb-cm-tete">
        <strong>{l.auteur ?? "Un abonné"}</strong>
        <small>{CANAL[l.canal] ?? "Échange"} · {quand(l.created_at)}</small>
      </div>
      <blockquote className="mb-cm-texte">{l.texte}</blockquote>
      {l.lien ? <a className="mb-cm-lien" href={l.lien} target="_blank" rel="noopener noreferrer">Voir sur Facebook</a> : null}
      {l.action === "erreur" ? <p className="notice rouge">La réponse n&apos;est pas partie : {l.raison}</p> : null}
      <label className="mb-cm-reponse">
        <span>Réponse proposée par NOVA</span>
        <textarea rows={3} value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={1500} placeholder="Écrivez votre réponse…" />
      </label>
      {erreur ? <p className="notice rouge" role="alert">{erreur}</p> : null}
      <div className="mb-cm-actions">
        <button type="button" className="btn primary small" disabled={Boolean(occupe) || !texte.trim()} onClick={() => faire("envoi")}>{occupe === "envoi" ? "Envoi…" : "Envoyer"}</button>
        <button type="button" className="btn small" disabled={Boolean(occupe)} onClick={() => faire("autre")}>{occupe === "autre" ? "Un instant…" : "Autre proposition"}</button>
        <button type="button" className="btn link small" disabled={Boolean(occupe)} onClick={() => faire("ignorer")}>Ne pas répondre</button>
      </div>
    </li>
  );
}

export default function Commentaires() {
  const [e, setE] = useState<Etat | null>(null);
  const [relie, setRelie] = useState<boolean | null>(null);
  const [msg, setMsg] = useState("");
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    try {
      setE(await api());
      setErreur("");
    } catch (x) {
      setErreur((x as Error).message);
    }
  }, []);

  useEffect(() => {
    charger();
    getInfo().then((i) => setRelie(Boolean(i.connections?.facebook?.configured))).catch(() => setRelie(null));
    const t = window.setInterval(() => document.visibilityState === "visible" && charger(), 60000);
    return () => window.clearInterval(t);
  }, [charger]);

  async function regler(patch: Partial<CmReglages>) {
    try {
      const j = await api({ reglages: patch });
      setE((x) => (x ? { ...x, reglages: j.reglages } : x));
    } catch (x) {
      setErreur((x as Error).message);
    }
  }
  async function annuler(id: string) {
    try {
      setMsg((await api({ annuler: id })).log?.[0] ?? "Action annulée.");
      charger();
    } catch (x) {
      setErreur((x as Error).message);
    }
  }
  function fait(m: string) {
    setMsg(m);
    charger();
  }

  const auto = e?.reglages.autonomie === "auto";
  const recents = (e?.journal ?? []).filter((l) => FAIT[l.action]);

  return (
    <>
      <TopBar title="Commentaires" back="/" />
      <main className="page sub mb-cm">
        <p className="muted">NOVA lit les commentaires et messages de votre page et vous prépare une réponse dans le ton de votre média.</p>

        {relie === false ? (
          <section className="card mb-cm-vide">
            <h2>Reliez votre page Facebook</h2>
            <p className="muted">NOVA commencera à lire vos commentaires dès que votre page est reliée.</p>
            <Link href="/connexions" className="btn primary">Relier ma page</Link>
          </section>
        ) : null}

        {msg ? <p className="notice vert" role="status">{msg}</p> : null}
        {erreur ? <p className="notice rouge" role="alert">{erreur}</p> : null}

        <section aria-labelledby="t-valider" className="mb-cm-bloc">
          <h2 id="t-valider">À valider{e?.aTraiter.length ? <span className="mb-cm-nb">{e.aTraiter.length}</span> : null}</h2>
          {!e ? <p className="muted">Chargement…</p> : e.aTraiter.length === 0 ? (
            <p className="mb-cm-calme">Rien à valider pour l&apos;instant. Les nouveaux commentaires arrivent ici toutes les 15 minutes.</p>
          ) : (
            <ul className="mb-cm-liste">
              {e.aTraiter.map((l) => <Echange key={l.id} l={l} onFait={fait} />)}
            </ul>
          )}
        </section>

        {e ? (
          <fieldset className="mb-prop-choix">
            <legend>Comment NOVA répond</legend>
            <button type="button" role="radio" aria-checked={!auto} className="mb-prop-option" onClick={() => regler({ autonomie: "propose" })}>
              <strong>Je valide chaque réponse</strong>
              <span>NOVA prépare, vous envoyez. Conseillé pour commencer.</span>
            </button>
            <button type="button" role="radio" aria-checked={auto} className="mb-prop-option" onClick={() => regler({ autonomie: "auto" })}>
              <strong>NOVA répond seule aux messages simples</strong>
              <span>Les demandes délicates vous attendent toujours ici. 10 min pour annuler.</span>
            </button>
            <div className="mb-cm-pause">
              <span>{e.reglages.actif ? "NOVA est active" : "NOVA est en pause"}</span>
              <button type="button" role="switch" aria-checked={e.reglages.actif} aria-label="Activer NOVA" className="switch" onClick={() => regler({ actif: !e.reglages.actif })}><span /></button>
            </div>
          </fieldset>
        ) : null}

        {recents.length ? (
          <details className="mb-prop-detail">
            <summary>Déjà traité ({recents.length})</summary>
            <ul className="mb-cm-journal">
              {recents.map((l) => {
                const annulable = Date.now() - new Date(l.created_at).getTime() < (e?.delaiAnnulation ?? 600000);
                return (
                  <li key={l.id}>
                    <span><strong>{FAIT[l.action]}</strong> · {l.auteur ?? "Un abonné"} · {quand(l.created_at)}<small>{(l.reponse || l.texte || "").slice(0, 120)}</small></span>
                    {annulable ? <button type="button" className="btn link small" onClick={() => annuler(l.id)}>Annuler</button> : null}
                  </li>
                );
              })}
            </ul>
          </details>
        ) : null}
      </main>
    </>
  );
}
