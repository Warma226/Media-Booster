// Marque du média de l'espace courant, côté serveur (consignes de l'IA, visuels, réponses de NOVA).
import { getSettings } from "./store";
import { completerMarque, type MarqueComplete, type RubriqueClient, type Theme } from "./marque";

export async function marqueServeur(): Promise<MarqueComplete> {
  return completerMarque((await getSettings()).marque);
}

/** Marque, rubriques et thèmes de l'espace courant, en une lecture. */
export async function profilEspace(): Promise<{ marque: MarqueComplete; rubriques: RubriqueClient[]; themes: Theme[] }> {
  const s = await getSettings();
  return { marque: completerMarque(s.marque), rubriques: s.rubriques ?? [], themes: s.themes ?? [] };
}
