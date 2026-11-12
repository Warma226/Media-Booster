// Stockage des images importées depuis le téléphone (tes visuels, photos de fond).
// 1. Supabase Storage (seau public « visuels », créé automatiquement) ; 2. sinon la médiathèque WordPress.
import { db, isDemo } from "./store";
import { espaceId } from "./espace";
import { identifiants } from "./reseaux";

const BUCKET = "visuels";
let bucketReady = false;

async function supabaseUpload(bytes: ArrayBuffer, type: string, name: string): Promise<string> {
  const storage = db().storage;
  if (!bucketReady) {
    const { error } = await storage.getBucket(BUCKET);
    if (error) {
      const created = await storage.createBucket(BUCKET, { public: true });
      if (created.error && !/already exists/i.test(created.error.message)) throw new Error(`Stockage Supabase : ${created.error.message}`);
    }
    bucketReady = true;
  }
  const { error } = await storage.from(BUCKET).upload(name, bytes, { contentType: type, upsert: false });
  if (error) throw new Error(`Stockage Supabase : ${error.message}`);
  return storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
}

async function wordpressUpload(bytes: ArrayBuffer, type: string, name: string): Promise<string> {
  const { WP } = await identifiants();
  const base = WP.url;
  const auth = "Basic " + Buffer.from(`${WP.user}:${WP.appPassword}`).toString("base64");
  const res = await fetch(`${base}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": type, "Content-Disposition": `attachment; filename="${name.split("/").pop()}"` },
    body: bytes,
  });
  if (!res.ok) throw new Error(`WordPress (image) ${res.status} : ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { source_url?: string };
  if (!json.source_url) throw new Error("WordPress n'a pas renvoyé l'adresse de l'image.");
  return json.source_url;
}

// Envoi direct depuis le navigateur (vidéos trop lourdes pour passer par l'app) : lien d'envoi signé, valable 2 h.
export async function signedUpload(type: string, ext: string): Promise<{ signedUrl: string; publicUrl: string }> {
  if (isDemo()) throw new Error("L'envoi de vidéos demande Supabase (voir Connexions).");
  if (!/^(video|image|audio)\//.test(type)) throw new Error("Type de fichier refusé.");
  const name = `${await espaceId()}/${new Date().toISOString().slice(0, 7)}/mb-${crypto.randomUUID().slice(0, 8)}.${ext.replace(/[^a-z0-9]/gi, "").slice(0, 5) || "bin"}`;
  const storage = db().storage.from(BUCKET);
  const { data, error } = await storage.createSignedUploadUrl(name);
  if (error || !data) throw new Error(`Stockage Supabase : ${error?.message ?? "lien d'envoi indisponible"}`);
  return { signedUrl: data.signedUrl, publicUrl: storage.getPublicUrl(name).data.publicUrl };
}

// Fichier produit côté serveur (voix off de synthèse…) → URL publique Supabase.
export async function enregistrerFichier(bytes: ArrayBuffer, type: string, ext: string): Promise<string> {
  if (isDemo()) throw new Error("Le stockage de fichiers demande Supabase.");
  return supabaseUpload(bytes, type, `${await espaceId()}/${new Date().toISOString().slice(0, 7)}/mb-${crypto.randomUUID().slice(0, 8)}.${ext}`);
}

export function uploadAvailable(): boolean {
  return !isDemo();
}

export async function storeImage(bytes: ArrayBuffer, type: string): Promise<string> {
  const ext = type === "image/jpeg" ? "jpg" : type === "image/webp" ? "webp" : "png";
  const name = `${await espaceId()}/${new Date().toISOString().slice(0, 7)}/mb-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  if (!isDemo()) return supabaseUpload(bytes, type, name);
  if ((await identifiants()).WP.ok) return wordpressUpload(bytes, type, name);
  throw new Error("Pour importer une image, branche Supabase ou WordPress (voir Connexions). En attendant, colle le lien de l'image.");
}
