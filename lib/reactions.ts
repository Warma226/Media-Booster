// Réactions des posts publiés : j'aime, commentaires et partages, lus en direct sur Facebook (et LinkedIn pour
// les pages entreprise, quand l'accès Community Management est accordé). L'écran /reactions les rafraîchit seul.
import { db, type Post } from "./store";
import { FB_VERSION, identifiants, linkedinPagesAutorisees, versionLinkedin } from "./reseaux";

export type Compteurs = { reactions: number; commentaires: number; partages: number };
export type ReactionsPost = {
  id: string;
  titre: string;
  rubrique: string;
  publieLe: string;
  photo: string | null;
  facebook: (Compteurs & { url?: string }) | null;
  linkedin: (Compteurs & { url?: string }) | null;
};

// Identifiant Facebook du post : enregistré à la publication, sinon retrouvé dans le lien.
function idFacebook(p: Post): string | null {
  const r = p.results?.facebook;
  if (!r?.ok) return null;
  if (r.id) return r.id;
  const m = r.url?.match(/facebook\.com\/(?:[^/]+\/videos\/)?(\d+(?:_\d+)?)/);
  return m?.[1] ?? null;
}

async function compteursFacebook(id: string, token: string): Promise<Compteurs | null> {
  const champs = "reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares";
  try {
    const r = await fetch(`https://graph.facebook.com/${FB_VERSION()}/${encodeURIComponent(id)}?fields=${champs}&access_token=${encodeURIComponent(token)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { reactions?: { summary?: { total_count?: number } }; comments?: { summary?: { total_count?: number } }; shares?: { count?: number } };
    return { reactions: j.reactions?.summary?.total_count ?? 0, commentaires: j.comments?.summary?.total_count ?? 0, partages: j.shares?.count ?? 0 };
  } catch {
    return null;
  }
}

async function compteursLinkedin(urn: string, token: string): Promise<Compteurs | null> {
  try {
    const r = await fetch(`https://api.linkedin.com/rest/socialActions/${encodeURIComponent(urn)}`, {
      headers: { Authorization: `Bearer ${token}`, "LinkedIn-Version": versionLinkedin(), "X-Restli-Protocol-Version": "2.0.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { likesSummary?: { totalLikes?: number }; commentsSummary?: { aggregatedTotalComments?: number; totalFirstLevelComments?: number } };
    return { reactions: j.likesSummary?.totalLikes ?? 0, commentaires: j.commentsSummary?.aggregatedTotalComments ?? j.commentsSummary?.totalFirstLevelComments ?? 0, partages: 0 };
  } catch {
    return null;
  }
}

/** Posts publiés ces `jours` derniers jours, avec leurs réactions du moment. */
export async function reactionsRecentes(jours = 14, limite = 30): Promise<{ posts: ReactionsPost[]; facebook: boolean; linkedin: boolean }> {
  const depuis = new Date(Date.now() - jours * 86400000).toISOString();
  const { data, error } = await db()
    .from("posts")
    .select("id,title,idea,rubrique,visual,results,scheduled_at,created_at,status")
    .eq("status", "publie")
    .gte("created_at", depuis)
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  const { FB, LI } = await identifiants();
  const lireLi = LI.ok && linkedinPagesAutorisees() && LI.auteur.startsWith("urn:li:organization:");
  const posts = (data ?? []) as Post[];
  const lignes = await Promise.all(
    posts.map(async (p): Promise<ReactionsPost> => {
      const fbId = FB.ok ? idFacebook(p) : null;
      const liUrn = lireLi && p.results?.linkedin?.ok ? p.results.linkedin.id ?? null : null;
      const [fb, li] = await Promise.all([fbId ? compteursFacebook(fbId, FB.token) : null, liUrn ? compteursLinkedin(liUrn, LI.token) : null]);
      const quand = p.results?.facebook?.at ?? p.results?.linkedin?.at ?? p.scheduled_at ?? p.created_at;
      const v = (p.visual ?? {}) as { photo?: string; titre?: string };
      return {
        id: p.id,
        titre: p.title || v.titre || p.idea || "Post",
        rubrique: p.rubrique,
        publieLe: quand,
        photo: v.photo ?? null,
        facebook: fb ? { ...fb, url: p.results?.facebook?.url } : null,
        linkedin: li ? { ...li, url: p.results?.linkedin?.url } : null,
      };
    }),
  );
  return { posts: lignes, facebook: FB.ok, linkedin: lireLi };
}
