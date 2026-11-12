// Propriétaire de la plateforme Media Booster : e-mails listés dans PLATEFORME_ADMINS (séparés par des virgules).
// Lui seul voit l'administration des clients (/plateforme) et la Médiathèque (stockage commun à tous les espaces).
import { dbGlobal } from "./store";
import { moi } from "./equipe";

export function contactAdminPlateforme(contact: string | null | undefined): boolean {
  const admins = (process.env.PLATEFORME_ADMINS ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  return Boolean(contact) && admins.includes(String(contact).trim().toLowerCase());
}

export async function estAdminPlateforme(): Promise<boolean> {
  if (!process.env.PLATEFORME_ADMINS) return false;
  const m = await moi().catch(() => null);
  if (!m) return false;
  const { data } = await dbGlobal().from("membres").select("contact").eq("id", m.uid).eq("espace_id", m.espace).maybeSingle();
  return contactAdminPlateforme(data?.contact as string | undefined);
}
