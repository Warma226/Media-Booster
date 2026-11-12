"use client";
// Partager sur WhatsApp : WhatsApp n'autorise aucune application à publier seule dans une chaîne ou un groupe.
// Sur téléphone, le menu de partage du système s'ouvre avec le visuel et le texte : on choisit WhatsApp, puis la
// chaîne ou le groupe. Sans partage de fichier possible (ordinateur), WhatsApp s'ouvre avec le texte et le lien du visuel.
import { useState } from "react";

const sansMarkdown = (t: string) => t.replace(/\*\*/g, "*").trim();

export function PartageWhatsApp({ texte, image, titre }: { texte: string; image?: string; titre?: string }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function partager() {
    setBusy(true);
    setNote("");
    const message = sansMarkdown(texte);
    try {
      if (image && typeof navigator !== "undefined" && "canShare" in navigator) {
        const r = await fetch(image);
        if (r.ok) {
          const blob = await r.blob();
          const ext = blob.type.includes("jpeg") ? "jpg" : blob.type.includes("webp") ? "webp" : "png";
          const fichier = new File([blob], `${(titre || "publication").slice(0, 40).replace(/[^\w-]+/g, "-")}.${ext}`, { type: blob.type || "image/png" });
          if (navigator.canShare({ files: [fichier] })) {
            await navigator.share({ files: [fichier], text: message });
            setNote("Choisissez WhatsApp, puis la chaîne ou le groupe.");
            return;
          }
        }
      }
      const lien = image && /^https?:\/\//.test(image) ? `\n\n${image}` : "";
      window.open(`https://wa.me/?text=${encodeURIComponent(message + lien)}`, "_blank", "noopener");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setNote("Partage impossible. Copiez le texte et envoyez-le depuis WhatsApp.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      <button type="button" className="mb-whatsapp" onClick={partager} disabled={busy || !texte.trim()}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z" /></svg>
        {busy ? "Préparation…" : "Partager sur WhatsApp"}
      </button>
      {note ? <span className="small muted">{note}</span> : null}
    </div>
  );
}
