"use client";
// Rubriques : le client choisit parmi quatre modèles ceux qu'il veut utiliser, et leur donne son propre nom,
// hashtag, description et horaire. Rien n'est activé tant qu'il ne l'a pas décidé.
import { useEffect, useState } from "react";
import { TopBar } from "@/components/BottomNav";
import { useProfil } from "@/components/Profil";
import { Message, useEnregistrer } from "@/components/Reglages";
import { MODELES, ORDRE_MODELES, hashtagPropre, type RubriqueClient } from "@/lib/marque";

const vide = (id: RubriqueClient["id"]): RubriqueClient => ({ id, nom: "", hashtag: "", description: "", heure: MODELES[id].heureParDefaut ?? null, active: false });

export default function Rubriques() {
  const profil = useProfil();
  const [liste, setListe] = useState<RubriqueClient[] | null>(null);
  const { busy, msg, erreur, enregistrer } = useEnregistrer();
  const [alerte, setAlerte] = useState("");

  useEffect(() => {
    if (profil && !liste) setListe(ORDRE_MODELES.map((id) => profil.rubriques.find((r) => r.id === id) ?? vide(id)));
  }, [profil, liste]);

  const maj = (id: string, p: Partial<RubriqueClient>) => setListe((l) => (l ?? []).map((r) => (r.id === id ? { ...r, ...p } : r)));

  async function sauver() {
    if (!liste) return;
    const manque = liste.find((r) => r.active && !r.nom.trim());
    setAlerte(manque ? `Donnez un nom à la rubrique « ${MODELES[manque.id].modele} » avant de l'activer.` : "");
    if (manque) return;
    const propre = liste.map((r) => ({ ...r, nom: r.nom.trim().slice(0, 40), hashtag: hashtagPropre(r.hashtag || r.nom), description: r.description.trim().slice(0, 200) }));
    await enregistrer({ rubriques: propre }, `${propre.filter((r) => r.active).length} rubrique(s) active(s) enregistrée(s).`);
    setListe(propre);
  }

  return (
    <>
      <TopBar title="Rubriques" back="/demarrage" />
      <main className="page sub">
        <p className="muted">Activez les types de publications que votre média propose, puis nommez-les à votre façon. Chaque type a son atelier et ses règles.</p>
        {!liste ? <p className="muted">Chargement…</p> : (
          <div className="stack" style={{ gap: 14 }}>
            {liste.map((r) => {
              const m = MODELES[r.id];
              return (
                <section key={r.id} className={`card mb-rub${r.active ? " on" : ""}`}>
                  <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: 16 }}>{m.modele}</strong>
                      <span className="muted small" style={{ display: "block", marginTop: 4 }}>{m.explication}</span>
                    </span>
                    <button type="button" role="switch" aria-checked={r.active} aria-label={`Activer ${m.modele}`} className={`switch${r.active ? " on" : ""}`} onClick={() => maj(r.id, { active: !r.active, nom: r.nom || m.exempleNom, hashtag: r.hashtag || m.exempleHashtag })}><span /></button>
                  </div>
                  {r.active ? (
                    <div className="stack mb-form" style={{ gap: 12, marginTop: 6 }}>
                      <div className="grid2">
                        <label className="field">Nom affiché<input type="text" maxLength={40} placeholder={m.exempleNom} value={r.nom} onChange={(e) => maj(r.id, { nom: e.target.value })} /></label>
                        <label className="field">Hashtag<input type="text" maxLength={30} placeholder={m.exempleHashtag} value={r.hashtag} onChange={(e) => maj(r.id, { hashtag: e.target.value })} onBlur={(e) => maj(r.id, { hashtag: hashtagPropre(e.target.value) })} /></label>
                      </div>
                      <label className="field">Description (pour vous et votre équipe)<input type="text" maxLength={200} placeholder="Ce que contient cette rubrique" value={r.description} onChange={(e) => maj(r.id, { description: e.target.value })} /></label>
                      {r.id === "cyberbase" ? (
                        <label className="field">Heure de publication chaque jour
                          <select value={r.heure ?? 7} onChange={(e) => maj(r.id, { heure: Number(e.target.value) })}>
                            {Array.from({ length: 18 }, (_, i) => i + 5).map((h) => <option key={h} value={h}>{h} h</option>)}
                          </select>
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              );
            })}
            <Message msg={alerte || msg} erreur={Boolean(alerte) || erreur} />
            <button type="button" className="btn primary" disabled={busy} onClick={sauver}>{busy ? "Enregistrement…" : "Enregistrer les rubriques"}</button>
          </div>
        )}
      </main>
    </>
  );
}
