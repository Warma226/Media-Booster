// Politique de confidentialité de Media Booster (page publique, demandée par TikTok et Meta).
import { MEDIA_NOM, MEDIA_SITE, MEDIA_URL } from "@/lib/brand";

export const metadata = { title: "Politique de confidentialité · Media Booster" };

export default function Confidentialite() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px", lineHeight: 1.65, fontSize: 16 }}>
      <h1 style={{ fontSize: 28 }}>Politique de confidentialité de Media Booster</h1>
      <p style={{ color: "#667" }}>Dernière mise à jour : 5 novembre 2026</p>

      <h2>1. Qui sommes-nous</h2>
      <p>Media Booster est l'outil de publication interne de {MEDIA_NOM}. Il sert uniquement à publier les contenus de {MEDIA_NOM} sur ses propres comptes (site web, Facebook, LinkedIn, TikTok).</p>

      <h2>2. Données traitées</h2>
      <ul>
        <li><strong>Comptes reliés</strong> : lorsque {MEDIA_NOM} relie l'un de ses comptes (par exemple TikTok), l'outil reçoit et conserve les jetons d'accès fournis par la plateforme, l'identifiant du compte et son nom d'affichage. Ces informations servent uniquement à publier les contenus de {MEDIA_NOM} sur ce compte.</li>
        <li><strong>Contenus</strong> : textes, visuels et photos préparés par l'équipe {MEDIA_NOM} pour publication.</li>
      </ul>
      <p>Media Booster ne collecte pas de données sur les abonnés ou visiteurs des comptes de {MEDIA_NOM}, n'affiche pas de publicité et ne vend ni ne partage aucune donnée.</p>

      <h2>3. Conservation et sécurité</h2>
      <p>Les jetons d'accès sont stockés côté serveur, dans une base de données protégée, et ne sont jamais affichés dans le navigateur. Ils sont conservés tant que le compte reste relié et supprimés lorsque {MEDIA_NOM} retire l'autorisation.</p>

      <h2>4. Retrait de l'autorisation</h2>
      <p>Le titulaire d'un compte relié peut retirer l'accès de Media Booster à tout moment depuis les paramètres de sécurité ou d'applications de la plateforme concernée (par exemple, dans TikTok : Paramètres et confidentialité › Sécurité › Applications et services).</p>

      <h2>5. Contact</h2>
      <p>Pour toute question sur cette politique : {MEDIA_NOM}{MEDIA_URL ? <>, <a href={MEDIA_URL}>{MEDIA_SITE}</a></> : null}.</p>

      <p style={{ marginTop: 32 }}><a href="/cgu">Conditions d'utilisation</a></p>
    </main>
  );
}
