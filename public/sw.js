// Service worker de Media Booster (application installable).
// Règles de mise en cache, choisies pour ne jamais afficher de données périmées ou d'un autre compte :
// - pages : toujours le réseau d'abord ; sans réseau, la page « Hors ligne » ;
// - fichiers de l'app (/_next/static, icônes, polices) : mémoire d'abord, ils ne changent jamais à adresse égale ;
// - API, connexion, visuels signés : jamais mis en cache.
// Changer VERSION force la mise à jour chez tous les utilisateurs.
const VERSION = "mb-v1";
const CACHE_FICHIERS = `${VERSION}-fichiers`;
const CACHE_PAGES = `${VERSION}-pages`;
const HORS_LIGNE = "/hors-ligne";
const PRECHARGE = [HORS_LIGNE, "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_PAGES).then((cache) =>
      // Un fichier manquant ne doit pas bloquer l'installation.
      Promise.all(PRECHARGE.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => undefined))),
    ),
  );
  // La nouvelle version attend que l'utilisateur accepte la mise à jour (bandeau dans l'app).
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const noms = await caches.keys();
      await Promise.all(noms.filter((n) => !n.startsWith(VERSION)).map((n) => caches.delete(n)));
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => undefined);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "maj") self.skipWaiting();
});

const estFichierFixe = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icons/") ||
  /\.(?:woff2?|ttf|otf)$/i.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  // Navigation (ouverture d'une page) : réseau d'abord, page « Hors ligne » en secours.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const pre = await event.preloadResponse;
          if (pre) return pre;
          return await fetch(req);
        } catch {
          const cache = await caches.open(CACHE_PAGES);
          return (await cache.match(HORS_LIGNE)) || new Response("Hors ligne", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }
      })(),
    );
    return;
  }

  // Fichiers de l'app : mémoire d'abord, puis réseau (et on garde la copie).
  if (estFichierFixe(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_FICHIERS);
        const vu = await cache.match(req);
        if (vu) return vu;
        const rep = await fetch(req);
        if (rep.ok && rep.type === "basic") cache.put(req, rep.clone()).catch(() => undefined);
        return rep;
      })(),
    );
  }
  // Tout le reste (images de la médiathèque, visuels, pages de données) passe par le réseau, sans mise en cache.
});
