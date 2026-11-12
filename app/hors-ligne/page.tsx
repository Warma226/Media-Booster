// Page affichée par l'application installée quand le téléphone n'a plus de connexion.
// Elle est mise en mémoire par le service worker (public/sw.js) dès la première visite.
import { SigneBoost } from "@/components/Logo";

export const metadata = { title: "Hors ligne · Media Booster" };
export const dynamic = "force-static";

export default function HorsLigne() {
  return (
    <main className="tv-hors-ligne">
      <span className="tv-hors-ligne-tuile" aria-hidden="true"><SigneBoost size={44} /></span>
      <h1>Pas de connexion</h1>
      <p>
        Media Booster a besoin d&apos;internet pour la veille, l&apos;IA et la publication.
        Vos brouillons sont gardés : rien n&apos;est perdu.
      </p>
      {/* Lien simple (pas de script) : recharge la page demandée dès que le réseau revient. */}
      <a className="btn primary" href="/">Réessayer</a>
      <p className="small muted">Astuce : activez les données mobiles ou le Wi-Fi, puis appuyez sur « Réessayer ».</p>
    </main>
  );
}
