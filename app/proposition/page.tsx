"use client";
// Proposition de Media Booster : à partir de la marque et des rubriques, l'IA prépare les sources de veille,
// les thèmes et les règles de publication. Le client accepte tout d'un bouton ; le détail reste replié.
// Les sites proposés sont vérifiés un par un (flux RSS réel) avant d'être montrés.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/BottomNav";
import { getInfo, saveSettings } from "@/lib/client";
import { chargerProfil } from "@/components/Profil";
import { allTriggers, type Source, type Trigger } from "@/lib/config";
import type { Settings } from "@/lib/settings";
import type { Theme } from "@/lib/marque";
import { POIDS_IMPORTANCE, type Proposition } from "@/lib/proposition-types";

type SourceVerifiee = Source & { pourquoi: string };
type Etat = "attente" | "reflexion" | "verification" | "pret" | "erreur" | "applique";

const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
const FORMAT: Record<string, string> = { resume: "un résumé", explication: "une explication simple", "les-deux": "un résumé expliqué" };

async function verifier(url: string): Promise<Source | null> {
  try {
    const r = await fetch("/api/sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
    if (!r.ok) return null;
    return ((await r.json()) as { source?: Source }).source ?? null;
  } catch {
    return null;
  }
}

export default function PropositionPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [etat, setEtat] = useState<Etat>("attente");
  const [erreur, setErreur] = useState("");
  const [prop, setProp] = useState<Proposition | null>(null);
  const [sources, setSources] = useState<SourceVerifiee[]>([]);
  const [verifies, setVerifies] = useState(0);
  const [retires, setRetires] = useState<Set<string>>(new Set());
  const [seul, setSeul] = useState(false);
  const lance = useRef(false);

  useEffect(() => {
    getInfo().then((i) => setSettings(i.settings)).catch(() => setSettings(null));
  }, []);

  const marquePrete = Boolean(settings?.marque?.ligne || settings?.marque?.description || settings?.marque?.public);

  async function preparer() {
    setErreur("");
    setProp(null);
    setSources([]);
    setVerifies(0);
    setRetires(new Set());
    setEtat("reflexion");
    try {
      const r = await fetch("/api/propositions", { method: "POST" });
      const d = (await r.json()) as { proposition?: Proposition; error?: string };
      if (!r.ok || !d.proposition) throw new Error(d.error ?? "La proposition n'a pas abouti. Réessayez dans un instant.");
      const p = d.proposition;
      setProp(p);
      setEtat("verification");
      // Vérification des sites, quatre à la fois : seuls ceux qui ont un flux lisible sont gardés.
      const file = [...p.sites];
      const trouvees: SourceVerifiee[] = [];
      await Promise.all(
        Array.from({ length: 4 }, async () => {
          for (let site = file.shift(); site; site = file.shift()) {
            const src = await verifier(site.url);
            setVerifies((n) => n + 1);
            if (src && !trouvees.some((x) => x.id === src.id) && trouvees.length < 10) {
              trouvees.push({ ...src, name: site.nom || src.name, theme: site.theme || src.theme, note: site.pourquoi || src.note, pourquoi: site.pourquoi });
              setSources([...trouvees]);
            }
          }
        }),
      );
      setEtat("pret");
    } catch (e) {
      setErreur((e as Error).message);
      setEtat("erreur");
    }
  }

  // Lancement automatique dès que la marque est décrite : le client n'a rien à toucher.
  useEffect(() => {
    if (settings && marquePrete && !lance.current) {
      lance.current = true;
      preparer();
    }
  }, [settings, marquePrete]);

  const garde = (cle: string) => !retires.has(cle);
  const basculer = (cle: string) =>
    setRetires((r) => {
      const n = new Set(r);
      if (n.has(cle)) n.delete(cle);
      else n.add(cle);
      return n;
    });

  const sourcesGardees = sources.filter((s) => garde(`s:${s.id}`));
  const themesGardes = (prop?.themes ?? []).filter((t) => garde(`t:${t.label}`));
  const reglesGardees = (prop?.regles ?? []).filter((r) => garde(`r:${r.nom}`));
  const h = prop?.horaires;

  async function accepter() {
    if (!settings || !prop || !h) return;
    setEtat("applique");
    const dejaSources = settings.customSources ?? [];
    const nouvellesSources = sourcesGardees.filter((s) => !dejaSources.some((x) => x.id === s.id)).map(({ pourquoi: _p, ...s }) => s);
    const dejaThemes = settings.themes ?? [];
    const nouveauxThemes: Theme[] = themesGardes
      .map((t) => ({ id: slug(t.label) || `theme-${Date.now()}`, label: t.label, keywords: t.keywords, poids: POIDS_IMPORTANCE[t.importance] }))
      .filter((t) => !dejaThemes.some((x) => x.id === t.id));
    const idsSources = [...dejaSources, ...nouvellesSources].map((s) => s.id);
    const nouvellesRegles: Trigger[] = reglesGardees.map((r, i) => ({
      id: `${slug(r.nom) || "regle"}-${Date.now().toString(36)}${i}`,
      name: r.nom,
      sources: idsSources,
      keywords: r.keywords,
      minScore: 60,
      format: r.format,
      platforms: ["facebook", "linkedin"],
      mode: r.relecture ? "manuel" : "general",
      image: "visuel",
      enabledByDefault: true,
    }));
    const regles = allTriggers(settings.triggers);
    // Les règles déjà en place suivent aussi les nouvelles sources.
    const reglesMaj = regles.map((t) => ({ ...t, sources: Array.from(new Set([...t.sources, ...nouvellesSources.map((s) => s.id)])) }));
    try {
      await saveSettings({
        customSources: [...dejaSources, ...nouvellesSources],
        sourcesEnabled: Object.fromEntries(nouvellesSources.map((s) => [s.id, true])),
        themes: [...dejaThemes, ...nouveauxThemes],
        triggers: [...reglesMaj, ...nouvellesRegles],
        triggersEnabled: Object.fromEntries(nouvellesRegles.map((t) => [t.id, true])),
        garde: { debut: h.debut, fin: h.fin, maxParJour: h.parJour, ecart: h.ecart },
        autopilot: seul,
      });
      await chargerProfil(true);
      window.location.href = "/demarrage";
    } catch (e) {
      setErreur((e as Error).message);
      setEtat("pret");
    }
  }

  const total = prop?.sites.length ?? 0;

  return (
    <>
      <TopBar title="Ma proposition" back="/demarrage" />
      <main className="page sub mb-prop">
        {settings && !marquePrete ? (
          <section className="card mb-prop-vide">
            <h2>Parlez-moi d&apos;abord de votre média</h2>
            <p className="muted">Je pars de votre public et de votre ligne éditoriale pour choisir vos sources et vos sujets.</p>
            <Link href="/marque" className="btn primary">Décrire mon média</Link>
          </section>
        ) : null}

        {etat === "reflexion" || etat === "verification" ? (
          <section className="mb-prop-attente" role="status" aria-live="polite">
            <span className="mb-prop-pulse" aria-hidden="true" />
            <h2>{etat === "reflexion" ? "Je prépare votre veille…" : "Je vérifie les sites un par un…"}</h2>
            <p className="muted">
              {etat === "reflexion"
                ? "Je choisis des sources fiables pour votre public, les sujets à suivre et vos heures de publication."
                : `${verifies} sur ${total} vérifiés · ${sources.length} retenus`}
            </p>
            {sources.length ? (
              <ul className="mb-prop-flux">
                {sources.slice(-4).map((s) => <li key={s.id}>{s.name}</li>)}
              </ul>
            ) : null}
          </section>
        ) : null}

        {etat === "erreur" ? (
          <section className="card mb-prop-vide">
            <p className="notice rouge" role="alert">{erreur}</p>
            <button type="button" className="btn primary" onClick={preparer}>Réessayer</button>
          </section>
        ) : null}

        {(etat === "pret" || etat === "applique") && prop && h ? (
          <>
            <header className="mb-prop-tete">
              <h1>Voici ce que je vous propose</h1>
              <p className="muted">Tout est modifiable plus tard. Un seul bouton suffit pour démarrer.</p>
            </header>

            <ul className="mb-prop-resume">
              <li><strong>{sourcesGardees.length}</strong><span>sources fiables à lire chaque jour</span></li>
              <li><strong>{themesGardes.length}</strong><span>sujets à repérer pour votre public</span></li>
              <li><strong>{h.debut} h – {h.fin} h</strong><span>jusqu&apos;à {h.parJour} posts par jour, {Math.round(h.ecart / 60 * 10) / 10} h d&apos;écart au moins</span></li>
            </ul>

            <fieldset className="mb-prop-choix">
              <legend>Avant chaque publication</legend>
              <button type="button" role="radio" aria-checked={!seul} className="mb-prop-option" onClick={() => setSeul(false)}>
                <strong>Je relis et je valide</strong>
                <span>Les posts vous attendent, prêts. Conseillé pour commencer.</span>
              </button>
              <button type="button" role="radio" aria-checked={seul} className="mb-prop-option" onClick={() => setSeul(true)}>
                <strong>Media Booster publie seul</strong>
                <span>Les sujets sensibles restent toujours en relecture. 10 min pour annuler.</span>
              </button>
            </fieldset>

            {erreur ? <p className="notice rouge" role="alert">{erreur}</p> : null}
            <button type="button" className="btn primary mb-prop-ok" disabled={etat === "applique" || (!sourcesGardees.length && !themesGardes.length)} onClick={accepter}>
              {etat === "applique" ? "J'installe tout…" : "Tout accepter"}
            </button>

            <details className="mb-prop-detail">
              <summary>Voir le détail et retirer ce qui ne vous va pas</summary>

              <h2>Sources</h2>
              {sources.length ? sources.map((s) => (
                <div key={s.id} className="mb-prop-ligne">
                  <span><strong>{s.name}</strong><small>{s.domain}{s.pourquoi ? ` · ${s.pourquoi}` : ""}</small></span>
                  <button type="button" role="switch" aria-checked={garde(`s:${s.id}`)} aria-label={`Garder ${s.name}`} className="switch" onClick={() => basculer(`s:${s.id}`)}><span /></button>
                </div>
              )) : <p className="muted small">Aucun site n&apos;a pu être vérifié cette fois. Relancez la proposition ou ajoutez vos sites dans Réglages avancés.</p>}

              <h2>Sujets suivis</h2>
              {prop.themes.map((t) => (
                <div key={t.label} className="mb-prop-ligne">
                  <span><strong>{t.label}</strong><small>{t.keywords.slice(0, 6).join(", ")}{t.keywords.length > 6 ? "…" : ""}</small></span>
                  <button type="button" role="switch" aria-checked={garde(`t:${t.label}`)} aria-label={`Garder ${t.label}`} className="switch" onClick={() => basculer(`t:${t.label}`)}><span /></button>
                </div>
              ))}

              {prop.regles.length ? <h2>Règles de publication</h2> : null}
              {prop.regles.map((r) => (
                <div key={r.nom} className="mb-prop-ligne">
                  <span><strong>{r.nom}</strong><small>{r.quand} : {FORMAT[r.format]}{r.relecture ? ", toujours relu par vous" : ""}.</small></span>
                  <button type="button" role="switch" aria-checked={garde(`r:${r.nom}`)} aria-label={`Garder ${r.nom}`} className="switch" onClick={() => basculer(`r:${r.nom}`)}><span /></button>
                </div>
              ))}
            </details>

            <button type="button" className="btn link small mb-prop-relance" disabled={etat === "applique"} onClick={preparer}>Me proposer autre chose</button>
          </>
        ) : null}
      </main>
    </>
  );
}
