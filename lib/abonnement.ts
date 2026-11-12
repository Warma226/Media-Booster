// Abonnement Media Booster : formules, prix et règles d'accès.
// Fichier sans dépendance serveur : utilisable par le middleware, les routes et les écrans.
// Les prix et limites se changent ici (en francs CFA, par mois).

export type Formule = "demarrage" | "pro" | "equipe";
export type StatutEspace = "essai" | "actif" | "expire" | "suspendu";
export type Espace = {
  id: string;
  nom: string;
  created_at: string;
  formule: Formule;
  statut: StatutEspace;
  essai_fin: string | null;
  payee_jusqu: string | null;
};

export const ESSAI_HEURES = 24;
export const DUREE_JOURS = 30; // un paiement ouvre 30 jours d'accès

export type DetailFormule = {
  id: Formule;
  nom: string;
  prix: number; // FCFA par mois
  accroche: string;
  membres: number; // membres de l'équipe en plus du propriétaire
  postsAutoParJour: number;
  atouts: string[];
};

export const FORMULES: Record<Formule, DetailFormule> = {
  demarrage: {
    id: "demarrage", nom: "Démarrage", prix: 5000, accroche: "Pour lancer son média seul",
    membres: 0, postsAutoParJour: 3,
    atouts: ["1 page par réseau", "Veille et rédaction par l'IA", "3 publications automatiques par jour", "Partage WhatsApp"],
  },
  pro: {
    id: "pro", nom: "Pro", prix: 15000, accroche: "Pour publier tous les jours",
    membres: 2, postsAutoParJour: 10,
    atouts: ["Tout Démarrage", "10 publications automatiques par jour", "NOVA répond aux commentaires", "Studio visuels et vidéos", "2 membres d'équipe"],
  },
  equipe: {
    id: "equipe", nom: "Équipe", prix: 35000, accroche: "Pour une rédaction complète",
    membres: 10, postsAutoParJour: 30,
    atouts: ["Tout Pro", "30 publications automatiques par jour", "10 membres d'équipe avec rôles", "Récap hebdomadaire et vidéos"],
  },
};

export const prixTexte = (n: number) => `${n.toLocaleString("fr-FR").replace(/ /g, " ")} FCFA`;

/** L'espace a-t-il accès à l'app en ce moment (essai en cours ou abonnement payé) ? */
export function accesOuvert(e: Pick<Espace, "statut" | "essai_fin" | "payee_jusqu"> | null | undefined, maintenant = Date.now()): boolean {
  if (!e || e.statut === "suspendu") return false;
  if (e.payee_jusqu && new Date(e.payee_jusqu).getTime() > maintenant) return true;
  if (e.essai_fin && new Date(e.essai_fin).getTime() > maintenant) return true;
  return false;
}

/** Pages accessibles même quand l'abonnement est échu (pour pouvoir payer ou se déconnecter). */
export const PAGES_SANS_ABONNEMENT = ["/abonnement", "/api/abonnement", "/plateforme", "/api/plateforme", "/api/logout", "/api/compte", "/compte", "/cgu", "/confidentialite"];
