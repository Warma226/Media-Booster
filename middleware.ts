// Protège toute l'application : sans session valide, on est envoyé vers l'écran de connexion (/acces).
// La session porte l'espace du client : il est transmis aux routes (x-mb-espace), qui ne voient que ses données.
// Chaque membre n'ouvre que les pages et les actions de son rôle (lib/roles).
// Quand l'essai ou l'abonnement est terminé, seules la page Abonnement et le compte restent ouverts.
// Exceptions (pas de session) : connexion, inscription, invitation, tâches planifiées (clé CRON_SECRET),
// notification de paiement, visuels signés, fichiers de l'app installable, pages légales.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "@/lib/session";
import { apiAutorisee, pageAutorisee } from "@/lib/roles";
import { accesOuvert, PAGES_SANS_ABONNEMENT } from "@/lib/abonnement";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|sw.js|icons/|hors-ligne|api/cron|api/cm-cron|api/visuel|api/login|api/inscription|api/invitation|api/abonnement/notification|invitation|inscription|bienvenue|landing/|studio/|recap/|cyberbase/|citations/|wp/|api/media|cgu|confidentialite|tiktok).*)"],
};

type EtatSession = { ouverte: boolean; acces: boolean };
// Session encore ouverte en base (déconnexion à distance, membre retiré) et abonnement de l'espace : gardé 60 s.
const vues = new Map<string, { etat: EtatSession; at: number }>();
async function etatSession(sid: string): Promise<EtatSession> {
  const c = vues.get(sid);
  if (c && Date.now() - c.at < 60000) return c.etat;
  const url = process.env.SUPABASE_URL, cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle) return { ouverte: true, acces: true };
  try {
    const r = await fetch(`${url}/rest/v1/sessions?id=eq.${encodeURIComponent(sid)}&select=id,espace:espaces(statut,essai_fin,payee_jusqu)`, {
      // Les nouvelles clés « sb_secret_… » passent seulement par apikey ; l'ancienne clé service_role (JWT) aussi par Authorization.
      headers: cle.startsWith("sb_") ? { apikey: cle } : { apikey: cle, Authorization: `Bearer ${cle}` },
      cache: "no-store",
    });
    if (!r.ok) return { ouverte: true, acces: true }; // base injoignable : on ne bloque pas
    const lignes = (await r.json()) as { espace: { statut: string; essai_fin: string | null; payee_jusqu: string | null } | null }[];
    const etat = lignes.length ? { ouverte: true, acces: accesOuvert(lignes[0].espace as never) } : { ouverte: false, acces: false };
    vues.set(sid, { etat, at: Date.now() });
    if (vues.size > 2000) vues.clear();
    return etat;
  } catch {
    return { ouverte: true, acces: true };
  }
}

function suite(req: NextRequest, uid: string, role: string, sid: string, espace: string) {
  // Identité transmise aux routes (les en-têtes envoyés par le navigateur sont écrasés).
  const h = new Headers(req.headers);
  h.set("x-mb-uid", uid);
  h.set("x-mb-role", role);
  h.set("x-mb-sid", sid);
  h.set("x-mb-espace", espace);
  return NextResponse.next({ request: { headers: h } });
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const sansBase = !(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!process.env.APP_SECRET) {
    if (process.env.NODE_ENV === "production") return new NextResponse("Configure APP_SECRET dans Vercel pour ouvrir Media Booster.", { status: 503 });
    if (sansBase) return suite(req, "demo", "admin", "", "demo"); // développement sans base : espace de démonstration
  }
  let s = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  let acces = true;
  if (s?.sid) {
    const etat = await etatSession(s.sid);
    if (!etat.ouverte) s = null;
    else acces = etat.acces;
  }
  if (pathname === "/acces") return s ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  if (!s) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Session expirée : recharge la page et reconnecte-toi." }, { status: 401 });
    // Visiteur sur l'accueil : page publique de présentation ; ouverture depuis l'application installée : connexion.
    if (pathname === "/" && req.nextUrl.searchParams.get("source") !== "app") return NextResponse.redirect(new URL("/bienvenue", req.url));
    const url = new URL("/acces", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    const res = NextResponse.redirect(url);
    if (req.cookies.get(SESSION_COOKIE)) res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }
  // Essai ou abonnement terminé : direction la page Abonnement.
  if (!acces && !PAGES_SANS_ABONNEMENT.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Votre essai ou votre abonnement est terminé. Choisissez une formule dans Abonnement.", abonnement: true }, { status: 402 });
    return NextResponse.redirect(new URL("/abonnement", req.url));
  }
  if (pathname.startsWith("/api/")) {
    if (!apiAutorisee(s.role, pathname, req.method)) return NextResponse.json({ error: "Cette action est réservée à un autre rôle de l'équipe." }, { status: 403 });
  } else if (!pageAutorisee(s.role, pathname)) {
    return NextResponse.redirect(new URL("/compte?refus=1", req.url));
  }
  return suite(req, s.uid, s.role, s.sid ?? "", s.espace);
}
