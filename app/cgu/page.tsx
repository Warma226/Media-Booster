// Conditions d'utilisation de Media Booster (page publique, demandée par Meta, LinkedIn, TikTok et CinetPay).
// Modèle à faire relire par un juriste avant la mise en vente.
import { ESSAI_HEURES, FORMULES, prixTexte } from "@/lib/abonnement";

export const metadata = { title: "Conditions d'utilisation · Media Booster" };

export default function CGU() {
  return (
    <main className="mb-legal">
      <h1>Conditions d&apos;utilisation de Media Booster</h1>
      <p className="mb-legal-date">Dernière mise à jour : 12 novembre 2026</p>

      <h2>1. Le service</h2>
      <p>Media Booster est une application en ligne qui aide les médias, créateurs et entreprises à surveiller l&apos;actualité de leurs sources, rédiger des publications avec l&apos;aide de l&apos;intelligence artificielle, créer des visuels et publier sur leurs propres comptes (site WordPress, pages Facebook et LinkedIn, TikTok) ou partager sur WhatsApp.</p>

      <h2>2. Compte et espace</h2>
      <p>L&apos;inscription crée un espace propre à votre média. Vous êtes responsable de l&apos;exactitude des informations fournies, de la confidentialité de votre mot de passe et des membres que vous invitez dans votre espace. Les données d&apos;un espace ne sont jamais visibles depuis un autre espace.</p>

      <h2>3. Essai et abonnement</h2>
      <p>Chaque nouvel espace bénéficie d&apos;un essai gratuit de {ESSAI_HEURES} heures. Ensuite, l&apos;accès demande un abonnement mensuel : {Object.values(FORMULES).map((f) => `${f.nom} (${prixTexte(f.prix)})`).join(", ")}. Le paiement est traité par CinetPay (mobile money ou carte) ; Media Booster ne reçoit ni ne conserve vos données de paiement. Chaque paiement ouvre 30 jours d&apos;accès, sans renouvellement automatique. À l&apos;échéance, l&apos;accès est suspendu jusqu&apos;au paiement suivant ; vos données sont conservées 90 jours, puis peuvent être supprimées.</p>

      <h2>4. Comptes de réseaux sociaux reliés</h2>
      <p>Vous ne reliez que des comptes et pages dont vous êtes administrateur, via les connexions officielles de chaque plateforme. Vous pouvez retirer ces autorisations à tout moment depuis l&apos;application (Connexions) ou depuis les paramètres de la plateforme concernée. Vous respectez les règles de chaque plateforme.</p>

      <h2>5. Vos contenus</h2>
      <p>Vous restez propriétaire de vos contenus et seul responsable de ce qui est publié depuis votre espace, y compris les textes proposés par l&apos;intelligence artificielle, que vous devez relire. Vous vous engagez à respecter le droit d&apos;auteur, le droit à l&apos;image, la vie privée et à citer vos sources. Sont interdits les contenus illégaux, haineux, trompeurs ou de spam.</p>

      <h2>6. Disponibilité et responsabilité</h2>
      <p>Media Booster est fourni avec soin mais sans garantie d&apos;absence d&apos;interruption. Le service dépend de plateformes tierces (Facebook, LinkedIn, TikTok, WordPress, CinetPay, fournisseurs d&apos;IA) dont les changements peuvent limiter certaines fonctions. La responsabilité de Media Booster est limitée au montant payé pour le mois en cours.</p>

      <h2>7. Résiliation</h2>
      <p>Vous pouvez cesser d&apos;utiliser le service à tout moment et demander la suppression de votre espace. Media Booster peut suspendre un espace en cas de non-respect de ces conditions.</p>

      <h2>8. Contact</h2>
      <p>Pour toute question, écrivez-nous depuis l&apos;application (écran Mon compte).</p>

      <p style={{ marginTop: 32 }}><a href="/confidentialite">Politique de confidentialité</a> · <a href="/acces">Retour à la connexion</a></p>
    </main>
  );
}
