# Media Booster

Application mobile (installable sur Android et iPhone) pour faire tourner un média tech : veille, rédaction assistée par l'IA, visuels aux couleurs de la charte et publication sur WordPress, Facebook, LinkedIn et TikTok.

Tout se configure et s'utilise depuis un téléphone.

## L'application sur le téléphone

Media Booster est une **application installable (PWA)** : pas de Play Store ni d'App Store, elle s'installe depuis le navigateur et se met à jour toute seule.

- **Android (Chrome)** : ouvre l'adresse de l'app, un bandeau « Installer Media Booster » apparaît en haut de l'écran. Sinon : menu ⋮ › **Installer l'application**.
- **iPhone (Safari)** : bouton **Partager** › **Sur l'écran d'accueil**. Le bandeau en haut de l'écran le rappelle.

Une fois installée :
- elle s'ouvre en plein écran depuis son icône, comme une appli classique ;
- **appui long sur l'icône** : accès direct à Créer, Veille, Calendrier, Le Grin ;
- **Partager › Media Booster** (Android) depuis Chrome, YouTube, X… : le lien ouvre directement l'atelier Actu pour en faire un post ;
- sans réseau, une page « Pas de connexion » s'affiche au lieu d'une erreur, et un bandeau prévient quand la connexion tombe ;
- à chaque mise à jour envoyée sur GitHub, un bandeau « Nouvelle version disponible » propose de recharger.

## Votre marque

Le nom du média, son site et sa description se règlent dans Vercel (**Settings › Environment Variables**), sans toucher au code, puis **Redeploy**. Ils servent à l'IA (rédaction, community manager), aux visuels générés et aux hashtags.

| Variable | Exemple | Rôle |
|---|---|---|
| `NEXT_PUBLIC_MEDIA_NOM` | `Mon Média Tech` | Nom du média dans les posts, visuels et réponses aux abonnés. Par défaut : Media Booster. |
| `NEXT_PUBLIC_MEDIA_COURT` | `MMT` | Logo texte des visuels (5 lettres au plus idéalement). Par défaut : BOOST. |
| `NEXT_PUBLIC_MEDIA_SITE` | `www.monmedia.com` | Site du média, affiché en bas des visuels et sur l'écran de connexion. |
| `NEXT_PUBLIC_MEDIA_FACEBOOK` | `https://www.facebook.com/monmedia` | Lien vers la Page, sur l'écran de connexion. |
| `NEXT_PUBLIC_MEDIA_DESCRIPTION` | `média d'actualité tech et cybersécurité` | Présentation du média donnée à l'IA. |
| `NEXT_PUBLIC_MEDIA_PUBLIC` | `l'Afrique de l'Ouest francophone` | Public visé : l'IA ancre les sujets dans son quotidien. |

Le hashtag de marque est calculé depuis le nom (`Mon Média Tech` → `#MonMediaTech`). L'assistante IA s'appelle **NOVA**.

## Ce que fait l'application

| Écran | Rôle |
|---|---|
| **Accueil** | Posts à valider, planifiés, en erreur. Bouton **Manuel / Auto ON**. |
| **Veille** | Lit les sources (The Hacker News, Frandroid, TechCrunch, Sikafinance filtrée), classe par thème, regroupe les doublons, signale les sujets sensibles. |
| **Déclencheurs** | Règles qui transforment une actu en post. Mode général **OFF = Manuel** (aperçu obligatoire) ou **ON = Autopilote**. |
| **Créer** | Rubrique (#ActuTech, #CyberBase, #Portrait), idée, plateformes, rédaction par l'IA. |
| **Aperçu** | Éditeur par plateforme, compteur de caractères, assistant IA, visuel, planification ou publication. |
| **Comptes** | État des connexions (IA, base de données, réseaux). |

**Garde-fous de l'autopilote** (modifiables dans `lib/config.ts`) : 2 sources minimum sur le même sujet, 10 minutes pour annuler, 6 publications automatiques par jour au maximum, jamais d'automatique pour les sujets sensibles (décès, politique, justice…), portraits toujours en manuel. Les textes sont toujours reformulés et sourcés.

**Rubriques et visuels** : seule l'Actualité (#ActuTech) a un visuel généré par l'app : photo plein cadre, bandeau de catégorie bleu, texte de l'actu. Pour #CyberBase (une notion chaque jour à 8 h : l'aperçu propose le prochain jour libre et le calendrier signale les jours vides) et #Portrait, tu crées toi-même le visuel et tu colles son lien dans l'éditeur.

**Charte** : violet `#5B3DF5`, nuit `#1B0F4D`, rose `#E11D74`, police Archivo (licence libre) pour les visuels. Pour mettre ton propre logo sur les visuels, mets une image PNG en ligne et indique son adresse dans `LOGO_URL`.

## Mise en ligne (environ 30 minutes, depuis le téléphone)

### 1. Base de données : Supabase (gratuit)
1. Crée un compte sur supabase.com, puis un projet.
2. Ouvre **SQL Editor**, colle le contenu de `supabase/schema.sql`, appuie sur **Run**.
3. Dans **Project Settings › API**, note l'**URL** du projet et la clé **service_role** (elle reste secrète, ne la partage jamais).

Sans Supabase, l'application tourne en **mode démo** : les posts disparaissent à chaque redémarrage.

### 2. Hébergement : Vercel (gratuit)
1. Crée un compte sur vercel.com avec ton compte GitHub.
2. **Add New › Project**, choisis le dépôt `Media-Booster`, puis **Deploy**.
3. Dans **Settings › Environment Variables**, ajoute les variables ci-dessous, puis **Deployments › Redeploy**.

| Variable | Valeur |
|---|---|
| `APP_PASSWORD` | Le mot de passe de l'écran de connexion. **Seule variable obligatoire pour ouvrir l'app.** |
| `APP_SECRET` | Facultatif : une longue suite de caractères au hasard. Sinon, le mot de passe sert de clé. |
| `APP_URL` | Facultatif sur Vercel (détectée automatiquement). À renseigner si tu utilises ton propre domaine. |
| `CRON_SECRET` | Une autre longue suite de caractères au hasard. |
| `GEMINI_API_KEY` | Gratuit : clé Google Gemini, créée sur aistudio.google.com (Get API key). |
| `ANTHROPIC_API_KEY` | Facultatif, payant à l'usage : clé Claude, créée sur platform.claude.com. Utilisée en priorité si elle est présente. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Les valeurs notées à l'étape 1. |

Ouvre ensuite l'adresse de l'app : l'écran de connexion demande le mot de passe `APP_PASSWORD` (tu restes connecté 30 jours sur l'appareil ; « Se déconnecter » est dans Connexions). Installe-la ensuite sur le téléphone (voir « L'application sur le téléphone »).

### 3. Veille automatique (toutes les 15 minutes)
La tâche est lancée par Supabase (extensions pg_cron et pg_net), avec l'adresse de l'app et la clé `CRON_SECRET` gardées dans le coffre (Vault) de Supabase. Le bloc à lancer est en fin de `supabase/schema.sql`. Dans Vercel, la protection « Vercel Authentication » doit rester limitée aux versions de test (Preview), sinon la tâche et les réseaux sociaux ne peuvent pas joindre l'app.

Solution de secours : `.github/workflows/media-booster-cron.yml`, avec les secrets GitHub `MB_URL` et `MB_CRON_SECRET`.

### 4. Relier les comptes

**WordPress**
Dans ton WordPress : **Utilisateurs › Profil › Mots de passe d'application**, crée « Media Booster ». Puis dans Vercel :
`WP_URL` (ex. `https://www.monmedia.com`), `WP_USER`, `WP_APP_PASSWORD`.

**Facebook (Page)**
1. Crée une application sur developers.facebook.com et relie la Page Facebook de ton média.
2. Obtiens un jeton de Page longue durée avec les permissions `pages_manage_posts` et `pages_read_engagement`.
3. Dans Vercel : `FB_PAGE_ID`, `FB_PAGE_TOKEN`.

**LinkedIn (Page entreprise, via Make)**
L'accès direct à l'API LinkedIn pour les Pages exige une entreprise enregistrée et un e-mail professionnel. L'app passe donc par Make (make.com, gratuit) :
1. Dans Make, crée un scénario : « Webhooks › Custom webhook » → « HTTP › Get a file » (URL : `image_url`) → « LinkedIn › Create an Organization Image Post » (Page de ton média, texte : `text`, image : le fichier, visibilité publique).
2. Dans Vercel : `LINKEDIN_WEBHOOK_URL` = l'adresse du webhook, puis redéploie.
3. Sur le webhook Make, clique « Redetermine data structure », puis dans l'app (Connexions) « Envoyer un exemple à Make » : rien n'est publié.
4. Active le scénario. Champs envoyés : `text`, `image_url`, `title`, `source_url`, `post_id`, `test`.

Accès direct (si un jour l'accès Community Management API est accordé) : `LINKEDIN_TOKEN` et `LINKEDIN_AUTHOR` (forme `urn:li:organization:123456`), sans `LINKEDIN_WEBHOOK_URL`.

**TikTok**
Demande l'accès « Content Posting API » sur developers.tiktok.com. La publication sera branchée une fois l'application validée par TikTok.

Lance les demandes Facebook, LinkedIn et TikTok tôt : leur validation peut prendre du temps.

## Modifier l'application

- **Sources, déclencheurs, garde-fous, guide de style de l'IA** : `lib/config.ts`
- **Gabarits des visuels** : `lib/visual.tsx`
- **Couleurs de l'interface** : `app/globals.css`
- **Identité par défaut du média** : `lib/brand.ts`
- **Application installable** : `app/manifest.ts` (nom, icônes, raccourcis, partage), `public/sw.js` (hors ligne, mises à jour : change `VERSION` pour forcer une mise à jour), `components/Pwa.tsx` (bandeaux), icônes dans `public/icons/`

Chaque modification envoyée sur GitHub est remise en ligne automatiquement par Vercel.

## Technique

Next.js 15 (App Router), TypeScript, PWA (manifeste + service worker), Supabase, rss-parser, `next/og` pour les visuels, API Claude pour la rédaction. Les liens des visuels sont signés ; toute l'application est protégée par mot de passe.
