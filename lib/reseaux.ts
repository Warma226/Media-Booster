// Comptes reliés par chaque client : pages Facebook, profil ou pages LinkedIn, site WordPress.
// Côté serveur uniquement. Les jetons sont rangés dans les réglages de l'espace (ligne 8), jamais envoyés au navigateur.
// La connexion se fait par les écrans officiels de Facebook et LinkedIn : le client se connecte, la liste de ses pages
// s'affiche, il coche celle à utiliser. Les clés d'application (META_APP_ID…) sont celles de la plateforme Media Booster.
import { db } from "./store";
import { appUrl } from "./sign";

const LIGNE = 8;
export const FB_VERSION = () => process.env.FB_GRAPH_VERSION || "v21.0";

export type PageFacebook = { id: string; nom: string; categorie: string; photo: string; jeton: string };
export type OrgLinkedin = { urn: string; nom: string };
export type Reseaux = {
  facebook?: { utilisateur: string; relie_le: string; pages: PageFacebook[]; pageId: string | null };
  linkedin?: { jeton: string; expire: string; personne: { urn: string; nom: string }; organisations: OrgLinkedin[]; auteur: string; pagesAutorisees: boolean; relie_le: string };
  wordpress?: { url: string; utilisateur: string; motDePasse: string };
};

export async function lireReseaux(): Promise<Reseaux> {
  const { data } = await db().from("settings").select("data").eq("id", LIGNE).maybeSingle();
  return (data?.data ?? {}) as Reseaux;
}
export async function ecrireReseaux(patch: Partial<Reseaux> | ((r: Reseaux) => Reseaux)): Promise<Reseaux> {
  const actuel = await lireReseaux();
  const suivant = typeof patch === "function" ? patch(actuel) : { ...actuel, ...patch };
  const { error } = await db().from("settings").upsert({ id: LIGNE, data: suivant });
  if (error) throw new Error(error.message);
  return suivant;
}

/** Identifiants prêts à l'emploi pour publier (chaînes vides si le compte n'est pas relié). */
export async function identifiants() {
  const r = await lireReseaux();
  const page = r.facebook?.pages.find((p) => p.id === r.facebook?.pageId) ?? null;
  const liOk = Boolean(r.linkedin?.jeton && r.linkedin.auteur && new Date(r.linkedin.expire).getTime() > Date.now());
  return {
    FB: { pageId: page?.id ?? "", token: page?.jeton ?? "", nom: page?.nom ?? "", ok: Boolean(page) },
    LI: { token: liOk ? r.linkedin!.jeton : "", auteur: r.linkedin?.auteur ?? "", nom: nomAuteurLinkedin(r), ok: liOk, expire: r.linkedin?.expire ?? null },
    WP: { url: (r.wordpress?.url ?? "").replace(/\/+$/, ""), user: r.wordpress?.utilisateur ?? "", appPassword: r.wordpress?.motDePasse ?? "", ok: Boolean(r.wordpress?.url && r.wordpress.utilisateur && r.wordpress.motDePasse) },
  };
}
export type Identifiants = Awaited<ReturnType<typeof identifiants>>;

function nomAuteurLinkedin(r: Reseaux): string {
  const li = r.linkedin;
  if (!li) return "";
  if (li.auteur === li.personne.urn) return `${li.personne.nom} (profil)`;
  return li.organisations.find((o) => o.urn === li.auteur)?.nom ?? "";
}

// ─── Facebook (Facebook Login for Business) ──────────────────────────
export const facebookDisponible = () => Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
const FB_PERMISSIONS = ["pages_show_list", "pages_manage_posts", "pages_read_engagement", "pages_manage_engagement", "pages_read_user_content", "business_management"];
const fbRetour = () => `${appUrl()}/api/connexions/facebook/retour`;

export function urlConnexionFacebook(state: string): string {
  const p = new URLSearchParams({ client_id: process.env.META_APP_ID ?? "", redirect_uri: fbRetour(), state, response_type: "code", scope: FB_PERMISSIONS.join(",") });
  if (process.env.META_CONFIG_ID) { p.set("config_id", process.env.META_CONFIG_ID); p.delete("scope"); } // configuration « Login for Business »
  return `https://www.facebook.com/${FB_VERSION()}/dialog/oauth?${p.toString()}`;
}

async function graphGet<T>(chemin: string, params: Record<string, string>): Promise<T> {
  const r = await fetch(`https://graph.facebook.com/${FB_VERSION()}/${chemin}?${new URLSearchParams(params).toString()}`, { cache: "no-store" });
  const j = (await r.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!r.ok || j.error) throw new Error(`Facebook : ${j.error?.message ?? r.status}`);
  return j;
}

/** Échange le code reçu contre un jeton longue durée, puis récupère les pages que la personne administre. */
export async function terminerFacebook(code: string): Promise<Reseaux["facebook"]> {
  const id = process.env.META_APP_ID ?? "", secret = process.env.META_APP_SECRET ?? "";
  const court = await graphGet<{ access_token: string }>("oauth/access_token", { client_id: id, client_secret: secret, redirect_uri: fbRetour(), code });
  const long = await graphGet<{ access_token: string }>("oauth/access_token", { grant_type: "fb_exchange_token", client_id: id, client_secret: secret, fb_exchange_token: court.access_token });
  const moi = await graphGet<{ name?: string }>("me", { fields: "name", access_token: long.access_token });
  // Jetons de page obtenus depuis un jeton utilisateur longue durée : ils n'expirent pas.
  const pages: PageFacebook[] = [];
  let suite: string | null = `https://graph.facebook.com/${FB_VERSION()}/me/accounts?${new URLSearchParams({ fields: "id,name,category,access_token,picture{url}", limit: "100", access_token: long.access_token })}`;
  for (let i = 0; suite && i < 5; i++) {
    const r = await fetch(suite, { cache: "no-store" });
    const j = (await r.json()) as { data?: { id: string; name: string; category?: string; access_token: string; picture?: { data?: { url?: string } } }[]; paging?: { next?: string }; error?: { message?: string } };
    if (j.error) throw new Error(`Facebook : ${j.error.message}`);
    for (const p of j.data ?? []) pages.push({ id: p.id, nom: p.name, categorie: p.category ?? "", photo: p.picture?.data?.url ?? "", jeton: p.access_token });
    suite = j.paging?.next ?? null;
  }
  const avant = (await lireReseaux()).facebook?.pageId ?? null;
  const pageId = pages.some((p) => p.id === avant) ? avant : pages.length === 1 ? pages[0].id : null;
  return { utilisateur: moi.name ?? "", relie_le: new Date().toISOString(), pages, pageId };
}

// ─── LinkedIn (Sign In with LinkedIn + Share on LinkedIn ; pages si l'accès Community Management est accordé) ───
export const linkedinDisponible = () => Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
export const linkedinPagesAutorisees = () => process.env.LINKEDIN_PAGES === "1";
const liRetour = () => `${appUrl()}/api/connexions/linkedin/retour`;

export function urlConnexionLinkedin(state: string): string {
  const scopes = ["openid", "profile", "w_member_social", ...(linkedinPagesAutorisees() ? ["rw_organization_admin", "w_organization_social"] : [])];
  const p = new URLSearchParams({ response_type: "code", client_id: process.env.LINKEDIN_CLIENT_ID ?? "", redirect_uri: liRetour(), state, scope: scopes.join(" ") });
  return `https://www.linkedin.com/oauth/v2/authorization?${p.toString()}`;
}

export function versionLinkedin(): string {
  if (process.env.LINKEDIN_VERSION) return process.env.LINKEDIN_VERSION;
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 2);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function terminerLinkedin(code: string): Promise<Reseaux["linkedin"]> {
  const r = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: liRetour(), client_id: process.env.LINKEDIN_CLIENT_ID ?? "", client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? "" }),
  });
  const t = (await r.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!t.access_token) throw new Error(`LinkedIn : ${t.error_description ?? r.status}`);
  const h = { Authorization: `Bearer ${t.access_token}` };
  const u = (await (await fetch("https://api.linkedin.com/v2/userinfo", { headers: h })).json()) as { sub?: string; name?: string };
  if (!u.sub) throw new Error("LinkedIn : profil illisible.");
  const personne = { urn: `urn:li:person:${u.sub}`, nom: u.name ?? "Mon profil" };
  const organisations: OrgLinkedin[] = [];
  if (linkedinPagesAutorisees()) {
    const hr = { ...h, "LinkedIn-Version": versionLinkedin(), "X-Restli-Protocol-Version": "2.0.0" };
    const acl = (await (await fetch("https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&state=APPROVED&count=50", { headers: hr })).json().catch(() => ({}))) as { elements?: { organization?: string; role?: string }[] };
    const urns = [...new Set((acl.elements ?? []).filter((e) => ["ADMINISTRATOR", "CONTENT_ADMINISTRATOR", "DIRECT_SPONSORED_CONTENT_POSTER"].includes(e.role ?? "")).map((e) => e.organization).filter((x): x is string => Boolean(x)))];
    for (const urn of urns.slice(0, 20)) {
      const id = urn.split(":").pop();
      const o = (await (await fetch(`https://api.linkedin.com/rest/organizations/${id}`, { headers: hr })).json().catch(() => ({}))) as { localizedName?: string };
      organisations.push({ urn, nom: o.localizedName ?? `Page ${id}` });
    }
  }
  const avant = (await lireReseaux()).linkedin?.auteur;
  const auteur = avant && (avant === personne.urn || organisations.some((o) => o.urn === avant)) ? avant : organisations[0]?.urn ?? personne.urn;
  return { jeton: t.access_token, expire: new Date(Date.now() + (t.expires_in ?? 5184000) * 1000).toISOString(), personne, organisations, auteur, pagesAutorisees: linkedinPagesAutorisees(), relie_le: new Date().toISOString() };
}

// ─── Jeton anti-falsification des allers-retours de connexion ────────
export function nouvelEtat(): string {
  const o = new Uint8Array(16);
  crypto.getRandomValues(o);
  return Array.from(o, (b) => b.toString(16).padStart(2, "0")).join("");
}
