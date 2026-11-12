"use client";
// Bouton « Installer l'application » de la page d'accueil publique. Il s'adapte à l'appareil :
// - Android, Chrome, Edge : ouvre la fenêtre d'installation du navigateur ;
// - iPhone : montre comment l'ajouter à l'écran d'accueil depuis Safari ;
// - application déjà installée : l'ouvre ;
// - ordinateur sans installation possible : invite à ouvrir la page sur le téléphone.
import { useEffect, useState } from "react";
import { installer, plateforme, suivre, surIphoneSafari, type Plateforme } from "@/lib/installation";

export function BoutonInstaller({ variante = "clair" }: { variante?: "clair" | "sombre" }) {
  const [p, setP] = useState<Plateforme | null>(null);
  const [aide, setAide] = useState<"iphone" | "iphone-autre" | "autre" | null>(null);
  const [fait, setFait] = useState(false);

  useEffect(() => {
    const maj = () => setP(plateforme());
    maj();
    return suivre(maj);
  }, []);

  async function clic() {
    if (p === "installee") return void (window.location.href = "/acces");
    if (p === "invitation") {
      if (await installer()) setFait(true);
      return;
    }
    setAide(p === "iphone" ? (surIphoneSafari() ? "iphone" : "iphone-autre") : "autre");
  }

  const libelle = fait ? "Application installée" : p === "installee" ? "Ouvrir l'application" : "Installer l'application";

  return (
    <div className={`mb-l-installer ${variante}`}>
      <button type="button" className="mb-l-btn principal" onClick={clic} disabled={fait} aria-expanded={aide ? true : undefined} aria-controls="aide-installation">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
        {libelle}
      </button>
      {fait ? <p className="mb-l-aide" role="status">C&apos;est fait : l&apos;icône Media Booster est sur votre écran d&apos;accueil.</p> : null}
      {aide ? (
        <div id="aide-installation" className="mb-l-aide" role="region" aria-label="Installer l'application">
          {aide === "iphone" ? (
            <ol>
              <li>Touchez le bouton <strong>Partager</strong> en bas de Safari <span className="mb-l-ico" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" /></svg></span></li>
              <li>Choisissez <strong>Sur l&apos;écran d&apos;accueil</strong>.</li>
              <li>Touchez <strong>Ajouter</strong> : l&apos;icône apparaît avec vos autres applications.</li>
            </ol>
          ) : aide === "iphone-autre" ? (
            <p>Sur iPhone, l&apos;installation se fait depuis <strong>Safari</strong>. Ouvrez cette page dans Safari, puis Partager › Sur l&apos;écran d&apos;accueil.</p>
          ) : (
            <p>Ouvrez cette page sur votre téléphone, dans <strong>Chrome</strong> (Android) ou <strong>Safari</strong> (iPhone), puis touchez « Installer l&apos;application ». Sur ordinateur, vous pouvez aussi utiliser Media Booster directement dans le navigateur.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
