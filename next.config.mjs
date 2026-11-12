/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["rss-parser"],
  // Application installable : le service worker doit toujours être relu (sinon les mises à jour tardent).
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      { source: "/manifest.webmanifest", headers: [{ key: "Cache-Control", value: "public, max-age=3600" }] },
    ];
  },
};

export default nextConfig;
