"use client";
// Qui est connecté (rôle, nom) : lu une fois par chargement de page, partagé entre les composants.
import { useEffect, useState } from "react";
import type { Role } from "@/lib/roles";

export type Moi = { uid: string; role: Role; roleNom: string; nom: string; plateforme?: boolean; espace?: { nom: string; formule: string; statut: string; essai_fin: string | null; payee_jusqu: string | null } | null };
let cache: Promise<Moi | null> | null = null;
export function chargerMoi(force = false): Promise<Moi | null> {
  if (!cache || force) cache = fetch("/api/compte", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return cache;
}
export function useMoi(): Moi | null {
  const [m, setM] = useState<Moi | null>(null);
  useEffect(() => { void chargerMoi().then(setM); }, []);
  return m;
}
