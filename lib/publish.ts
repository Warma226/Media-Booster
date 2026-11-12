// Publication sur les comptes reliés par le client (pages Facebook et LinkedIn, site WordPress, TikTok).
import { categorieWp, type Platform } from "./config";
import type { Post, PublishResult } from "./store";
import { imageFor } from "./visual-url";
import { publishPhotos, tiktokConfigured, tiktokUser, tiktokRelie } from "./tiktok";
import { FB_VERSION, identifiants, versionLinkedin, type Identifiants } from "./reseaux";

type Publisher = (post: Post) => Promise<Omit<PublishResult, "at">>;

// Statut des comptes reliés par le client (écran Connexions).
export async function connectionStatus(): Promise<Record<Platform, { configured: boolean; detail: string }>> {
  const { FB, LI, WP } = await identifiants();
  const tt = tiktokConfigured() ? await tiktokRelie().catch(() => false) : false;
  return {
    wordpress: { configured: WP.ok, detail: WP.ok ? WP.url.replace(/^https?:\/\//, "") : "Site non relié" },
    facebook: { configured: FB.ok, detail: FB.ok ? FB.nom : "Page non reliée" },
    linkedin: { configured: LI.ok, detail: LI.ok ? LI.nom : LI.expire ? "Connexion expirée : reconnectez LinkedIn" : "Non relié" },
    tiktok: { configured: tt, detail: tt ? "Compte relié" : "Non relié" },
  };
}

function imageUrl(post: Post, platform: Platform): string {
  const url = imageFor(post, platform, true);
  if (!url) throw new Error("Aucun visuel : ajoute le lien de ton visuel dans l'éditeur.");
  return url;
}

async function imageBytes(post: Post, platform: Platform): Promise<{ bytes: ArrayBuffer; type: string; ext: string }> {
  const res = await fetch(imageUrl(post, platform));
  if (!res.ok) throw new Error(`Visuel indisponible (${res.status})`);
  const type = (res.headers.get("content-type") ?? "image/png").split(";")[0];
  const ext = type.includes("jpeg") ? "jpg" : type.includes("webp") ? "webp" : "png";
  return { bytes: await res.arrayBuffer(), type, ext };
}

function escapeHtml(t: string) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── WordPress : article complet (catégories, étiquettes, extrait SEO, images légendées) ───
function wpAuth(WP: Identifiants["WP"]) {
  return "Basic " + Buffer.from(`${WP.user}:${WP.appPassword}`).toString("base64");
}
const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Identifiants des catégories (par nom, sans accents ni casse) : seules les catégories existantes sont utilisées.
async function wpCategoryIds(names: string[]): Promise<number[]> {
  const { WP } = await identifiants();
  if (!names.length) return [];
  const res = await fetch(`${WP.url}/wp-json/wp/v2/categories?per_page=100`, { headers: { Authorization: wpAuth(WP) } });
  if (!res.ok) return [];
  const all = (await res.json()) as { id: number; name: string; slug: string }[];
  return names.map((n) => all.find((c) => norm(c.name) === norm(n) || c.slug === norm(n).replace(/\s+/g, "-"))?.id).filter((x): x is number => typeof x === "number");
}
// Étiquettes : créées si elles n'existent pas encore.
async function wpTagIds(names: string[]): Promise<number[]> {
  const { WP } = await identifiants();
  const ids: number[] = [];
  for (const name of names.slice(0, 8)) {
    const q = await fetch(`${WP.url}/wp-json/wp/v2/tags?search=${encodeURIComponent(name)}&per_page=20`, { headers: { Authorization: wpAuth(WP) } });
    const found = q.ok ? ((await q.json()) as { id: number; name: string }[]).find((t) => norm(t.name) === norm(name)) : undefined;
    if (found) { ids.push(found.id); continue; }
    const c = await fetch(`${WP.url}/wp-json/wp/v2/tags`, { method: "POST", headers: { Authorization: wpAuth(WP), "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (c.ok) ids.push(((await c.json()) as { id: number }).id);
  }
  return ids;
}
// Envoie une image dans la médiathèque avec sa légende et son texte alternatif.
// Image allégée avant envoi : 1200 px de large au plus, WebP qualité 78 (souvent 5 à 10 fois plus léger qu'une photo d'origine).
async function optimise(bytes: ArrayBuffer, type: string): Promise<{ body: ArrayBuffer | Uint8Array; type: string; ext: string; width?: number; height?: number }> {
  try {
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp(Buffer.from(bytes)).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer({ resolveWithObject: true });
    return { body: new Uint8Array(data), type: "image/webp", ext: "webp", width: info.width, height: info.height };
  } catch {
    return { body: bytes, type, ext: type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg" };
  }
}

async function wpMedia(url: string, name: string, legende: string, alt: string): Promise<{ id: number; src: string; width?: number; height?: number } | null> {
  const { WP } = await identifiants();
  const r = await fetch(url, { headers: { "User-Agent": "MediaBooster/1.0" } });
  if (!r.ok) return null;
  const img = await optimise(await r.arrayBuffer(), (r.headers.get("content-type") ?? "image/jpeg").split(";")[0]);
  const up = await fetch(`${WP.url}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: { Authorization: wpAuth(WP), "Content-Type": img.type, "Content-Disposition": `attachment; filename="${name}.${img.ext}"` },
    body: img.body as BodyInit,
  });
  if (!up.ok) throw new Error(`WordPress (image) ${up.status} : ${(await up.text()).slice(0, 200)}`);
  const m = (await up.json()) as { id: number; source_url: string; media_details?: { width?: number; height?: number } };
  await fetch(`${WP.url}/wp-json/wp/v2/media/${m.id}`, {
    method: "POST",
    headers: { Authorization: wpAuth(WP), "Content-Type": "application/json" },
    body: JSON.stringify({ caption: legende, alt_text: alt, title: alt }),
  });
  return { id: m.id, src: m.source_url, width: m.media_details?.width ?? img.width, height: m.media_details?.height ?? img.height };
}
// Photos Wikimedia Commons (lien Special:FilePath) : auteur et licence lus sur Commons, ajoutés à la légende.
async function commonsCredit(url: string): Promise<string | null> {
  const m = url.match(/commons\.wikimedia\.org\/wiki\/Special:FilePath\/([^?#]+)/);
  if (!m) return null;
  try {
    const name = decodeURIComponent(m[1]).replace(/_/g, " ");
    const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=${encodeURIComponent("File:" + name)}`;
    const r = await fetch(api, { headers: { "User-Agent": "MediaBooster/1.0" }, signal: AbortSignal.timeout(10000) });
    const j = (await r.json()) as { query?: { pages?: Record<string, { imageinfo?: { extmetadata?: Record<string, { value?: string }> }[] }> } };
    const meta = Object.values(j.query?.pages ?? {})[0]?.imageinfo?.[0]?.extmetadata ?? {};
    const strip = (h?: string) => (h ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const auteur = strip(meta.Artist?.value);
    const licence = strip(meta.LicenseShortName?.value);
    return `Photo : ${auteur ? auteur + " / " : ""}Wikimedia Commons${licence ? ", " + licence : ""}`;
  } catch {
    return "Photo : Wikimedia Commons";
  }
}
// Bloc image WordPress avec l'identifiant du média : WordPress ajoute alors les tailles adaptées (srcset) et le chargement différé.
const figure = (m: { id: number; src: string; width?: number; height?: number }, alt: string, legende: string) =>
  `<!-- wp:image {"id":${m.id},"sizeSlug":"large","linkDestination":"none"} -->\n<figure class="wp-block-image size-large"><img src="${m.src}" alt="${escapeHtml(alt)}" class="wp-image-${m.id}"${m.width ? ` width="${m.width}"` : ""}${m.height ? ` height="${m.height}"` : ""} loading="lazy" decoding="async"/><figcaption class="wp-element-caption">${escapeHtml(legende)}</figcaption></figure>\n<!-- /wp:image -->`;
const slugify = (t: string) => norm(t).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);

const wordpress: Publisher = async (post) => {
  const { WP } = await identifiants();
  const v = post.visual;
  const titre = post.texts.wp_title || post.title;
  // Article déjà en ligne : seules ses catégories et étiquettes sont corrigées (ni nouvelle image ni nouveau texte).
  if (v.wp_maj === "categories" && v.wp_slug) {
    const f = await fetch(`${WP.url}/wp-json/wp/v2/posts?slug=${encodeURIComponent(v.wp_slug)}&status=any&_fields=id,link`, { headers: { Authorization: wpAuth(WP) } });
    const ex = f.ok ? ((await f.json()) as { id: number; link: string }[])[0] : undefined;
    if (ex) {
      const categories = await wpCategoryIds(v.wp_categories?.length ? v.wp_categories : [categorieWp(titre, post.texts.wp_body)]);
      const tags = await wpTagIds(v.wp_tags ?? []);
      const r = await fetch(`${WP.url}/wp-json/wp/v2/posts/${ex.id}`, {
        method: "POST",
        headers: { Authorization: wpAuth(WP), "Content-Type": "application/json" },
        body: JSON.stringify({ categories, ...(tags.length ? { tags } : {}), ...(post.texts.wp_excerpt ? { excerpt: post.texts.wp_excerpt } : {}) }),
      });
      if (!r.ok) throw new Error(`WordPress ${r.status} : ${(await r.text()).slice(0, 200)}`);
      return { ok: true, detail: "Catégorie mise à jour", url: ex.link };
    }
  }
  const slug = post.id.slice(0, 8);
  // 1. Image à la une (légendée) puis images de l'article
  const une = imageFor(post, "wordpress", true);
  if (!une) throw new Error("Aucun visuel : ajoute l'image de l'article dans l'éditeur.");
  const creditUne = await commonsCredit(une);
  const legendeUne = [v.legende || (post.source_name ? `Illustration · ${post.source_name}` : titre), creditUne].filter(Boolean).join(" · ");
  const altUne = v.alt || titre;
  let media = await wpMedia(une, `mb-${slug}`, legendeUne, altUne).catch(() => null);
  // Photo indisponible : visuel de secours (visuel généré).
  if (!media && v.image_secours) media = await wpMedia(v.image_secours, `mb-${slug}`, v.legende || titre, altUne);
  let content = post.texts.wp_body || `<p>${escapeHtml(post.texts.facebook)}</p>`;
  const extras = v.wp_images ?? [];
  for (let i = 0; i < extras.length; i++) {
    const im = extras[i];
    const credit = await commonsCredit(im.url);
    const legende = [im.legende, credit].filter(Boolean).join(" · ");
    const m = await wpMedia(im.url, `mb-${slug}-${i + 1}`, legende, im.alt || im.legende).catch(() => null);
    const html = m ? figure(m, im.alt || im.legende, legende) : "";
    content = content.includes(`[[IMAGE${i + 1}]]`) ? content.replace(`[[IMAGE${i + 1}]]`, html) : content + html;
  }
  content = content.replace(/\[\[IMAGE\d+\]\]/g, "");
  if (post.source_url && !content.includes(post.source_url)) {
    content += `<p>Source : <a href="${post.source_url}" rel="noopener">${escapeHtml(post.source_name ?? post.source_url)}</a></p>`;
  }
  // 2. Catégories, étiquettes, extrait (méta-description) et adresse lisible
  // Jamais « Uncategorized » : sans catégorie choisie, elle est déduite du titre et du texte.
  const categories = await wpCategoryIds(v.wp_categories?.length ? v.wp_categories : [categorieWp(titre, post.texts.wp_body)]);
  const tags = await wpTagIds(v.wp_tags ?? []);
  const excerpt = post.texts.wp_excerpt || "";
  // Un article déjà publié avec la même adresse est mis à jour au lieu d'être dupliqué.
  const wpSlug = v.wp_slug || slugify(titre);
  const exist = await fetch(`${WP.url}/wp-json/wp/v2/posts?slug=${encodeURIComponent(wpSlug)}&status=any&_fields=id`, { headers: { Authorization: wpAuth(WP) } });
  const existing = exist.ok ? ((await exist.json()) as { id: number }[])[0] : undefined;
  const res = await fetch(`${WP.url}/wp-json/wp/v2/posts${existing ? `/${existing.id}` : ""}`, {
    method: "POST",
    headers: { Authorization: wpAuth(WP), "Content-Type": "application/json" },
    // Post de test de connexion : envoyé en brouillon, jamais publié en ligne.
    body: JSON.stringify({
      title: titre,
      content,
      excerpt,
      slug: wpSlug,
      status: post.origin === "test" ? "draft" : "publish",
      ...(media ? { featured_media: media.id } : {}),
      ...(categories.length ? { categories } : {}),
      ...(tags.length ? { tags } : {}),
    }),
  });
  if (!res.ok) throw new Error(`WordPress ${res.status} : ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { link?: string };
  return { ok: true, detail: post.origin === "test" ? "Brouillon de test créé (non publié)" : existing ? "Article mis à jour" : "Article publié", url: json.link };
};

// Carrousel (plusieurs images à faire défiler) : chaque image est d'abord envoyée sans être publiée,
// puis un seul post les regroupe avec le texte.
async function facebookCarousel(post: Post, slides: string[]) {
  const { FB } = await identifiants();
  const version = FB_VERSION();
  const token = FB.token;
  const ids: string[] = [];
  for (const url of slides.slice(0, 10)) {
    const res = await fetch(`https://graph.facebook.com/${version}/${FB.pageId}/photos`, {
      method: "POST",
      body: new URLSearchParams({ url, published: "false", access_token: token }),
    });
    const json = (await res.json()) as { id?: string; error?: { message: string } };
    if (!res.ok || json.error || !json.id) throw new Error(`Facebook (image ${ids.length + 1}) : ${json.error?.message ?? res.status}`);
    ids.push(json.id);
  }
  const body = new URLSearchParams({ message: post.texts.facebook, access_token: token });
  ids.forEach((id, i) => body.set(`attached_media[${i}]`, JSON.stringify({ media_fbid: id })));
  const res = await fetch(`https://graph.facebook.com/${version}/${FB.pageId}/feed`, { method: "POST", body });
  const json = (await res.json()) as { id?: string; error?: { message: string } };
  if (!res.ok || json.error) throw new Error(`Facebook : ${json.error?.message ?? res.status}`);
  return { ok: true, detail: `Carrousel de ${ids.length} images publié sur la Page`, url: json.id ? `https://www.facebook.com/${json.id}` : undefined, id: json.id };
}

// Vidéo : Facebook la récupère à partir de son lien.
async function facebookVideo(post: Post, url: string) {
  const { FB } = await identifiants();
  const version = FB_VERSION();
  const body = new URLSearchParams({ file_url: url, description: post.texts.facebook, access_token: FB.token });
  const res = await fetch(`https://graph-video.facebook.com/${version}/${FB.pageId}/videos`, { method: "POST", body });
  const json = (await res.json()) as { id?: string; error?: { message: string } };
  if (!res.ok || json.error) throw new Error(`Facebook (vidéo) : ${json.error?.message ?? res.status}`);
  return { ok: true, detail: "Vidéo publiée sur la Page", url: json.id ? `https://www.facebook.com/${FB.pageId}/videos/${json.id}` : undefined, id: json.id };
}

const facebook: Publisher = async (post) => {
  const { FB } = await identifiants();
  if (post.visual.video) return facebookVideo(post, post.visual.video);
  if (post.visual.slides && post.visual.slides.length > 1) return facebookCarousel(post, post.visual.slides);
  const version = FB_VERSION();
  const body = new URLSearchParams({
    url: imageUrl(post, "facebook"),
    caption: post.texts.facebook,
    access_token: FB.token,
  });
  const res = await fetch(`https://graph.facebook.com/${version}/${FB.pageId}/photos`, { method: "POST", body });
  const json = (await res.json()) as { id?: string; post_id?: string; error?: { message: string } };
  if (!res.ok || json.error) throw new Error(`Facebook : ${json.error?.message ?? res.status}`);
  return { ok: true, detail: "Photo publiée sur la Page", url: json.post_id ? `https://www.facebook.com/${json.post_id}` : undefined, id: json.post_id };
};

// Données envoyées à Make (scénario : Webhook → HTTP « Get a file » → LinkedIn « Create an Organization Image Post »).
export function linkedinPayload(post: Post, test = false) {
  return {
    test,
    post_id: post.id,
    text: post.texts.linkedin,
    image_url: imageFor(post, "linkedin", true),
    title: post.title || post.visual.titre,
    source_url: post.source_url ?? "",
  };
}

const linkedin: Publisher = async (post) => {
  const { LI } = await identifiants();
  const headers = {
    Authorization: `Bearer ${LI.token}`,
    "LinkedIn-Version": versionLinkedin(),
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
  };
  const author = LI.auteur;
  // 1. Réserve l'emplacement de l'image
  const init = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
    method: "POST",
    headers,
    body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
  });
  if (!init.ok) throw new Error(`LinkedIn (image) ${init.status} : ${(await init.text()).slice(0, 200)}`);
  const { value } = (await init.json()) as { value: { uploadUrl: string; image: string } };
  // 2. Envoie l'image
  const up = await fetch(value.uploadUrl, { method: "PUT", headers: { Authorization: headers.Authorization }, body: (await imageBytes(post, "linkedin")).bytes });
  if (!up.ok) throw new Error(`LinkedIn (envoi image) ${up.status}`);
  // 3. Crée le post
  const res = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers,
    body: JSON.stringify({
      author,
      commentary: post.texts.linkedin,
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      content: { media: { id: value.image, title: post.title || post.visual.titre } },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (!res.ok) throw new Error(`LinkedIn ${res.status} : ${(await res.text()).slice(0, 200)}`);
  const urn = res.headers.get("x-restli-id") ?? undefined;
  return { ok: true, detail: "Post publié sur LinkedIn", id: urn, url: urn ? `https://www.linkedin.com/feed/update/${urn}` : undefined };
};

const tiktok: Publisher = async (post) => {
  const images = post.visual.slides && post.visual.slides.length > 1 ? post.visual.slides : [imageUrl(post, "tiktok")];
  const legende = post.texts.tiktok || post.texts.facebook || post.title;
  const { publish_id, privacy } = await publishPhotos(images, post.visual.titre || post.title, legende);
  return { ok: true, detail: privacy === "PUBLIC_TO_EVERYONE" ? `Photo publiée sur TikTok (${publish_id})` : `Photo envoyée sur TikTok en privé (${privacy}) : l'app n'est pas encore validée par TikTok` };
};

const PUBLISHERS: Record<Platform, Publisher> = { wordpress, facebook, linkedin, tiktok };

export async function publishPost(post: Post): Promise<Post> {
  const status = await connectionStatus();
  const results = { ...post.results };
  for (const platform of post.platforms) {
    if (results[platform]?.ok) continue; // déjà publié
    const at = new Date().toISOString();
    if (!status[platform].configured) {
      results[platform] = { ok: false, detail: `${platform} n'est pas connecté`, at };
      continue;
    }
    try {
      results[platform] = { ...(await PUBLISHERS[platform](post)), at };
    } catch (e) {
      results[platform] = { ok: false, detail: (e as Error).message, at };
    }
  }
  const all = post.platforms.map((p) => results[p]);
  const allOk = all.every((r) => r?.ok);
  return { ...post, results, status: allOk ? "publie" : "erreur" };
}

// ─── Test des connexions (sans rien publier) ─────────────────────────
export type ConnectionTest = { ok: boolean; detail: string };

async function testWordpress(): Promise<ConnectionTest> {
  const { WP } = await identifiants();
  const base = WP.url;
  const auth = wpAuth(WP);
  const res = await fetch(`${base}/wp-json/wp/v2/users/me?context=edit`, { headers: { Authorization: auth }, signal: AbortSignal.timeout(15000) });
  if (res.status === 401 || res.status === 403) return { ok: false, detail: "Identifiant ou mot de passe d'application refusé par WordPress." };
  if (res.status === 404) return { ok: false, detail: "API WordPress introuvable : vérifiez l'adresse exacte du site." };
  if (!res.ok) return { ok: false, detail: `WordPress a répondu ${res.status}.` };
  const me = (await res.json()) as { name?: string; capabilities?: Record<string, boolean> };
  if (me.capabilities && !me.capabilities.publish_posts) return { ok: false, detail: `Connecté en tant que ${me.name}, mais ce compte ne peut pas publier d'articles.` };
  return { ok: true, detail: `Connecté en tant que ${me.name ?? WP.user}, peut publier.` };
}

async function testFacebook(): Promise<ConnectionTest> {
  const { FB } = await identifiants();
  const version = FB_VERSION();
  const url = `https://graph.facebook.com/${version}/${FB.pageId}?fields=name&access_token=${encodeURIComponent(FB.token)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const json = (await res.json().catch(() => ({}))) as { name?: string; error?: { message?: string } };
  if (!res.ok || json.error) return { ok: false, detail: `Facebook : ${json.error?.message ?? res.status}` };
  return { ok: true, detail: `Page « ${json.name} » accessible.` };
}

async function testLinkedin(): Promise<ConnectionTest> {
  const { LI } = await identifiants();
  const res = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${LI.token}` }, signal: AbortSignal.timeout(15000) });
  if (res.status === 401) return { ok: false, detail: "Connexion LinkedIn expirée : reconnectez LinkedIn." };
  if (!res.ok) return { ok: false, detail: `LinkedIn a répondu ${res.status}.` };
  return { ok: true, detail: `Publication au nom de ${LI.nom}.` };
}

export async function testConnections(): Promise<Record<Platform, ConnectionTest>> {
  const status = await connectionStatus();
  const run = async (p: Platform, fn: () => Promise<ConnectionTest>): Promise<ConnectionTest> => {
    if (!status[p].configured) return { ok: false, detail: "Pas encore relié." };
    try {
      return await fn();
    } catch (e) {
      return { ok: false, detail: `Injoignable : ${(e as Error).message}` };
    }
  };
  const testTiktok = async (): Promise<ConnectionTest> => {
    const u = await tiktokUser();
    const pub = u.privacy.includes("PUBLIC_TO_EVERYONE");
    return { ok: true, detail: `Connecté à ${u.name}${pub ? ", publication publique possible." : " : publication en privé tant que TikTok n'a pas validé l'app."}` };
  };
  const [wordpress, facebook, linkedin, tiktok] = await Promise.all([run("wordpress", testWordpress), run("facebook", testFacebook), run("linkedin", testLinkedin), run("tiktok", testTiktok)]);
  return { wordpress, facebook, linkedin, tiktok };
}
