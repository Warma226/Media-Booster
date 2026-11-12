// Page d'accueil publique de Media Booster : présenter l'application et la faire installer (PWA).
// Elle est servie par l'app elle-même : c'est depuis ce site que le téléphone peut installer l'application.
import type { Metadata } from "next";
import Link from "next/link";
import { SigneBoost } from "@/components/Logo";
import { BoutonInstaller } from "@/components/BoutonInstaller";
import { ESSAI_HEURES, FORMULES, prixTexte } from "@/lib/abonnement";

export const metadata: Metadata = {
  title: "Media Booster · Votre média publie partout, depuis votre téléphone",
  description: "Veille de vos sources, rédaction par l'IA, visuels à votre nom et publication sur Facebook, LinkedIn, votre site et WhatsApp. Application à installer sur Android et iPhone, 24 h d'essai gratuit.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Media Booster",
    description: "Votre média publie partout, depuis votre téléphone. 24 h d'essai gratuit.",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512 }],
    locale: "fr_FR",
    type: "website",
  },
};

const ACTUS = [
  { source: "Votre source éco", titre: "Mobile money : un nouveau paiement par QR code" },
  { source: "Votre source sport", titre: "Les Lions qualifiés pour la phase finale" },
  { source: "Votre source locale", titre: "Une levée de fonds record pour une startup locale" },
];

const ETAPES = [
  { titre: "Créez votre espace", texte: `Le nom de votre média, votre e-mail, un mot de passe. ${ESSAI_HEURES} h pour tout essayer, sans carte bancaire.` },
  { titre: "Reliez vos pages", texte: "Touchez « Se connecter avec Facebook », cochez votre page. Même chose pour LinkedIn et votre site." },
  { titre: "Ajoutez vos sources", texte: "Les sites que vous suivez déjà. Media Booster les lit en continu et vous propose les sujets du jour." },
];

const FONCTIONS = [
  {
    image: "/landing/veille.webp", alt: "Écran Veille : le sujet du jour repris par trois sources, classé par thème",
    titre: "Les sujets du jour arrivent tout seuls",
    texte: "Media Booster surveille vos sources et classe les actus selon les thèmes de votre public. Gardez la main sur chaque post, ou laissez le pilote automatique publier aux heures que vous choisissez.",
    points: ["Vos sources et vos thèmes, rien d'imposé", "Les sujets sensibles restent toujours en relecture", "10 minutes pour annuler une publication automatique"],
  },
  {
    image: "/landing/creer.webp", alt: "Écran Créer avec les rubriques du média",
    titre: "Un post prêt en une minute, à votre façon",
    texte: "Vos rubriques portent vos noms et vos hashtags. L'IA écrit un texte par réseau dans le ton de votre média, cite la source et prépare le visuel à votre sigle.",
    points: ["Actualité, citation, notion du jour, portrait", "Ton neutre, chaleureux ou dynamique", "Montants convertis en FCFA"],
  },
  {
    image: "/landing/connexions.webp", alt: "Écran Connexions : liste des pages Facebook avec la page choisie cochée",
    titre: "Publié partout à la fois",
    texte: "Connectez-vous avec Facebook ou LinkedIn : vos pages s'affichent, vous cochez la bonne. Votre site WordPress et TikTok se relient aussi. Pour WhatsApp, un geste suffit : le post s'ouvre prêt à envoyer dans votre chaîne ou votre groupe.",
    points: ["Aucun mot de passe de réseau à donner", "Une autorisation se retire en un clic", "Programmation au créneau qui vous va"],
  },
];

const QUESTIONS = [
  { q: "Faut-il passer par le Play Store ?", r: "Non. Media Booster s'installe depuis cette page, en un geste, et se met à jour tout seul. Il prend très peu de place sur le téléphone." },
  { q: "Est-ce que ça marche sur iPhone ?", r: "Oui. Ouvrez cette page dans Safari, touchez Partager puis « Sur l'écran d'accueil ». L'icône apparaît avec vos autres applications." },
  { q: "Comment se passe le paiement ?", r: "Par CinetPay : Orange Money, MTN, Moov, Wave ou carte bancaire. Chaque paiement ouvre 30 jours d'accès, sans prélèvement automatique." },
  { q: "Que se passe-t-il après l'essai ?", r: "L'accès se met en pause jusqu'à votre premier paiement. Vos posts, vos réglages et vos pages reliées sont conservés." },
  { q: "Mes comptes Facebook et LinkedIn sont-ils en sécurité ?", r: "Vous vous connectez sur la page officielle de Facebook ou de LinkedIn : Media Booster ne voit jamais votre mot de passe. Vous pouvez retirer l'accès à tout moment." },
  { q: "Peut-on publier dans une chaîne WhatsApp ?", r: "WhatsApp ne permet à aucune application de publier seule. Sur chaque post, le bouton « Partager sur WhatsApp » ouvre WhatsApp avec le texte et le visuel prêts : vous choisissez la chaîne ou le groupe et vous envoyez." },
];

function Marque({ clair = false }: { clair?: boolean }) {
  return (
    <span className={`mb-l-marque${clair ? " clair" : ""}`}>
      <span className="mb-l-tuile" aria-hidden="true"><SigneBoost size={20} /></span>
      Media Booster
    </span>
  );
}

export default function Bienvenue() {
  return (
    <div className="mb-l">
      <header className="mb-l-entete">
        <Marque />
        <Link href="/acces" className="mb-l-lien">Se connecter</Link>
      </header>

      <main>
        <section className="mb-l-hero" aria-labelledby="titre">
          <div className="mb-l-hero-texte">
            <h1 id="titre">Votre média publie partout, depuis votre téléphone.</h1>
            <p className="mb-l-chapo">Media Booster lit vos sources, rédige vos posts avec l&apos;IA, prépare les visuels et publie sur votre page Facebook, LinkedIn et votre site. Vous validez, il s&apos;occupe du reste.</p>
            <div className="mb-l-actions">
              <BoutonInstaller />
              <Link href="/inscription" className="mb-l-btn second">Essayer {ESSAI_HEURES} h gratuitement</Link>
            </div>
            <p className="mb-l-note">Pour Android et iPhone. Sans Play Store, sans carte bancaire.</p>
          </div>

          <div className="mb-l-scene" aria-hidden="true">
            <ul className="mb-l-fil">
              {ACTUS.map((a, i) => (
                <li key={a.titre} style={{ ["--i" as string]: i }}>
                  <small>{a.source}</small>
                  <span>{a.titre}</span>
                </li>
              ))}
            </ul>
            <div className="mb-l-telephone">
              <img src="/landing/accueil.webp" alt="" width={300} height={649} fetchPriority="high" />
            </div>
            <span className="mb-l-publie"><i />Publié sur Facebook et LinkedIn</span>
          </div>
        </section>

        <section className="mb-l-bloc mb-l-etapes" aria-labelledby="t-etapes">
          <h2 id="t-etapes">Prêt en dix minutes</h2>
          <ol>
            {ETAPES.map((e, i) => (
              <li key={e.titre}>
                <span className="mb-l-num" aria-hidden="true">{i + 1}</span>
                <h3>{e.titre}</h3>
                <p>{e.texte}</p>
              </li>
            ))}
          </ol>
        </section>

        {FONCTIONS.map((f, i) => (
          <section key={f.titre} className={`mb-l-bloc mb-l-fonction${i % 2 ? " inverse" : ""}`} aria-labelledby={`t-f${i}`}>
            <div className="mb-l-capture">
              <img src={f.image} alt={f.alt} width={300} height={649} loading="lazy" />
            </div>
            <div className="mb-l-fonction-texte">
              <h2 id={`t-f${i}`}>{f.titre}</h2>
              <p>{f.texte}</p>
              <ul>{f.points.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          </section>
        ))}

        <section className="mb-l-bloc mb-l-tarifs" aria-labelledby="t-tarifs" id="tarifs">
          <h2 id="t-tarifs">Un prix par mois, sans engagement</h2>
          <p className="mb-l-sous">{ESSAI_HEURES} h d&apos;essai gratuit, puis la formule de votre choix. Payez par mobile money ou carte, 30 jours à la fois.</p>
          <div className="mb-l-grille">
            {Object.values(FORMULES).map((f) => (
              <div key={f.id} className={`mb-l-formule${f.id === "pro" ? " conseillee" : ""}`}>
                <h3>{f.nom}{f.id === "pro" ? <span className="mb-l-pastille">Conseillée</span> : null}</h3>
                <p className="mb-l-pour">{f.accroche}</p>
                <p className="mb-l-prix"><strong>{prixTexte(f.prix)}</strong> par mois</p>
                <ul>{f.atouts.map((a) => <li key={a}>{a}</li>)}</ul>
              </div>
            ))}
          </div>
          <Link href="/inscription" className="mb-l-btn principal mb-l-centre">Commencer l&apos;essai gratuit</Link>
        </section>

        <section className="mb-l-bloc mb-l-faq" aria-labelledby="t-faq">
          <h2 id="t-faq">Vos questions</h2>
          {QUESTIONS.map((x) => (
            <details key={x.q}>
              <summary>{x.q}</summary>
              <p>{x.r}</p>
            </details>
          ))}
        </section>

        <section className="mb-l-final" aria-labelledby="t-final">
          <h2 id="t-final">Installez Media Booster et publiez votre premier post aujourd&apos;hui.</h2>
          <BoutonInstaller variante="sombre" />
          <Link href="/inscription" className="mb-l-lien clair">Ou créez votre espace dans le navigateur</Link>
        </section>
      </main>

      <footer className="mb-l-pied">
        <Marque />
        <nav aria-label="Liens légaux">
          <Link href="/cgu">Conditions d&apos;utilisation</Link>
          <Link href="/confidentialite">Confidentialité</Link>
          <Link href="/acces">Se connecter</Link>
        </nav>
      </footer>
    </div>
  );
}
