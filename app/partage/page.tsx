"use client";
// Réception d'un partage (Android) : « Partager › Media Booster » depuis Chrome, YouTube, X…
// Le lien partagé ouvre directement l'atelier Actu, comme une actu reprise depuis la veille.
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Android met souvent le lien dans le texte partagé plutôt que dans le champ « url ».
function premierLien(...textes: (string | null)[]): string | null {
  for (const t of textes) {
    const m = t?.match(/https?:\/\/[^\s<>"']+/i);
    if (m) return m[0].replace(/[),.;!?»]+$/, "");
  }
  return null;
}

function Partage() {
  const q = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const titre = q.get("titre")?.trim() ?? "";
    const texte = q.get("texte")?.trim() ?? "";
    const lien = premierLien(q.get("lien"), texte, titre);
    const p = new URLSearchParams();
    if (lien) {
      p.set("src", lien);
      try { p.set("source", new URL(lien).hostname.replace(/^www\./, "")); } catch { /* lien illisible : la source reste vide */ }
      const titrePropre = titre && !/^https?:\/\//i.test(titre) ? titre : texte.replace(lien, "").trim();
      if (titrePropre) p.set("titre", titrePropre.slice(0, 200));
      router.replace(`/creer/actu?${p.toString()}`);
    } else {
      // Pas de lien : le texte partagé devient l'idée du post.
      const idee = [titre, texte].filter(Boolean).join("\n").slice(0, 1000);
      if (idee) p.set("idee", idee);
      router.replace(`/creer/actu${idee ? `?${p.toString()}` : ""}`);
    }
  }, [q, router]);
  return (
    <div className="page" style={{ alignItems: "center", justifyContent: "center", minHeight: "60dvh" }}>
      <p className="muted">Ouverture du lien partagé…</p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Partage />
    </Suspense>
  );
}
