// Configuration éditoriale : modèles de rubriques, déclencheurs, garde-fous, consigne de rédaction.
// Rien n'est prérempli pour le client : il ajoute lui-même ses sources, thèmes, déclencheurs et rubriques dans l'app.
import type { MarqueComplete, Theme } from "./marque";

export type Platform = "facebook" | "linkedin" | "tiktok" | "wordpress";
export const PLATFORMS: { id: Platform; label: string; limit: number }[] = [
  { id: "facebook", label: "Facebook", limit: 63206 },
  { id: "linkedin", label: "LinkedIn", limit: 3000 },
  { id: "tiktok", label: "TikTok", limit: 150 },
  { id: "wordpress", label: "WordPress", limit: 100000 },
];

export type RubriqueId = "actu" | "cyberbase" | "portrait" | "citation";
// `heure` : rubrique publiée chaque jour à heure fixe (heure locale du téléphone).
export const RUBRIQUES: { id: RubriqueId; label: string; hashtag: string; description: string; alwaysManual: boolean; heure?: number }[] = [
  { id: "actu", label: "Actualité tech", hashtag: "#ActuTech", description: "Les infos du moment, résumées et sourcées.", alwaysManual: false },
  { id: "cyberbase", label: "CyberBase", hashtag: "#CyberBase", description: "Comprendre les notions basiques de la tech. Une notion chaque jour à 7 h.", alwaysManual: false, heure: 7 },
  { id: "portrait", label: "Portrait", hashtag: "#Portrait", description: "Les experts tech d'ici et d'ailleurs. Accord de la personne obligatoire.", alwaysManual: true },
  { id: "citation", label: "Citation", hashtag: "#Citation", description: "Les phrases qui font la tech, d'ici et d'ailleurs. Une citation toutes les 2 heures. Citation vérifiable, auteur, source et photo obligatoires.", alwaysManual: true },
];

export type Source = {
  id: string;
  name: string;
  domain: string;
  lang: "fr" | "en";
  theme: string;
  feed: string | null;
  enabledByDefault: boolean;
  // Si renseigné, seuls les articles contenant un de ces mots sont gardés.
  filterKeywords?: string[];
  note: string;
};

// Aucune source par défaut : le client ajoute les siennes (écran Sources).
export const SOURCES: Source[] = [];

// `poids` : points de pertinence ajoutés quand le thème est détecté (la veille classe les actus avec).
// Les annonces de nouveaux smartphones intéressent peu le public du média : elles ne sont pas mises en avant.
// Aucun thème par défaut : le client définit les siens (écran Thèmes). Voir themesDe().
export const TOPICS: Theme[] = [];
export function themesDe(s?: { themes?: Theme[] } | null): Theme[] {
  return Array.isArray(s?.themes) ? (s?.themes as Theme[]) : TOPICS;
}

export type TriggerFormat = "resume" | "explication" | "les-deux";
export type TriggerMode = "general" | "manuel";
// Image jointe au post : seul le visuel généré est branché pour l'instant.
export type TriggerImage = "visuel" | "presse" | "banque";
export type Trigger = {
  id: string;
  name: string;
  sources: string[];
  keywords: string[];
  minScore: number;
  format: TriggerFormat;
  platforms: Platform[];
  mode: TriggerMode; // "manuel" = toujours un aperçu, même en autopilote
  image?: TriggerImage;
  enabledByDefault: boolean;
};

// Aucun déclencheur par défaut : le client crée les siens (écran Déclencheurs).
export const TRIGGERS: Trigger[] = [];

// Les déclencheurs modifiés dans l'app remplacent la liste par défaut ci-dessus.
export function allTriggers(custom?: Trigger[] | null): Trigger[] {
  return Array.isArray(custom) ? custom : TRIGGERS;
}

// Sources par défaut + sources ajoutées depuis l'app.
export function allSources(custom?: Source[] | null): Source[] {
  const extra = (custom ?? []).filter((c) => !SOURCES.some((s) => s.id === c.id));
  return [...SOURCES, ...extra];
}

export function isOn(map: Record<string, boolean> | undefined, id: string, fallback: boolean): boolean {
  return typeof map?.[id] === "boolean" ? (map[id] as boolean) : fallback;
}

// Garde-fous de l'autopilote
export const GUARDRAILS = {
  // Sujets jamais publiés automatiquement (toujours en aperçu)
  blockedKeywords: [
    "décès", "décédé", "mort", "meurt", "tué", "killed", "dies", "died", "death",
    "élection", "election", "président", "politique", "accusé", "accusation", "arrest", "arrêté",
    "guerre", "war ", "attentat", "terror", "suicide", "procès", "lawsuit", "sues",
  ],
  // Autopilote : l'app choisit elle-même la meilleure actu et la publie, à intervalle régulier.
  // Plage horaire de publication (heure UTC = heure d'Abidjan, Dakar, Ouaga ; +1 h à Lagos/Douala)
  autoStartHour: 7,
  autoEndHour: 21,
  // Écart minimal entre deux publications automatiques (un post toutes les 30 min ; marge pour le passage toutes les 15 min)
  minGapMinutes: 27,
  // Pertinence minimale (thème suivi + actu fraîche) pour être publiée seule
  minAutoScore: 55,
  // Délai pendant lequel on peut annuler une publication automatique
  delayMinutes: 10,
  // Plafond de publications automatiques par jour
  maxAutoPerDay: 28,
  // Récap tech de la semaine : vendredi (5) à 17 h (UTC), avec au moins 3 actus publiées dans la semaine
  recapDay: 5,
  recapHour: 17,
  recapMinPosts: 3,
  // Plafond de posts générés par passage de la tâche planifiée (maîtrise des coûts IA)
  maxGenerationsPerRun: 2,
};

// Garde-fous effectifs : réglages de l'écran Déclencheurs, sinon valeurs par défaut.
export function gardeFous(g?: { debut?: number; fin?: number; maxParJour?: number; ecart?: number; scoreMin?: number } | null) {
  const n = (v: unknown, def: number, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : def);
  return {
    debut: n(g?.debut, GUARDRAILS.autoStartHour, 0, 23),
    fin: n(g?.fin, GUARDRAILS.autoEndHour, 1, 24),
    maxParJour: n(g?.maxParJour, GUARDRAILS.maxAutoPerDay, 1, 60),
    ecart: n(g?.ecart, GUARDRAILS.minGapMinutes, 10, 240),
    scoreMin: n(g?.scoreMin, GUARDRAILS.minAutoScore, 30, 95),
  };
}

// Guide de style donné à l'IA à chaque rédaction, propre au média du client.
export function styleGuide(M: MarqueComplete): string {
  const ton = {
    neutre: "Neutre, factuel, rigoureux, à la troisième personne : pas de tutoiement, pas d'interpellation du lecteur, pas de formule familière.",
    chaleureux: "Chaleureux et accessible, en vouvoyant le lecteur, toujours exact et sourcé ; pas de familiarité excessive.",
    dynamique: "Vif et direct, phrases courtes, accroches fortes, toujours exact et sourcé ; jamais racoleur.",
  }[M.ton] ?? "";
  return `
Tu écris pour ${M.identite}
Ligne éditoriale : ${M.ligne} Explique sans jargon, ancre l'information dans le quotidien de ${M.public} quand c'est pertinent, sans rien inventer.
Ton : ${ton}
Le post résume l'information : qui, quoi, quand, chiffres clés, conséquences. Pas de conseils au lecteur sauf si l'info l'exige, formulés sobrement.
Langue : écris TOUJOURS en français, même quand l'article source est dans une autre langue (traduis et reformule). Garde seulement les noms propres et de marques tels quels.
Règles :
- Toujours reformuler avec tes propres mots. Ne jamais recopier l'article (aucune phrase reprise, citation de 15 mots maximum).
- Toujours citer la source (nom du média) et ne rien inventer : si une info n'est pas dans l'article, ne l'écris pas.
- Distinguer clairement ce qui est officiel, une fuite ou une rumeur.
- Pas de sensationnalisme, pas de point d'exclamation, pas d'émoji.
- Les chiffres en chiffres, les noms de marques avec leur casse officielle.${M.devise ? `\n- Tout montant dans une autre devise est suivi de sa conversion : « …, soit environ … ${M.devise} ».` : ""}
Qualité professionnelle, niveau rédaction d'un média sérieux :
- Première phrase forte et précise (le fait principal), pas de formule creuse.
- Chaque phrase apporte une info ou une explication utile ; pas de remplissage ni de répétition.
- Orthographe, accords et ponctuation française impeccables (espace avant « : ; ? ! », guillemets « »).
- Termine par une phrase qui met l'info en perspective, sans ironie ni familiarité, jamais un résumé ni une consigne. Puis la source.
`.trim();
}

// Catégories du site WordPress pour l'actualité (Portrait et Exclusivité restent manuelles).
export const WP_CATEGORIES_AUTO = ["CyberActu", "IA", "Robotique", "Réseaux Sociaux", "Apps"] as const;
const sansAccent = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const MOTS_CATEGORIE: [string, RegExp][] = [
  ["CyberActu", /cyber|pirat|hacker|ransomware|rancongiciel|malware|logiciel malveillant|phishing|hameconnage|faille|vulnerab|fuite de donnees|breach|escroquer|arnaque|fraude|europol|interpol|threat/],
  ["Robotique", /robot|humanoide|drone|automate/],
  ["IA", /intelligence artificielle|\bia\b|\bai\b|chatgpt|openai|gemini|\bllm\b|anthropic|claude|deepseek|mistral|copilot|apprentissage automatique/],
  ["Réseaux Sociaux", /reseaux? sociaux|facebook|instagram|tiktok|whatsapp|twitter|\bx\b \(|linkedin|youtube|snapchat|threads|telegram|\bmeta\b|influenceu/],
];
// Choisit une catégorie à partir du titre et du texte (secours si l'IA n'en a pas donné).
export function categorieWp(...textes: string[]): string {
  const t = sansAccent(textes.join(" "));
  return MOTS_CATEGORIE.find(([, re]) => re.test(t))?.[0] ?? "Apps";
}
