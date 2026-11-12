"use client";
// Profil du média connecté (marque, rubriques, thèmes), lu une fois par chargement de page et partagé.
// Charge aussi la marque dans les gabarits de visuels (definirMarqueActive).
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getInfo } from "@/lib/client";
import { completerMarque, definirMarqueActive, type Marque, type MarqueComplete, type RubriqueClient, type Theme } from "@/lib/marque";

export type Profil = { marque: MarqueComplete; marqueSaisie: Marque; rubriques: RubriqueClient[]; themes: Theme[]; demarrageFini: boolean };

let cache: Promise<Profil | null> | null = null;
export function chargerProfil(force = false): Promise<Profil | null> {
  if (!cache || force) {
    cache = getInfo()
      .then((i) => {
        const s = i.settings;
        definirMarqueActive(s.marque);
        return { marque: completerMarque(s.marque), marqueSaisie: s.marque ?? {}, rubriques: s.rubriques ?? [], themes: s.themes ?? [], demarrageFini: Boolean(s.demarrageFini) };
      })
      .catch(() => null);
  }
  return cache;
}

export function useProfil(): Profil | null {
  const [p, setP] = useState<Profil | null>(null);
  useEffect(() => { void chargerProfil().then(setP); }, []);
  return p;
}

const SANS_SESSION = ["/bienvenue", "/acces", "/inscription", "/invitation", "/hors-ligne", "/cgu", "/confidentialite"];

/** Placé dans la mise en page : charge la marque dès l'ouverture de l'app (rien à afficher). */
export function ChargeurProfil() {
  const path = usePathname();
  useEffect(() => {
    if (!SANS_SESSION.some((p) => path.startsWith(p))) void chargerProfil();
  }, [path]);
  return null;
}
