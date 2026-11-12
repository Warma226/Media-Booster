"use client";
// Guide de démarrage : les étapes pour que Media Booster publie pour le client. Chaque étape se coche toute seule.
import Link from "next/link";
import { useEffect, useState } from "react";
import { getInfo, saveSettings, type Info } from "@/lib/client";
import { chargerProfil } from "@/components/Profil";
import { rubriquesActives } from "@/lib/marque";
import { SigneBoost } from "@/components/Logo";

type Etape = { href: string; titre: string; texte: string; fait: boolean; facultatif?: boolean };

export default function Demarrage() {
  const [info, setInfo] = useState<Info | null>(null);
  const [espace, setEspace] = useState<{ nom: string; statut: string; essai_fin: string | null } | null>(null);
  useEffect(() => {
    getInfo().then(setInfo).catch(() => {});
    fetch("/api/compte", { cache: "no-store" }).then((r) => r.json()).then((d) => setEspace(d.espace ?? null)).catch(() => {});
  }, []);
  const s = info?.settings;
  const relie = Object.values(info?.connections ?? {}).some((c) => c.configured);
  const proposee = (s?.customSources?.length ?? 0) > 0 || (s?.themes?.length ?? 0) > 0;
  const etapes: Etape[] = [
    { href: "/marque", titre: "Votre média", texte: "Son nom, son public et sa ligne éditoriale. C'est tout ce qu'il faut pour la suite.", fait: Boolean(s?.marque?.description || s?.marque?.public || s?.marque?.ligne) },
    { href: "/rubriques", titre: "Vos rubriques", texte: "Actualité, citation, notion du jour, portrait : gardez celles qui vous ressemblent.", fait: rubriquesActives(s?.rubriques).length > 0 },
    { href: "/proposition", titre: "Votre veille, préparée pour vous", texte: proposee ? "Sources, sujets et heures de publication en place. Touchez pour en proposer d'autres." : "Media Booster choisit vos sources, vos sujets et vos heures de publication. Vous validez d'un bouton.", fait: proposee },
    { href: "/connexions", titre: "Vos pages", texte: "Reliez votre page Facebook, LinkedIn ou votre site.", fait: relie },
  ];

  const faites = etapes.filter((e) => e.fait && !e.facultatif).length, total = etapes.filter((e) => !e.facultatif).length;
  const essaiFin = espace?.statut === "essai" && espace.essai_fin ? new Date(espace.essai_fin) : null;

  async function terminer() {
    await saveSettings({ demarrageFini: true }).catch(() => {});
    await chargerProfil(true);
    window.location.href = "/";
  }

  return (
    <main className="page mb-demarrage">
      <header className="mb-demarrage-tete">
        <span className="mb-auth-tuile" aria-hidden="true"><SigneBoost size={24} /></span>
        <div>
          <h1>Bienvenue{espace?.nom ? ` chez ${espace.nom}` : ""}</h1>
          <p>{faites === total ? "Tout est prêt. Votre média peut publier." : `${faites} étape${faites > 1 ? "s" : ""} sur ${total} terminée${faites > 1 ? "s" : ""}.`}</p>
        </div>
      </header>
      <div className="mb-progression" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={faites}><span style={{ width: `${(faites / total) * 100}%` }} /></div>
      {essaiFin ? <p className="notice ambre">Essai gratuit jusqu&apos;au {essaiFin.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {essaiFin.getHours()} h {String(essaiFin.getMinutes()).padStart(2, "0")}. <Link href="/abonnement">Voir les formules</Link></p> : null}
      <ol className="mb-etapes">
        {etapes.map((e, i) => (
          <li key={e.href}>
            <Link href={e.href} className={`mb-etape${e.fait ? " fait" : ""}`}>
              <span className="mb-etape-num" aria-hidden="true">{e.fait ? "✓" : i + 1}</span>
              <span className="mb-etape-texte"><strong>{e.titre}{e.facultatif ? <small> · facultatif</small> : null}</strong><span>{e.texte}</span></span>
              <span aria-hidden="true" className="mb-etape-fleche">›</span>
            </Link>
          </li>
        ))}
      </ol>
      <button type="button" className="btn primary" onClick={terminer}>{faites === total ? "Ouvrir le tableau de bord" : "Continuer plus tard"}</button>

      <details className="mb-avance">
        <summary>Réglages avancés</summary>
        <p className="muted small">Pour ajouter vous-même une source, un sujet ou une règle. Tout se règle aussi depuis la proposition.</p>
        <nav aria-label="Réglages avancés">
          <Link href="/sources">Sources de veille</Link>
          <Link href="/themes">Sujets suivis</Link>
          <Link href="/declencheurs">Règles de publication</Link>
          <Link href="/abonnement">Abonnement</Link>
        </nav>
      </details>
    </main>
  );
}
