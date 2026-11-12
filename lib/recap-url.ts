// Liens signés vers les slides du récap (rendues en PNG par /api/visuel?r=recap).
import { signParams, appUrl } from "./sign";

export type MarqueLien = { nom: string; court: string; signature: string };
export type CoverParams = { periode: string; count: number; photos: string[]; categories: string[] };
export type ItemParams = { index: number; total: number; categorie: string; texte: string; photo?: string; source?: string; autres?: { photo?: string; categorie: string }[] };

function signed(p: URLSearchParams, m?: MarqueLien): string {
  // Marque du média (nom, sigle, signature) : le visuel est rendu sans session, elle voyage dans le lien signé.
  if (m) { p.set("mq", m.nom); p.set("co", m.court); p.set("sg", m.signature); }
  p.set("sig", signParams(p));
  return `${appUrl()}/api/visuel?${p.toString()}`;
}

export function coverUrl(c: CoverParams, m?: MarqueLien): string {
  const p = new URLSearchParams({ r: "recap", k: "cover", per: c.periode, n: String(c.count) });
  c.photos.slice(0, 8).forEach((u, i) => p.set(`p${i}`, u));
  c.categories.slice(0, 8).forEach((u, i) => p.set(`c${i}`, u));
  return signed(p, m);
}

export function itemUrl(it: ItemParams, m?: MarqueLien): string {
  const p = new URLSearchParams({ r: "recap", k: "item", i: String(it.index), tot: String(it.total), cat: it.categorie, x: it.texte });
  if (it.photo) p.set("ph", it.photo);
  if (it.source) p.set("src", it.source);
  (it.autres ?? []).slice(0, 4).forEach((a, i) => {
    if (a.photo) p.set(`ap${i}`, a.photo);
    p.set(`ac${i}`, a.categorie);
  });
  return signed(p, m);
}

export function endUrl(m?: MarqueLien): string {
  return signed(new URLSearchParams({ r: "recap", k: "end", v: "3" }), m);
}
