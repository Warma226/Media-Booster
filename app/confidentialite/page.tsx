// Politique de confidentialité de Media Booster (page publique, demandée par Meta, LinkedIn, TikTok et CinetPay).
// Modèle à faire relire par un juriste avant la mise en vente.
export const metadata = { title: "Politique de confidentialité · Media Booster" };

export default function Confidentialite() {
  return (
    <main className="mb-legal">
      <h1>Politique de confidentialité</h1>
      <p className="mb-legal-date">Dernière mise à jour : 12 novembre 2026</p>

      <h2>Ce que nous conservons</h2>
      <ul>
        <li><strong>Votre compte</strong> : nom, e-mail, mot de passe (stocké sous forme chiffrée, jamais en clair), appareils connectés.</li>
        <li><strong>Votre espace</strong> : nom et réglages du média, rubriques, sources, publications, visuels et fichiers importés.</li>
        <li><strong>Comptes reliés</strong> : pour publier sur vos pages, les jetons d&apos;accès fournis par Facebook, LinkedIn ou TikTok, l&apos;identifiant et le nom de vos pages. Ils sont stockés côté serveur et ne sont jamais affichés dans le navigateur.</li>
        <li><strong>Abonnement</strong> : formule, dates et références des paiements. Les données de carte ou de mobile money sont traitées par CinetPay, pas par Media Booster.</li>
        <li><strong>Community manager</strong> : si vous l&apos;activez, les commentaires et messages publics reçus sur votre page, pour y répondre.</li>
      </ul>

      <h2>Ce que nous ne faisons pas</h2>
      <p>Nous ne vendons ni ne louons aucune donnée, n&apos;affichons pas de publicité et ne collectons pas de données sur les visiteurs de vos pages au-delà de ce qui sert à leur répondre. Les données d&apos;un espace ne sont jamais accessibles aux autres clients.</p>

      <h2>Prestataires</h2>
      <p>Hébergement (Vercel), base de données et fichiers (Supabase), paiement (CinetPay), rédaction par intelligence artificielle (Google Gemini ou Anthropic Claude, qui reçoivent seulement les textes à rédiger), et les plateformes que vous reliez.</p>

      <h2>Durée et suppression</h2>
      <p>Vos données sont conservées tant que votre espace existe, puis 90 jours après la fin de l&apos;abonnement. Vous pouvez demander à tout moment l&apos;export ou la suppression de votre espace, et retirer l&apos;accès de Media Booster depuis les paramètres de Facebook, LinkedIn ou TikTok ; les jetons concernés sont alors inutilisables.</p>

      <h2>Contact</h2>
      <p>Pour toute demande sur vos données, écrivez-nous depuis l&apos;application (écran Mon compte).</p>

      <p style={{ marginTop: 32 }}><a href="/cgu">Conditions d&apos;utilisation</a> · <a href="/acces">Retour à la connexion</a></p>
    </main>
  );
}
