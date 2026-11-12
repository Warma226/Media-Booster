// Installation de l'application (PWA), partagée par le bandeau de l'app et la page d'accueil publique.
// Chrome et Edge (Android, ordinateur) proposent l'installation via l'événement « beforeinstallprompt » ;
// Safari (iPhone) n'a pas d'invitation : on explique « Partager › Sur l'écran d'accueil ».

type Invitation = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let invitation: Invitation | null = null;
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // on garde l'invitation pour l'ouvrir au clic sur « Installer »
    invitation = e as Invitation;
    prevenir();
  });
  window.addEventListener("appinstalled", () => {
    invitation = null;
    prevenir();
  });
}

export type Plateforme = "installee" | "invitation" | "iphone" | "autre";

export function dejaInstallee(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}
export function surIphone(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}
export function surIphoneSafari(): boolean {
  const ua = typeof window === "undefined" ? "" : window.navigator.userAgent;
  return surIphone() && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}

/** Ce qu'on peut proposer sur cet appareil, maintenant. */
export function plateforme(): Plateforme {
  if (dejaInstallee()) return "installee";
  if (invitation) return "invitation";
  if (surIphone()) return "iphone";
  return "autre";
}

/** Ouvre la fenêtre d'installation du navigateur. Renvoie true si la personne a accepté. */
export async function installer(): Promise<boolean> {
  if (!invitation) return false;
  const inv = invitation;
  await inv.prompt();
  const choix = await inv.userChoice.catch(() => ({ outcome: "dismissed" as const }));
  invitation = null;
  prevenir();
  return choix.outcome === "accepted";
}

export function suivre(f: () => void): () => void {
  abonnes.add(f);
  return () => { abonnes.delete(f); };
}
