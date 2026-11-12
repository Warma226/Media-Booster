// Équipe : comptes des membres, invitations, sessions par appareil. Côté serveur uniquement.
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { headers } from "next/headers";
import { db, dbGlobal } from "./store";
import { ROLES_MEMBRES, type Role } from "./roles";
import { SESSION_DAYS } from "./session";
import { espaceId } from "./espace";
import { FORMULES } from "./abonnement";

export type Membre = { id: string; espace_id?: string; nom: string; contact: string; role: Role; statut: "invite" | "actif" | "suspendu"; created_at: string; derniere_connexion: string | null; invitation_expire: string | null };
const CHAMPS = "id,nom,contact,role,statut,created_at,derniere_connexion,invitation_expire";

export function hacher(mdp: string): string {
  const sel = randomBytes(16);
  return `s1$${sel.toString("hex")}$${scryptSync(mdp, sel, 32).toString("hex")}`;
}
export function verifier(mdp: string, hash: string | null | undefined): boolean {
  if (!hash) return false;
  const [v, sel, h] = hash.split("$");
  if (v !== "s1" || !sel || !h) return false;
  const a = scryptSync(mdp, Buffer.from(sel, "hex"), 32), b = Buffer.from(h, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
const empreinte = (jeton: string) => createHash("sha256").update(jeton).digest("hex");
export function mdpValide(mdp: string): string | null {
  if (mdp.length < 10) return "Le mot de passe doit faire au moins 10 caractères.";
  if (!/[a-zA-Z]/.test(mdp) || !/[0-9]/.test(mdp)) return "Mélangez lettres et chiffres.";
  return null;
}

// Qui fait la requête (en-têtes posés par le middleware). Le propriétaire de l'espace est un membre de rôle « admin ».
export async function moi(): Promise<{ uid: string; role: Role; sid: string | null; espace: string }> {
  const h = await headers();
  const uid = h.get("x-mb-uid"), espace = h.get("x-mb-espace");
  if (!uid || !espace) throw new Error("Session expirée : reconnecte-toi.");
  return { uid, role: (h.get("x-mb-role") as Role) || "lecteur", sid: h.get("x-mb-sid") || null, espace };
}

export async function nomDe(uid: string): Promise<string> {
  const { data } = await db().from("membres").select("nom").eq("id", uid).maybeSingle();
  return (data?.nom as string) || "Membre";
}

export async function listerMembres(): Promise<Membre[]> {
  const { data, error } = await db().from("membres").select(CHAMPS).order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Membre[];
}
// Recherche tous espaces confondus : un identifiant (e-mail ou téléphone) ne sert qu'à un seul compte.
export async function membreParContact(contact: string) {
  const c = contact.trim().replace(/[%_\\]/g, "");
  if (!c) return null;
  const { data } = await dbGlobal().from("membres").select(`${CHAMPS},espace_id,mdp_hash`).ilike("contact", c).maybeSingle();
  return data as (Membre & { espace_id: string; mdp_hash: string | null }) | null;
}

function nouveauJeton() {
  const jeton = randomBytes(24).toString("base64url");
  return { jeton, invitation_hash: empreinte(jeton), invitation_expire: new Date(Date.now() + 7 * 864e5).toISOString() };
}
export async function inviter(nom: string, contact: string, role: Role) {
  if (!nom.trim() || !contact.trim()) throw new Error("Indiquez le nom et l'e-mail ou le téléphone.");
  if (!ROLES_MEMBRES.includes(role)) throw new Error("Rôle inconnu.");
  if (await membreParContact(contact)) throw new Error("Ce contact a déjà un compte Media Booster.");
  // Nombre de membres compris dans la formule (en plus du propriétaire)
  const { lireEspace } = await import("./comptes");
  const esp = await lireEspace(await espaceId());
  const max = FORMULES[esp?.formule ?? "demarrage"]?.membres ?? 0;
  const { count } = await db().from("membres").select("id", { count: "exact", head: true }).neq("role", "admin");
  if ((count ?? 0) >= max) throw new Error(max === 0 ? "La formule Démarrage ne comprend pas de membres d'équipe : passez à la formule Pro (Abonnement)." : `Votre formule comprend ${max} membres d'équipe. Passez à la formule supérieure pour en ajouter.`);
  const j = nouveauJeton();
  const { data, error } = await db().from("membres").insert({ nom: nom.trim().slice(0, 60), contact: contact.trim().slice(0, 120), role, statut: "invite", invitation_hash: j.invitation_hash, invitation_expire: j.invitation_expire }).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string, jeton: j.jeton };
}
export async function renouvelerInvitation(id: string) {
  const j = nouveauJeton();
  const { error } = await db().from("membres").update({ invitation_hash: j.invitation_hash, invitation_expire: j.invitation_expire }).eq("id", id);
  if (error) throw new Error(error.message);
  return j.jeton;
}
export async function invitationValide(jeton: string) {
  if (!jeton) return null;
  const { data } = await dbGlobal().from("membres").select(`${CHAMPS},espace_id,invitation_hash`).eq("invitation_hash", empreinte(jeton)).maybeSingle();
  const m = data as (Membre & { espace_id: string; invitation_hash: string }) | null;
  if (!m || m.statut === "suspendu" || !m.invitation_expire || new Date(m.invitation_expire).getTime() < Date.now()) return null;
  return m;
}
export async function accepterInvitation(jeton: string, mdp: string) {
  const m = await invitationValide(jeton);
  if (!m) throw new Error("Ce lien d'invitation n'est plus valable. Demandez-en un nouveau à l'administration.");
  const err = mdpValide(mdp); if (err) throw new Error(err);
  const { error } = await dbGlobal().from("membres").update({ mdp_hash: hacher(mdp), statut: "actif", invitation_hash: null, invitation_expire: null }).eq("id", m.id).eq("espace_id", m.espace_id);
  if (error) throw new Error(error.message);
  await dbGlobal().from("sessions").delete().eq("uid", m.id).eq("espace_id", m.espace_id);
  return m;
}
export async function majMembre(id: string, p: Partial<Pick<Membre, "nom" | "role" | "statut">>) {
  const { error } = await db().from("membres").update(p).eq("id", id);
  if (error) throw new Error(error.message);
  if (p.role || p.statut === "suspendu") await fermerSessions(id); // le rôle est dans le cookie : reconnexion
}
export async function retirerMembre(id: string) {
  await fermerSessions(id);
  const { error } = await db().from("membres").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
export async function changerMdpMembre(id: string, ancien: string, nouveau: string) {
  const { data } = await db().from("membres").select("mdp_hash").eq("id", id).maybeSingle();
  if (!verifier(ancien, data?.mdp_hash as string)) throw new Error("Mot de passe actuel incorrect.");
  const err = mdpValide(nouveau); if (err) throw new Error(err);
  await db().from("membres").update({ mdp_hash: hacher(nouveau) }).eq("id", id);
}

// Sessions (ouverture au moment de la connexion : l'espace est donné explicitement, il n'y a pas encore de session)
export async function ouvrirSession(uid: string, espace: string, appareil: string): Promise<string> {
  const g = dbGlobal();
  const { data, error } = await g.from("sessions").insert({ uid, espace_id: espace, appareil: appareil.slice(0, 120), expire_at: new Date(Date.now() + SESSION_DAYS * 864e5).toISOString() }).select("id").single();
  if (error) throw new Error(error.message);
  await g.from("membres").update({ derniere_connexion: new Date().toISOString() }).eq("id", uid).eq("espace_id", espace);
  await g.from("sessions").delete().lt("expire_at", new Date().toISOString());
  return data.id as string;
}
export async function sessionsDe(uid: string) {
  const { data } = await db().from("sessions").select("id,appareil,created_at,vu_at,expire_at").eq("uid", uid).order("vu_at", { ascending: false });
  return (data ?? []) as { id: string; appareil: string | null; created_at: string; vu_at: string; expire_at: string }[];
}
export async function fermerSession(uid: string, id: string) { await db().from("sessions").delete().eq("uid", uid).eq("id", id); }
export async function fermerSessions(uid: string, sauf?: string | null) {
  let q = db().from("sessions").delete().eq("uid", uid);
  if (sauf) q = q.neq("id", sauf);
  await q;
}
export function appareilDe(ua: string): string {
  const sys = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Téléphone Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Ordinateur Windows" : /Linux/.test(ua) ? "Ordinateur Linux" : "Appareil";
  const nav = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "navigateur";
  return `${sys} · ${nav}`;
}
