"use client";
// Outils communs aux écrans de configuration (Ma marque, Rubriques, Thèmes) : enregistrement et message d'état.
import { useState } from "react";
import { saveSettings, type Info } from "@/lib/client";
import { chargerProfil } from "@/components/Profil";

type Patch = Partial<Info["settings"]>;

export function useEnregistrer() {
  const [etat, setEtat] = useState<{ busy: boolean; msg: string; erreur: boolean }>({ busy: false, msg: "", erreur: false });
  async function enregistrer(patch: Patch, ok = "Enregistré.") {
    setEtat({ busy: true, msg: "", erreur: false });
    try {
      await saveSettings(patch);
      await chargerProfil(true);
      setEtat({ busy: false, msg: ok, erreur: false });
      return true;
    } catch (e) {
      setEtat({ busy: false, msg: (e as Error).message, erreur: true });
      return false;
    }
  }
  return { ...etat, enregistrer };
}

export function Message({ msg, erreur }: { msg: string; erreur: boolean }) {
  if (!msg) return null;
  return <p className={`notice ${erreur ? "rouge" : "vert"}`} role={erreur ? "alert" : "status"}>{msg}</p>;
}
