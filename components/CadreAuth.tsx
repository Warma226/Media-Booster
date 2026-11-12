"use client";
// Cadre commun aux écrans sans session : connexion, inscription, invitation.
// Téléphone : bandeau émeraude avec le logo, puis la carte du formulaire. Ordinateur : présentation à gauche, formulaire à droite.
import { SigneBoost } from "@/components/Logo";

const ATOUTS = [
  { titre: "La veille travaille pour vous", texte: "Vos sources sont lues en continu, les sujets utiles remontent seuls." },
  { titre: "Un post prêt en une minute", texte: "L'IA rédige un texte par réseau et prépare le visuel à vos couleurs." },
  { titre: "Publié partout à la fois", texte: "Vos pages Facebook et LinkedIn, votre site, TikTok et WhatsApp." },
];

export function CadreAuth({ titre, sousTitre, children, pied }: { titre: string; sousTitre?: string; children: React.ReactNode; pied?: React.ReactNode }) {
  return (
    <div className="mb-auth">
      <aside className="mb-auth-marque">
        <div className="mb-auth-logo">
          <span className="mb-auth-tuile" aria-hidden="true"><SigneBoost size={26} /></span>
          <span><strong>Media Booster</strong><small>Votre média, publié partout</small></span>
        </div>
        <p className="mb-auth-accroche">Veille, rédaction et publication de vos posts, depuis votre téléphone.</p>
        <ul className="mb-auth-atouts">
          {ATOUTS.map((a) => (
            <li key={a.titre}>
              <span className="mb-auth-puce" aria-hidden="true" />
              <span><strong>{a.titre}</strong><span>{a.texte}</span></span>
            </li>
          ))}
        </ul>
      </aside>
      <main className="mb-auth-zone">
        <div className="mb-auth-carte">
          <h1>{titre}</h1>
          {sousTitre ? <p className="mb-auth-sous">{sousTitre}</p> : null}
          {children}
        </div>
        {pied ? <div className="mb-auth-pied">{pied}</div> : null}
        <p className="mb-auth-legal">
          <a href="/cgu">Conditions d&apos;utilisation</a> · <a href="/confidentialite">Confidentialité</a>
        </p>
      </main>
    </div>
  );
}

export function ChampMotDePasse({ id, value, onChange, autoComplete, placeholder }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; placeholder: string }) {
  return (
    <span className="mb-auth-mdp">
      <input id={id} name="password" type="password" autoComplete={autoComplete} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} required />
      <button type="button" aria-label="Afficher ou masquer le mot de passe"
        onClick={(e) => { const i = (e.currentTarget.previousElementSibling as HTMLInputElement); i.type = i.type === "password" ? "text" : "password"; }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
      </button>
    </span>
  );
}
