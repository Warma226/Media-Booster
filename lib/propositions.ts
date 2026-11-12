// Proposition automatique : à partir de la marque et des rubriques du client, l'IA propose ses sources de veille,
// ses thèmes et ses règles de publication. Rien n'est enregistré ici : le client coche ce qu'il garde.
// Les sites proposés sont ensuite vérifiés un par un (flux RSS réel) par l'écran, via /api/sources.
import { aiJson } from "./claude";
import type { MarqueComplete, RubriqueClient, Theme } from "./marque";
import { nettoyerProposition, type Proposition } from "./proposition-types";

const SYSTEME = `Tu es le conseiller éditorial de Media Booster, une application qui fait tourner des médias en ligne (souvent en Afrique francophone).
À partir de la description d'un média, tu proposes ce qu'il doit surveiller et comment publier. Le client n'est pas technicien : tes textes sont courts, concrets, en français simple.

Réponds UNIQUEMENT avec un objet JSON de cette forme :
{
  "sites": [{ "nom": "Nom du site", "url": "https://adresse-de-la-page-d-accueil", "theme": "un des labels de themes", "pourquoi": "phrase de 12 mots maximum" }],
  "themes": [{ "label": "Nom court", "keywords": ["mot-clé", "..."], "importance": "forte" | "moyenne" | "faible" }],
  "regles": [{ "nom": "Nom court", "quand": "Quand une actu parle de … (phrase simple)", "keywords": ["..."], "format": "resume" | "explication" | "les-deux", "relecture": true | false }],
  "horaires": { "debut": 7, "fin": 21, "parJour": 4, "ecart": 120 }
}

Règles :
- sites : 14 sites d'information RÉELS, connus et actifs, dont tu es sûr de l'adresse (page d'accueil du site, pas d'article). Mélange médias de la région du public, médias francophones de référence et 2 ou 3 références internationales du domaine. Pas de réseau social, pas de site qui exige un abonnement, pas de blog personnel. Si tu n'es pas sûr qu'un site existe, ne le propose pas.
- themes : 4 à 7 thèmes qui correspondent à la ligne éditoriale. Pour chacun, 8 à 15 mots-clés en minuscules, tels qu'ils apparaissent dans les titres d'articles (mettre aussi l'équivalent anglais si des sources sont en anglais). importance « forte » pour le cœur du média.
- regles : 2 ou 3 règles de publication automatique sur les sujets phares. relecture: true quand le sujet demande prudence (santé, argent, justice, sécurité) ; sinon false. format « explication » pour les sujets techniques que le public doit comprendre.
- horaires : heures où le public lit (heure locale), nombre de posts automatiques par jour (2 à 8), écart minimum entre deux posts en minutes (60 à 240).
- Aucun sujet politique, religieux ou de fait divers dans les règles automatiques.`;

export async function proposerSuite(M: MarqueComplete, rubriques: RubriqueClient[], deja: { themes: Theme[]; domaines: string[] }): Promise<Proposition> {
  const lignes = [
    `Média : ${M.identite}`,
    `Public visé : ${M.public}`,
    `Ligne éditoriale : ${M.ligne}`,
    `Ton : ${M.ton}`,
    rubriques.length ? `Rubriques : ${rubriques.map((r) => `${r.nom}${r.description ? ` (${r.description})` : ""}`).join(" ; ")}` : "",
    deja.themes.length ? `Thèmes déjà suivis (ne pas les reproposer) : ${deja.themes.map((t) => t.label).join(", ")}` : "",
    deja.domaines.length ? `Sites déjà suivis (ne pas les reproposer) : ${deja.domaines.join(", ")}` : "",
  ].filter(Boolean);
  const brut = await aiJson<Partial<Proposition>>(SYSTEME, lignes.join("\n"), 3500);
  const p = nettoyerProposition(brut);
  const dejaDomaines = new Set(deja.domaines.map((d) => d.toLowerCase()));
  p.sites = p.sites.filter((s) => !dejaDomaines.has(s.url.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0].toLowerCase()));
  if (!p.sites.length && !p.themes.length) throw new Error("La proposition n'a rien donné d'utilisable. Précisez votre ligne éditoriale dans Ma marque, puis réessayez.");
  return p;
}

export { POIDS_IMPORTANCE, type Proposition } from "./proposition-types";
