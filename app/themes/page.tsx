"use client";
// Thèmes suivis par la veille : le client définit les sujets qui comptent pour son média et leurs mots-clés.
// Une actu qui contient un de ces mots gagne des points de pertinence (et remonte en tête de la veille).
import { useEffect, useState } from "react";
import { TopBar } from "@/components/BottomNav";
import { useProfil } from "@/components/Profil";
import { Message, useEnregistrer } from "@/components/Reglages";
import type { Theme } from "@/lib/marque";

const IMPORTANCE: { poids: number; nom: string }[] = [{ poids: 5, nom: "Faible" }, { poids: 15, nom: "Moyenne" }, { poids: 30, nom: "Forte" }];
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || `theme-${Date.now()}`;

export default function Themes() {
  const profil = useProfil();
  const [themes, setThemes] = useState<(Theme & { saisie: string })[] | null>(null);
  const [nouveau, setNouveau] = useState("");
  const { busy, msg, erreur, enregistrer } = useEnregistrer();

  useEffect(() => {
    if (profil && !themes) setThemes(profil.themes.map((t) => ({ ...t, saisie: t.keywords.join(", ") })));
  }, [profil, themes]);

  function ajouter(e: React.FormEvent) {
    e.preventDefault();
    const label = nouveau.trim();
    if (!label || !themes) return;
    let id = slug(label);
    while (themes.some((t) => t.id === id)) id = `${id}-2`;
    setThemes([...themes, { id, label: label.slice(0, 40), keywords: [label.toLowerCase()], poids: 15, saisie: label.toLowerCase() }]);
    setNouveau("");
  }
  const maj = (id: string, p: Partial<Theme & { saisie: string }>) => setThemes((l) => (l ?? []).map((t) => (t.id === id ? { ...t, ...p } : t)));

  async function sauver() {
    if (!themes) return;
    const propres: Theme[] = themes.map(({ saisie, ...t }) => ({
      ...t,
      keywords: [...new Set(saisie.split(/[,;\n]/).map((k) => k.trim().toLowerCase()).filter((k) => k.length >= 2))].slice(0, 40),
    })).filter((t) => t.keywords.length);
    await enregistrer({ themes: propres }, `${propres.length} thème(s) enregistré(s). La veille en tient compte dès maintenant.`);
  }

  return (
    <>
      <TopBar title="Thèmes suivis" back="/demarrage" />
      <main className="page sub">
        <p className="muted">Les sujets importants pour votre public. Quand une actu de vos sources contient un des mots-clés, elle remonte dans la veille et peut partir en pilote automatique.</p>
        <form onSubmit={ajouter} className="row mb-form" style={{ gap: 8 }}>
          <input type="text" aria-label="Nouveau thème" placeholder="Ex. Mobile money, Cybersécurité, Football…" value={nouveau} onChange={(e) => setNouveau(e.target.value)} maxLength={40} style={{ flex: 1 }} />
          <button type="submit" className="btn small primary">Ajouter</button>
        </form>
        {!themes ? <p className="muted">Chargement…</p> : themes.length === 0 ? (
          <p className="notice">Aucun thème pour l&apos;instant. Ajoutez les 3 à 6 sujets que votre média couvre le plus.</p>
        ) : (
          <div className="stack" style={{ gap: 12 }}>
            {themes.map((t) => (
              <section key={t.id} className="card mb-form" style={{ gap: 10 }}>
                <div className="row">
                  <input type="text" aria-label="Nom du thème" value={t.label} maxLength={40} onChange={(e) => maj(t.id, { label: e.target.value })} style={{ flex: 1, fontWeight: 700 }} />
                  <button type="button" className="btn small" aria-label={`Retirer ${t.label}`} onClick={() => setThemes(themes.filter((x) => x.id !== t.id))}>Retirer</button>
                </div>
                <label className="field">Mots-clés (séparés par des virgules)
                  <textarea rows={2} value={t.saisie} onChange={(e) => maj(t.id, { saisie: e.target.value })} placeholder="orange money, wave, mtn momo, transfert d'argent" />
                </label>
                <div className="row" role="radiogroup" aria-label="Importance" style={{ gap: 6, flexWrap: "wrap" }}>
                  <span className="small muted">Importance :</span>
                  {IMPORTANCE.map((i) => <button key={i.poids} type="button" className="chip" role="radio" aria-checked={t.poids === i.poids} onClick={() => maj(t.id, { poids: i.poids })}>{i.nom}</button>)}
                </div>
              </section>
            ))}
          </div>
        )}
        <Message msg={msg} erreur={erreur} />
        {themes && themes.length ? <button type="button" className="btn primary" disabled={busy} onClick={sauver}>{busy ? "Enregistrement…" : "Enregistrer les thèmes"}</button> : null}
      </main>
    </>
  );
}
