// Marque du média d'un client (nom, site, ton…) et ses rubriques. Fichier sans dépendance serveur.
// Les valeurs viennent des réglages de l'espace (écrans Ma marque et Rubriques), jamais de valeurs figées.

export type TonMedia = "neutre" | "chaleureux" | "dynamique";
export type Marque = { nom?: string; court?: string; site?: string; facebook?: string; description?: string; public?: string; ligne?: string; ton?: TonMedia; devise?: string };
export type MarqueComplete = {
  nom: string; court: string; site: string; url: string; facebook: string; description: string; public: string;
  ligne: string; ton: TonMedia; devise: string;
  signature: string; // bas des visuels : le site s'il existe, sinon le nom
  hashtag: string;   // #NomDuMedia
  identite: string;  // présentation en une phrase pour l'IA
};

const net = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function completerMarque(m?: Marque | null): MarqueComplete {
  const nom = net(m?.nom) || "Mon média";
  const site = net(m?.site).replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const court = (net(m?.court) || nom.split(/\s+/).filter(Boolean).map((x) => x[0]).join("").slice(0, 5) || "MEDIA").toUpperCase();
  const description = net(m?.description) || "média d'actualité";
  const pub = net(m?.public) || "ses lecteurs francophones";
  return {
    nom, court, site, url: site ? `https://${site}` : "", facebook: net(m?.facebook), description, public: pub,
    ligne: net(m?.ligne) || `les sujets qui intéressent ${pub}, traités avec rigueur.`,
    ton: m?.ton === "chaleureux" || m?.ton === "dynamique" ? m.ton : "neutre",
    devise: m?.devise === undefined ? "FCFA" : net(m.devise),
    signature: site || nom,
    hashtag: "#" + nom.normalize("NFD").replace(/[^A-Za-z0-9]/g, ""),
    identite: `${nom}, ${description}, pour ${pub}${site ? ` (site : ${site})` : ""}.`,
  };
}

// ─── Marque active dans le navigateur ────────────────────────────────
// Les gabarits du Studio (lib/creation, lib/modeles, lib/minute) la lisent au moment de dessiner.
// Elle est remplie une fois les réglages chargés (useMarque). Jamais utilisée côté serveur.
export const marqueActive: MarqueComplete = completerMarque(null);
export function definirMarqueActive(m?: Marque | null) {
  Object.assign(marqueActive, completerMarque(m));
}

// ─── Rubriques ───────────────────────────────────────────────────────
// Quatre modèles de rubrique (chacun a son atelier, ses règles et son visuel). Le client active ceux qu'il veut
// et leur donne son propre nom, hashtag, description et horaire.
export type ModeleRubrique = "actu" | "cyberbase" | "portrait" | "citation";
export type RubriqueClient = { id: ModeleRubrique; nom: string; hashtag: string; description: string; heure?: number | null; active: boolean };

export const MODELES: Record<ModeleRubrique, { modele: string; explication: string; exempleNom: string; exempleHashtag: string; visuel: "genere" | "fourni"; manuel: boolean; heureParDefaut?: number }> = {
  actu: { modele: "Actualité", explication: "Une info tirée de la veille ou d'un lien, résumée et sourcée par l'IA. Peut partir en pilote automatique.", exempleNom: "Actualité", exempleHashtag: "#Actu", visuel: "genere", manuel: false },
  cyberbase: { modele: "Notion du jour", explication: "Une notion expliquée simplement, une par jour à heure fixe. Vous ajoutez votre visuel.", exempleNom: "Le mot du jour", exempleHashtag: "#MotDuJour", visuel: "fourni", manuel: false, heureParDefaut: 7 },
  portrait: { modele: "Portrait", explication: "Une personne présentée à partir des infos qu'elle a validées. Toujours relu avant publication.", exempleNom: "Portrait", exempleHashtag: "#Portrait", visuel: "fourni", manuel: true },
  citation: { modele: "Citation", explication: "Une phrase vérifiable d'une personnalité, avec sa photo, sur un visuel généré.", exempleNom: "Citation", exempleHashtag: "#Citation", visuel: "genere", manuel: false },
};
export const ORDRE_MODELES: ModeleRubrique[] = ["actu", "citation", "cyberbase", "portrait"];

/** Rubriques actives du client, dans l'ordre d'affichage. */
export function rubriquesActives(liste?: RubriqueClient[] | null): RubriqueClient[] {
  return ORDRE_MODELES.map((id) => (liste ?? []).find((r) => r.id === id)).filter((r): r is RubriqueClient => Boolean(r?.active));
}
/** Nom et hashtag d'une rubrique (ceux du client, sinon ceux du modèle). */
export function infoRubrique(liste: RubriqueClient[] | null | undefined, id: string): { nom: string; hashtag: string; description: string; heure: number | null } {
  const r = (liste ?? []).find((x) => x.id === id);
  const m = MODELES[id as ModeleRubrique] ?? MODELES.actu;
  return { nom: r?.nom || m.exempleNom, hashtag: r?.hashtag || m.exempleHashtag, description: r?.description || m.explication, heure: r?.heure ?? m.heureParDefaut ?? null };
}
export const hashtagPropre = (h: string) => {
  const t = h.trim().replace(/^#+/, "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9_]/g, "");
  return t ? `#${t}` : "";
};

// ─── Thèmes suivis par la veille ─────────────────────────────────────
// Chaque thème rapporte des points de pertinence quand un de ses mots apparaît dans une actu.
export type Theme = { id: string; label: string; keywords: string[]; poids: number };
