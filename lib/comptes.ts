// Comptes clients : création d'un espace à l'inscription, lecture de l'espace, liste pour les tâches planifiées.
// Côté serveur uniquement. Ces fonctions travaillent tous espaces confondus (dbGlobal) : elles servent avant
// qu'une session existe, ou pour passer les espaces un par un.
import { dbGlobal, isDemo } from "./store";
import { hacher, membreParContact, mdpValide } from "./equipe";
import { ESSAI_HEURES, accesOuvert, type Espace } from "./abonnement";

const CHAMPS_ESPACE = "id,nom,created_at,formule,statut,essai_fin,payee_jusqu";

export const emailValide = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

export type Inscription = { media: string; nom: string; email: string; motDePasse: string };

/** Crée l'espace du client (24 h d'essai) et son compte propriétaire. Renvoie l'espace et le membre. */
export async function inscrire(i: Inscription): Promise<{ espace: Espace; membreId: string }> {
  const media = i.media.trim().slice(0, 60), nom = i.nom.trim().slice(0, 60), email = i.email.trim().toLowerCase().slice(0, 120);
  if (!media) throw new Error("Indiquez le nom de votre média.");
  if (!nom) throw new Error("Indiquez votre nom.");
  if (!emailValide(email)) throw new Error("Adresse e-mail invalide.");
  const err = mdpValide(i.motDePasse);
  if (err) throw new Error(err);
  if (isDemo()) throw new Error("Base de données non configurée : ajoutez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans Vercel.");
  if (await membreParContact(email)) throw new Error("Un compte existe déjà avec cet e-mail. Connectez-vous.");

  const g = dbGlobal();
  const essai_fin = new Date(Date.now() + ESSAI_HEURES * 3600e3).toISOString();
  const { data: e, error: e1 } = await g.from("espaces").insert({ nom: media, statut: "essai", formule: "demarrage", essai_fin }).select(CHAMPS_ESPACE).single();
  if (e1 || !e) throw new Error(e1?.message ?? "Création de l'espace impossible.");
  const { data: m, error: e2 } = await g
    .from("membres")
    .insert({ espace_id: e.id, nom, contact: email, role: "admin", statut: "actif", mdp_hash: hacher(i.motDePasse) })
    .select("id")
    .single();
  if (e2 || !m) {
    await g.from("espaces").delete().eq("id", e.id); // pas d'espace orphelin
    throw new Error(e2?.message.includes("membres_contact_idx") ? "Un compte existe déjà avec cet e-mail." : e2?.message ?? "Création du compte impossible.");
  }
  // Première fiche de marque : le nom du média, le reste se complète dans l'app.
  await g.from("settings").upsert({ espace_id: e.id, id: 1, data: { marque: { nom: media } } });
  return { espace: e as Espace, membreId: m.id as string };
}

export async function lireEspace(id: string): Promise<Espace | null> {
  if (isDemo()) return { id, nom: "Démo", created_at: new Date().toISOString(), formule: "equipe", statut: "actif", essai_fin: null, payee_jusqu: "2999-01-01T00:00:00Z" };
  const { data } = await dbGlobal().from("espaces").select(CHAMPS_ESPACE).eq("id", id).maybeSingle();
  return (data as Espace) ?? null;
}

export async function majEspace(id: string, p: Partial<Omit<Espace, "id" | "created_at">>) {
  const { error } = await dbGlobal().from("espaces").update(p).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Espaces dont l'accès est ouvert (essai en cours ou abonnement payé) : ceux que les tâches planifiées font tourner. */
export async function espacesActifs(): Promise<Espace[]> {
  if (isDemo()) return [(await lireEspace("demo")) as Espace];
  const { data, error } = await dbGlobal().from("espaces").select(CHAMPS_ESPACE).neq("statut", "suspendu").limit(5000);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Espace[]).filter((e) => accesOuvert(e));
}
