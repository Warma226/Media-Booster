// Types et mise en forme de la proposition automatique (sans dépendance serveur : utilisable dans le navigateur).
import type { TriggerFormat } from "./config";

export type SitePropose = { nom: string; url: string; theme: string; pourquoi: string };
export type ThemePropose = { label: string; keywords: string[]; importance: "forte" | "moyenne" | "faible" };
export type RegleProposee = { nom: string; quand: string; keywords: string[]; format: TriggerFormat; relecture: boolean };
export type Horaires = { debut: number; fin: number; parJour: number; ecart: number };
export type Proposition = { sites: SitePropose[]; themes: ThemePropose[]; regles: RegleProposee[]; horaires: Horaires };

const txt = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const borne = (v: unknown, def: number, min: number, max: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def;
};
const mots = (v: unknown, max: number) =>
  Array.from(new Set((Array.isArray(v) ? v : []).map((k) => txt(k, 50).toLowerCase()).filter((k) => k.length >= 2))).slice(0, max);

/** Remet en forme la réponse de l'IA : bornes, doublons, valeurs inconnues. */
export function nettoyerProposition(brut: Partial<Proposition> | null | undefined): Proposition {
  const vus = new Set<string>();
  const sites = (Array.isArray(brut?.sites) ? brut.sites : [])
    .map((s) => ({ nom: txt(s?.nom, 60), url: txt(s?.url, 200), theme: txt(s?.theme, 40), pourquoi: txt(s?.pourquoi, 120) }))
    .filter((s) => {
      if (!s.nom || !/^https?:\/\/[^\s/]+\.[^\s]+/i.test(s.url)) return false;
      const domaine = s.url.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0].toLowerCase();
      if (vus.has(domaine)) return false;
      vus.add(domaine);
      return true;
    })
    .slice(0, 16);
  const themes = (Array.isArray(brut?.themes) ? brut.themes : [])
    .map((t) => ({
      label: txt(t?.label, 30),
      keywords: mots(t?.keywords, 20),
      importance: (t?.importance === "forte" || t?.importance === "faible" ? t.importance : "moyenne") as ThemePropose["importance"],
    }))
    .filter((t) => t.label && t.keywords.length)
    .slice(0, 8);
  const regles = (Array.isArray(brut?.regles) ? brut.regles : [])
    .map((r) => ({
      nom: txt(r?.nom, 40),
      quand: txt(r?.quand, 140),
      keywords: mots(r?.keywords, 15),
      format: (r?.format === "explication" || r?.format === "les-deux" ? r.format : "resume") as TriggerFormat,
      relecture: r?.relecture !== false,
    }))
    .filter((r) => r.nom && r.keywords.length)
    .slice(0, 4);
  const h = brut?.horaires;
  const debut = borne(h?.debut, 7, 5, 12);
  const horaires: Horaires = {
    debut,
    fin: Math.max(debut + 4, borne(h?.fin, 21, 14, 23)),
    parJour: borne(h?.parJour, 4, 1, 10),
    ecart: borne(h?.ecart, 120, 45, 300),
  };
  return { sites, themes, regles, horaires };
}

export const POIDS_IMPORTANCE: Record<ThemePropose["importance"], number> = { forte: 30, moyenne: 15, faible: 5 };
