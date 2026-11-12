// Espace client : chaque client de Media Booster a son espace (son média), et toutes ses données y sont rangées.
// Côté serveur, l'espace courant vient :
// - du middleware (en-tête x-mb-espace, posé d'après la session) pour une requête d'un utilisateur connecté ;
// - de avecEspace(id, …) pour les tâches planifiées, qui passent les espaces un par un.
import { AsyncLocalStorage } from "node:async_hooks";

const courant = new AsyncLocalStorage<string>();

/** Exécute fn « au nom » d'un espace (tâches planifiées, webhooks de paiement…). */
export function avecEspace<T>(id: string, fn: () => Promise<T>): Promise<T> {
  return courant.run(id, fn);
}

/** Identifiant de l'espace courant ; erreur si on ne sait pas pour qui on travaille (jamais de données mélangées). */
export async function espaceId(): Promise<string> {
  const id = courant.getStore();
  if (id) return id;
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const e = h.get("x-mb-espace");
    if (e) return e;
  } catch {
    /* hors d'une requête : pas d'en-têtes */
  }
  throw new Error("Espace inconnu : reconnecte-toi.");
}

/** Comme espaceId(), mais renvoie null au lieu d'une erreur. */
export async function espaceIdOuNull(): Promise<string | null> {
  try { return await espaceId(); } catch { return null; }
}
