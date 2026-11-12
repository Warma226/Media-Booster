// Identité de Media Booster et du média qui publie avec.
// Tout se règle dans Vercel (Settings › Environment Variables), sans toucher au code, puis Redeploy.
// Les variables commencent par NEXT_PUBLIC_ pour être lisibles à la fois par le serveur et par l'écran.

const val = (v: string | undefined, defaut: string) => (v && v.trim()) || defaut;

/** Nom de l'application elle-même. */
export const APP_NOM = "Media Booster";

/** Nom du média, tel qu'il apparaît dans les posts, les visuels et les réponses aux abonnés. */
export const MEDIA_NOM = val(process.env.NEXT_PUBLIC_MEDIA_NOM, "Media Booster");

/** Version courte pour les logos texte des visuels (5 à 6 lettres idéalement). */
export const MEDIA_COURT = val(process.env.NEXT_PUBLIC_MEDIA_COURT, "BOOST").toUpperCase();

/** Site du média, sans https:// (ex. www.monmedia.com). Vide si le média n'a pas de site. */
export const MEDIA_SITE = val(process.env.NEXT_PUBLIC_MEDIA_SITE, "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
export const MEDIA_URL = MEDIA_SITE ? `https://${MEDIA_SITE}` : "";

/** Page Facebook du média (adresse complète), affichée sur l'écran de connexion si elle est renseignée. */
export const MEDIA_FACEBOOK = val(process.env.NEXT_PUBLIC_MEDIA_FACEBOOK, "");

/** Ce qui signe les visuels en bas de page : le site s'il existe, sinon le nom du média. */
export const MEDIA_SIGNATURE = MEDIA_SITE || MEDIA_NOM;

/** Hashtag de marque, calculé depuis le nom (« Media Booster » → #MediaBooster). */
export const MEDIA_HASHTAG = "#" + MEDIA_NOM.normalize("NFD").replace(/[^A-Za-z0-9]/g, "");

/** Présentation du média donnée à l'IA (qui il est, de quoi il parle). */
export const MEDIA_DESCRIPTION = val(
  process.env.NEXT_PUBLIC_MEDIA_DESCRIPTION,
  "média d'actualité tech francophone : cybersécurité, IA, mobile money, réseaux sociaux, startups, expliqués sans jargon",
);

/** Public visé, utilisé par l'IA pour ancrer les sujets dans le quotidien des lecteurs. */
export const MEDIA_PUBLIC = val(process.env.NEXT_PUBLIC_MEDIA_PUBLIC, "l'Afrique de l'Ouest francophone");

/** Prénom de l'assistante IA (community manager, aide à la rédaction). */
export const ASSISTANTE = "NOVA";

/** Présentation complète, en une phrase, pour les consignes données à l'IA. */
export const IDENTITE_MEDIA = `${MEDIA_NOM}, ${MEDIA_DESCRIPTION}, pour un public de ${MEDIA_PUBLIC}${MEDIA_SITE ? ` (site : ${MEDIA_SITE})` : ""}.`;

/** Signature des requêtes envoyées aux sites lus par la veille. */
export const USER_AGENT = `MediaBooster/1.0${MEDIA_URL ? ` (+${MEDIA_URL})` : ""}`;
