"use client";
// Application installable : active le service worker et affiche, en haut de l'écran,
// - « Installer Media Booster » (Android, Chrome, Edge) ou le mode d'emploi pour iPhone (Safari) ;
// - « Nouvelle version disponible » quand une mise à jour de l'app est prête ;
// - « Hors connexion » quand le téléphone perd le réseau.
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SigneBoost } from "@/components/Logo";

type InvitationInstall = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Bandeau = "installer" | "iphone" | "maj" | null;

const CLE_REFUS = "mb-install-refus";
const PAUSE_REFUS = 14 * 24 * 3600 * 1000; // on repropose l'installation 14 jours après un « Plus tard »

function lire(cle: string): string | null {
  try { return window.localStorage.getItem(cle); } catch { return null; }
}
function ecrire(cle: string, valeur: string) {
  try { window.localStorage.setItem(cle, valeur); } catch { /* stockage indisponible : sans conséquence */ }
}

function dejaInstallee(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}
function surIphoneSafari(): boolean {
  const ua = window.navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return ios && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}
function refusRecent(): boolean {
  const t = Number(lire(CLE_REFUS) ?? 0);
  return Boolean(t) && Date.now() - t < PAUSE_REFUS;
}

export function Pwa() {
  const path = usePathname();
  const [bandeau, setBandeau] = useState<Bandeau>(null);
  const [horsLigne, setHorsLigne] = useState(false);
  const invitation = useRef<InvitationInstall | null>(null);
  const enAttente = useRef<ServiceWorker | null>(null);

  // Service worker (en production seulement : en développement il gênerait le rechargement à chaud).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let recharge = false;
    let minuteur = 0;
    const surChangement = () => {
      if (recharge) return;
      recharge = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", surChangement);
    const signaler = (sw: ServiceWorker | null) => {
      if (sw && navigator.serviceWorker.controller) {
        enAttente.current = sw;
        setBandeau("maj");
      }
    };
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        signaler(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const nouveau = reg.installing;
          nouveau?.addEventListener("statechange", () => {
            if (nouveau.state === "installed") signaler(nouveau);
          });
        });
        // L'app reste ouverte longtemps sur un téléphone : on vérifie les mises à jour toutes les heures.
        minuteur = window.setInterval(() => reg.update().catch(() => undefined), 3600 * 1000);
      })
      .catch(() => undefined);
    return () => {
      window.clearInterval(minuteur);
      navigator.serviceWorker.removeEventListener("controllerchange", surChangement);
    };
  }, []);

  // Invitation à installer.
  useEffect(() => {
    if (dejaInstallee()) return;
    const surInvitation = (e: Event) => {
      e.preventDefault();
      invitation.current = e as InvitationInstall;
      if (!refusRecent()) setBandeau((b) => b ?? "installer");
    };
    const surInstallee = () => {
      invitation.current = null;
      setBandeau((b) => (b === "installer" || b === "iphone" ? null : b));
    };
    window.addEventListener("beforeinstallprompt", surInvitation);
    window.addEventListener("appinstalled", surInstallee);
    if (surIphoneSafari() && !refusRecent()) setBandeau((b) => b ?? "iphone");
    return () => {
      window.removeEventListener("beforeinstallprompt", surInvitation);
      window.removeEventListener("appinstalled", surInstallee);
    };
  }, []);

  // Réseau.
  useEffect(() => {
    const maj = () => setHorsLigne(!navigator.onLine);
    maj();
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
    };
  }, []);

  async function installer() {
    const inv = invitation.current;
    if (!inv) return;
    await inv.prompt();
    const choix = await inv.userChoice.catch(() => ({ outcome: "dismissed" as const }));
    invitation.current = null;
    if (choix.outcome === "dismissed") ecrire(CLE_REFUS, String(Date.now()));
    setBandeau(null);
  }
  function plusTard() {
    ecrire(CLE_REFUS, String(Date.now()));
    setBandeau(null);
  }
  function mettreAJour() {
    enAttente.current?.postMessage("maj");
    setBandeau(null);
  }

  if (path.startsWith("/hors-ligne")) return null;

  return (
    <div className="tv-pwa-zone" aria-live="polite">
      {horsLigne ? (
        <div className="tv-pwa tv-pwa-reseau" role="status">
          <span className="tv-pwa-point" aria-hidden="true" />
          <span><strong>Hors connexion.</strong> Les actions reprendront au retour du réseau.</span>
        </div>
      ) : null}

      {bandeau === "maj" ? (
        <div className="tv-pwa" role="status">
          <span className="tv-pwa-tuile" aria-hidden="true"><SigneBoost size={20} /></span>
          <span className="tv-pwa-texte"><strong>Nouvelle version disponible</strong><small>Une mise à jour de Media Booster est prête.</small></span>
          <button type="button" className="tv-pwa-btn" onClick={mettreAJour}>Mettre à jour</button>
        </div>
      ) : null}

      {bandeau === "installer" ? (
        <div className="tv-pwa">
          <span className="tv-pwa-tuile" aria-hidden="true"><SigneBoost size={20} /></span>
          <span className="tv-pwa-texte"><strong>Installer Media Booster</strong><small>Accès direct, en plein écran.</small></span>
          <button type="button" className="tv-pwa-btn" onClick={installer}>Installer</button>
          <button type="button" className="tv-pwa-fermer" onClick={plusTard} aria-label="Plus tard">×</button>
        </div>
      ) : null}

      {bandeau === "iphone" ? (
        <div className="tv-pwa">
          <span className="tv-pwa-tuile" aria-hidden="true"><SigneBoost size={20} /></span>
          <span className="tv-pwa-texte">
            <strong>Installer sur iPhone</strong>
            <small>
              Touchez <span className="tv-pwa-partager" aria-label="Partager">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" /></svg>
              </span> puis « Sur l&apos;écran d&apos;accueil ».
            </small>
          </span>
          <button type="button" className="tv-pwa-fermer" onClick={plusTard} aria-label="Fermer">×</button>
        </div>
      ) : null}
    </div>
  );
}
