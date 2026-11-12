"use client";
// Ma marque : identité du média du client. Elle guide l'IA (ton, public, ligne éditoriale) et signe les visuels.
import Link from "next/link";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/BottomNav";
import { useProfil } from "@/components/Profil";
import { Message, useEnregistrer } from "@/components/Reglages";
import type { Marque, TonMedia } from "@/lib/marque";

const TONS: { id: TonMedia; nom: string; texte: string }[] = [
  { id: "neutre", nom: "Neutre", texte: "Factuel, sobre, à la troisième personne" },
  { id: "chaleureux", nom: "Chaleureux", texte: "Accessible, proche du lecteur, vouvoiement" },
  { id: "dynamique", nom: "Dynamique", texte: "Direct, phrases courtes, accroches fortes" },
];

export default function MaMarque() {
  const profil = useProfil();
  const [m, setM] = useState<Marque | null>(null);
  const { busy, msg, erreur, enregistrer } = useEnregistrer();

  useEffect(() => {
    if (profil && !m) {
      const s = profil.marqueSaisie;
      setM({ ...s, nom: s.nom ?? profil.marque.nom, ton: s.ton ?? "neutre", devise: s.devise ?? "FCFA" });
    }
  }, [profil, m]);

  const champ = (k: keyof Marque) => ({ value: (m?.[k] as string) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setM({ ...(m ?? {}), [k]: e.target.value }) });

  async function sauver(e: React.FormEvent) {
    e.preventDefault();
    if (!m?.nom?.trim()) return;
    await enregistrer({ marque: m }, "Marque enregistrée. Elle s'applique aux prochains posts et visuels.");
  }

  return (
    <>
      <TopBar title="Ma marque" back="/demarrage" />
      <main className="page sub">
        <p className="muted">Ces informations guident l&apos;IA quand elle rédige, et signent vos visuels. Vous pouvez les changer à tout moment.</p>
        {!m ? <p className="muted">Chargement…</p> : (
          <form onSubmit={sauver} className="stack mb-form" style={{ gap: 16 }}>
            <label className="field">Nom du média
              <input type="text" maxLength={60} required placeholder="Ex. Dakar Info" {...champ("nom")} />
            </label>
            <label className="field">Sigle (logo des visuels)
              <input type="text" maxLength={8} placeholder="Ex. DTI" {...champ("court")} />
              <small className="muted small">2 à 6 lettres, affichées en haut des visuels générés.</small>
            </label>
            <label className="field">Site web (facultatif)
              <input type="text" inputMode="url" placeholder="www.monmedia.com" {...champ("site")} />
            </label>
            <label className="field">Page Facebook (facultatif)
              <input type="text" inputMode="url" placeholder="https://www.facebook.com/monmedia" {...champ("facebook")} />
            </label>
            <label className="field">Votre média en une phrase
              <input type="text" maxLength={160} placeholder="Ex. média d'actualité économique" {...champ("description")} />
            </label>
            <label className="field">Public visé
              <input type="text" maxLength={120} placeholder="Ex. les jeunes actifs du Sénégal" {...champ("public")} />
            </label>
            <label className="field">Ligne éditoriale (facultatif)
              <textarea rows={4} maxLength={800} placeholder="Ex. L'économie et l'entrepreneuriat au Sénégal, expliqués simplement. Priorité aux PME et aux jeunes." {...champ("ligne")} />
              <small className="muted small">Ce que vous traitez, ce que vous évitez, vos priorités. L&apos;IA s&apos;y tient.</small>
            </label>
            <fieldset className="mb-choix">
              <legend>Ton des publications</legend>
              {TONS.map((t) => (
                <label key={t.id} className="mb-choix-ligne">
                  <input type="radio" name="ton" checked={(m.ton ?? "neutre") === t.id} onChange={() => setM({ ...m, ton: t.id })} />
                  <span><strong>{t.nom}</strong><small>{t.texte}</small></span>
                </label>
              ))}
            </fieldset>
            <label className="field">Devise de conversion des montants
              <input type="text" maxLength={8} placeholder="FCFA (laisser vide pour ne pas convertir)" {...champ("devise")} />
            </label>
            <Message msg={msg} erreur={erreur} />
            {msg && !erreur ? <Link href="/rubriques" className="btn">Suivant : mes rubriques</Link> : null}
            <button type="submit" className="btn primary" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
          </form>
        )}
      </main>
    </>
  );
}
