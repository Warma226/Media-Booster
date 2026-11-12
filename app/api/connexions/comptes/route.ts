import { NextResponse } from "next/server";
import { ecrireReseaux, facebookDisponible, linkedinDisponible, linkedinPagesAutorisees, lireReseaux } from "@/lib/reseaux";
import { delierTiktok, tiktokConfigured, tiktokRelie } from "@/lib/tiktok";

export const dynamic = "force-dynamic";

// GET → comptes reliés de l'espace, sans aucun jeton (pages Facebook, auteur LinkedIn, site WordPress, TikTok).
export async function GET() {
  const r = await lireReseaux();
  return NextResponse.json({
    disponible: { facebook: facebookDisponible(), linkedin: linkedinDisponible(), linkedinPages: linkedinPagesAutorisees(), tiktok: tiktokConfigured() },
    facebook: r.facebook ? { utilisateur: r.facebook.utilisateur, pageId: r.facebook.pageId, pages: r.facebook.pages.map(({ id, nom, categorie, photo }) => ({ id, nom, categorie, photo })) } : null,
    linkedin: r.linkedin ? { personne: r.linkedin.personne, organisations: r.linkedin.organisations, auteur: r.linkedin.auteur, expire: r.linkedin.expire, pagesAutorisees: r.linkedin.pagesAutorisees } : null,
    wordpress: r.wordpress ? { url: r.wordpress.url, utilisateur: r.wordpress.utilisateur } : null,
    tiktok: tiktokConfigured() ? await tiktokRelie().catch(() => false) : false,
  });
}

// POST { action: "page-facebook", id } | { action: "auteur-linkedin", urn } | { action: "wordpress", url, utilisateur, motDePasse }
//      | { action: "delier", reseau: "facebook" | "linkedin" | "wordpress" | "tiktok" }
export async function POST(req: Request) {
  try {
    const b = (await req.json().catch(() => ({}))) as Record<string, string>;
    if (b.action === "page-facebook") {
      await ecrireReseaux((r) => {
        if (!r.facebook?.pages.some((p) => p.id === b.id)) throw new Error("Page introuvable : reconnectez Facebook.");
        return { ...r, facebook: { ...r.facebook, pageId: b.id } };
      });
    } else if (b.action === "auteur-linkedin") {
      await ecrireReseaux((r) => {
        const li = r.linkedin;
        if (!li || (b.urn !== li.personne.urn && !li.organisations.some((o) => o.urn === b.urn))) throw new Error("Compte introuvable : reconnectez LinkedIn.");
        return { ...r, linkedin: { ...li, auteur: b.urn } };
      });
    } else if (b.action === "wordpress") {
      const url = (b.url ?? "").trim().replace(/\/+$/, "").replace(/^(?!https?:\/\/)/, "https://");
      const utilisateur = (b.utilisateur ?? "").trim(), motDePasse = (b.motDePasse ?? "").replace(/\s+/g, " ").trim();
      if (!/^https:\/\/[^/\s]+\.[^/\s]+/.test(url) || !utilisateur || !motDePasse) throw new Error("Indiquez l'adresse du site, l'identifiant et le mot de passe d'application.");
      const auth = "Basic " + Buffer.from(`${utilisateur}:${motDePasse}`).toString("base64");
      const t = await fetch(`${url}/wp-json/wp/v2/users/me?context=edit`, { headers: { Authorization: auth }, signal: AbortSignal.timeout(15000) }).catch(() => null);
      if (!t) throw new Error("Site injoignable : vérifiez l'adresse.");
      if (t.status === 401 || t.status === 403) throw new Error("WordPress refuse cet identifiant ou ce mot de passe d'application.");
      if (t.status === 404) throw new Error("Ce site ne répond pas comme un WordPress : vérifiez l'adresse.");
      if (!t.ok) throw new Error(`WordPress a répondu ${t.status}.`);
      await ecrireReseaux({ wordpress: { url, utilisateur, motDePasse } });
    } else if (b.action === "delier") {
      if (b.reseau === "tiktok") await delierTiktok();
      else if (["facebook", "linkedin", "wordpress"].includes(b.reseau)) await ecrireReseaux((r) => { const c = { ...r }; delete c[b.reseau as "facebook"]; return c; });
      else throw new Error("Réseau inconnu.");
    } else throw new Error("Action inconnue.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
