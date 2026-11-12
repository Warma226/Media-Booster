// Manifeste de l'application installable (PWA), servi à /manifest.webmanifest.
// C'est lui qui permet « Installer l'application » sur Android et « Sur l'écran d'accueil » sur iPhone.
import type { MetadataRoute } from "next";
import { APP_NOM } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NOM,
    short_name: "Booster",
    description: "Veille, création et publication des posts de votre média, depuis le téléphone.",
    lang: "fr",
    dir: "ltr",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#F7F6F2",
    theme_color: "#F7F6F2",
    categories: ["productivity", "social", "news"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    // Appui long sur l'icône : accès direct aux écrans les plus utilisés.
    shortcuts: [
      { name: "Créer un post", short_name: "Créer", url: "/creer?source=raccourci", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Veille", url: "/veille?source=raccourci", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Calendrier", url: "/calendrier?source=raccourci", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Le Grin", url: "/communaute?source=raccourci", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    // « Partager » depuis Chrome, YouTube, X… (Android) : le lien arrive directement dans Media Booster.
    share_target: {
      action: "/partage",
      method: "GET",
      params: { title: "titre", text: "texte", url: "lien" },
    },
  };
}
