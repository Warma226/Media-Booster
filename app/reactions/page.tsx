"use client";
// Réactions en direct : j'aime, commentaires et partages des posts publiés ces 14 derniers jours.
// L'écran se met à jour seul toutes les 30 secondes tant qu'il est affiché ; une hausse s'affiche en « +n ».
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/BottomNav";
import type { Compteurs, ReactionsPost } from "@/lib/reactions";

type Reponse = { posts: ReactionsPost[]; facebook: boolean; linkedin: boolean; at: string; error?: string };
const INTERVALLE = 30000;

const somme = (posts: ReactionsPost[], k: keyof Compteurs) => posts.reduce((n, p) => n + (p.facebook?.[k] ?? 0) + (p.linkedin?.[k] ?? 0), 0);
const fmt = (n: number) => n.toLocaleString("fr-FR");

function ilYa(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return min <= 1 ? "à l'instant" : `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function Compte({ n, avant, mot }: { n: number; avant?: number; mot: string }) {
  const hausse = avant !== undefined && n > avant ? n - avant : 0;
  return (
    <span className="mb-rx-compte">
      <strong>{fmt(n)}</strong> {mot}{n > 1 ? "s" : ""}
      {hausse ? <em className="mb-rx-hausse" aria-label={`${hausse} de plus`}>+{hausse}</em> : null}
    </span>
  );
}

function Reseau({ nom, c, avant }: { nom: string; c: Compteurs & { url?: string }; avant?: Compteurs }) {
  const ligne = (
    <>
      <span className="mb-rx-reseau">{nom}</span>
      <Compte n={c.reactions} avant={avant?.reactions} mot="réaction" />
      <Compte n={c.commentaires} avant={avant?.commentaires} mot="commentaire" />
      {nom === "Facebook" ? <Compte n={c.partages} avant={avant?.partages} mot="partage" /> : null}
    </>
  );
  return c.url ? <a className="mb-rx-ligne" href={c.url} target="_blank" rel="noopener noreferrer">{ligne}</a> : <div className="mb-rx-ligne">{ligne}</div>;
}

export default function Reactions() {
  const [d, setD] = useState<Reponse | null>(null);
  const [erreur, setErreur] = useState("");
  const precedent = useRef<Map<string, { facebook?: Compteurs; linkedin?: Compteurs }>>(new Map());
  const [avant, setAvant] = useState<Map<string, { facebook?: Compteurs; linkedin?: Compteurs }>>(new Map());

  const charger = useCallback(async () => {
    try {
      const r = await fetch("/api/reactions", { cache: "no-store" });
      const j = (await r.json()) as Reponse;
      if (!r.ok) throw new Error(j.error ?? "Réactions indisponibles pour le moment.");
      // Les compteurs du passage précédent servent à montrer les hausses (« +3 »).
      setAvant(new Map(precedent.current));
      precedent.current = new Map(j.posts.map((p) => [p.id, { facebook: p.facebook ?? undefined, linkedin: p.linkedin ?? undefined }]));
      setD(j);
      setErreur("");
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, []);

  useEffect(() => {
    charger();
    let minuteur = window.setInterval(() => document.visibilityState === "visible" && charger(), INTERVALLE);
    const auRetour = () => {
      if (document.visibilityState !== "visible") return;
      charger();
      window.clearInterval(minuteur);
      minuteur = window.setInterval(() => document.visibilityState === "visible" && charger(), INTERVALLE);
    };
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      window.clearInterval(minuteur);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, [charger]);

  const posts = d?.posts ?? [];
  const avecStats = posts.filter((p) => p.facebook || p.linkedin);

  return (
    <>
      <TopBar title="Réactions" back="/" />
      <main className="page sub mb-rx">
        <p className="mb-rx-direct" role="status" aria-live="polite">
          <span className="mb-rx-point" aria-hidden="true" />
          {d ? `En direct · mis à jour à ${new Date(d.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "Chargement…"}
        </p>

        {erreur ? <p className="notice rouge" role="alert">{erreur}</p> : null}

        {d && !d.facebook ? (
          <section className="card mb-rx-vide">
            <h2>Reliez votre page Facebook</h2>
            <p className="muted">Les réactions de vos posts s&apos;afficheront ici dès que votre page est reliée.</p>
            <Link href="/connexions" className="btn primary">Relier ma page</Link>
          </section>
        ) : null}

        {d && d.facebook ? (
          <>
            <ul className="mb-rx-totaux" aria-label="Sur les 14 derniers jours">
              <li><strong>{fmt(somme(avecStats, "reactions"))}</strong><span>réactions</span></li>
              <li><strong>{fmt(somme(avecStats, "commentaires"))}</strong><span>commentaires</span></li>
              <li><strong>{fmt(somme(avecStats, "partages"))}</strong><span>partages</span></li>
            </ul>
            <p className="muted small">Vos posts des 14 derniers jours. Touchez une ligne pour ouvrir le post.{!d.linkedin ? " Les chiffres LinkedIn arriveront quand LinkedIn aura validé l'accès aux pages." : ""}</p>

            {posts.length === 0 ? (
              <section className="card mb-rx-vide">
                <p className="muted">Vos posts publiés apparaîtront ici, avec leurs réactions qui montent en direct.</p>
                <Link href="/creer" className="btn primary">Créer un post</Link>
              </section>
            ) : (
              <ol className="mb-rx-liste">
                {posts.map((p) => {
                  const a = avant.get(p.id);
                  return (
                    <li key={p.id} className="mb-rx-post">
                      {p.photo ? <img src={p.photo} alt="" width={56} height={56} loading="lazy" /> : null}
                      <div className="mb-rx-corps">
                        <strong className="mb-rx-titre">{p.titre}</strong>
                        <small className="muted">Publié {ilYa(p.publieLe)}</small>
                        {p.facebook ? <Reseau nom="Facebook" c={p.facebook} avant={a?.facebook} /> : null}
                        {p.linkedin ? <Reseau nom="LinkedIn" c={p.linkedin} avant={a?.linkedin} /> : null}
                        {!p.facebook && !p.linkedin ? <small className="muted">Pas encore de chiffres pour ce post.</small> : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {somme(avecStats, "commentaires") ? <Link href="/communaute" className="btn">Répondre aux commentaires</Link> : null}
          </>
        ) : null}
      </main>
    </>
  );
}
