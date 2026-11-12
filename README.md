# Media Booster

Plateforme en ligne, vendue par abonnement, pour faire tourner un média depuis son téléphone : veille des sources, rédaction par l'IA, visuels aux couleurs du média, publication sur les pages Facebook et LinkedIn, le site WordPress et TikTok, partage WhatsApp.

Chaque client crée son compte, obtient son propre espace (ses posts, son équipe, ses pages, ses réglages, invisibles des autres clients), profite de 24 h d'essai puis choisit une formule mensuelle payée par mobile money ou carte (CinetPay).

## Ce que voit un client

1. **Inscription** : nom du média, son nom, e-mail, mot de passe. 24 h d'essai gratuit, sans carte.
2. **Guide de démarrage** : six étapes qui se cochent toutes seules.
   - **Ma marque** : nom, sigle, site, public visé, ligne éditoriale, ton, devise. L'IA écrit comme son média et ses visuels sont signés à son nom.
   - **Rubriques** : il active les modèles qu'il veut (Actualité, Citation, Notion du jour, Portrait) et leur donne son nom, son hashtag, son horaire.
   - **Sources** : les sites lus par la veille (rien n'est prérempli).
   - **Thèmes** : les sujets et mots-clés qui comptent pour son public, pour trier la veille.
   - **Connexions** : « Se connecter avec Facebook » puis la liste de ses pages s'affiche, il coche la sienne. Pareil pour LinkedIn. Site WordPress par formulaire. TikTok en option.
   - **Pilote automatique** (facultatif).
3. **Chaque jour** : veille, création, aperçu, programmation ; bouton **Partager sur WhatsApp** sur chaque post (WhatsApp n'autorise aucune application à publier seule dans une chaîne ou un groupe).
4. **Abonnement** : trois formules, paiement CinetPay, 30 jours d'accès par paiement, sans renouvellement automatique. À l'échéance, l'accès se ferme (les données restent) jusqu'au paiement suivant.

L'application s'installe sur le téléphone comme une appli (PWA) : voir plus bas.

## Formules

Définies dans `lib/abonnement.ts` (prix en FCFA, limites, atouts affichés) :

| Formule | Prix / mois | Publications auto / jour | Membres d'équipe |
|---|---|---|---|
| Démarrage | 5 000 FCFA | 3 | aucun |
| Pro | 15 000 FCFA | 10 | 2 |
| Équipe | 35 000 FCFA | 30 | 10 |

Durée de l'essai : `ESSAI_HEURES` dans le même fichier.

## Mise en route (toi, propriétaire de la plateforme, une seule fois)

Tout se fait depuis le téléphone, dans le navigateur. Les clés vont dans **Vercel › Settings › Environment Variables**, puis **Deployments › Redeploy**. La liste complète est dans `.env.example`.

### 1. Base de données : Supabase
1. Crée un projet sur supabase.com.
2. **SQL Editor** : colle tout `supabase/schema.sql`, puis **Run**.
3. **Project Settings › API** : copie l'URL et la clé `service_role` dans `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`.

### 2. Hébergement : Vercel
1. **Add New › Project**, dépôt `Media-Booster`, **Deploy**.
2. Ajoute `APP_SECRET` (longue suite de caractères au hasard), `CRON_SECRET` (une autre), `PLATEFORME_ADMINS` (ton e-mail) et une clé d'IA (`GEMINI_API_KEY`, gratuite sur aistudio.google.com, ou `ANTHROPIC_API_KEY`).
3. Redéploie, ouvre l'adresse de l'app et crée ton propre compte : avec ton e-mail dans `PLATEFORME_ADMINS`, la page **/plateforme** te montre tous tes clients.

### 3. Tâches planifiées (toutes les 15 minutes)
En bas de `supabase/schema.sql`, deux blocs à lancer (veille et publications, puis NOVA), après avoir remplacé l'adresse de l'app et `CRON_SECRET`. Solution de secours : `.github/workflows/media-booster-cron.yml`, avec les secrets GitHub `MB_URL` et `MB_CRON_SECRET`.

### 4. Paiement : CinetPay
1. Ouvre un compte marchand sur cinetpay.com et fais valider ton entreprise.
2. Dans le tableau de bord CinetPay, copie l'**API key** et le **Site ID** dans `CINETPAY_API_KEY` et `CINETPAY_SITE_ID`. `CINETPAY_DEVISE` : `XOF` (Afrique de l'Ouest) ou `XAF` (Afrique centrale).
3. Rien d'autre : l'app indique elle-même à CinetPay son adresse de notification (`/api/abonnement/notification`) et vérifie chaque paiement auprès de CinetPay avant d'ouvrir l'accès.

Paiement reçu autrement (Wave direct, espèces) : page **/plateforme**, bouton « +30 j » sur l'espace du client.

### 5. Facebook
1. Sur developers.facebook.com : **Créer une app**, type **Entreprise**, ajoute le produit **Facebook Login for Business**.
2. **Paramètres › Base** : copie l'identifiant et la clé secrète dans `META_APP_ID` et `META_APP_SECRET`. Renseigne l'URL de la politique de confidentialité (`https://<ton-app>/confidentialite`) et des conditions (`/cgu`).
3. **Facebook Login › Paramètres** : URI de redirection OAuth valide `https://<ton-app>/api/connexions/facebook/retour`.
4. Tant que l'app n'est pas validée, seuls toi et les testeurs ajoutés dans **Rôles de l'app** peuvent se connecter. Pour tous les clients : **Vérification de l'entreprise**, puis **App Review** des autorisations `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`, `pages_manage_engagement`, `pages_read_user_content`, `business_management` (une vidéo de démonstration est demandée : inscription, connexion Facebook, choix de la page, publication).

### 6. LinkedIn
1. Sur linkedin.com/developers : **Create app**, rattachée à la page LinkedIn de ton entreprise.
2. Onglet **Products** : ajoute **Sign In with LinkedIn using OpenID Connect** et **Share on LinkedIn** (accordés tout de suite).
3. Onglet **Auth** : copie Client ID et Client Secret dans `LINKEDIN_CLIENT_ID` et `LINKEDIN_CLIENT_SECRET` ; ajoute l'URL de redirection `https://<ton-app>/api/connexions/linkedin/retour`.
4. Pages entreprise : demande le produit **Community Management API** (examen par LinkedIn). Une fois accordé, mets `LINKEDIN_PAGES=1` : la liste des pages de chaque client apparaît à sa connexion. En attendant, les clients publient sur leur profil.

### 7. TikTok (facultatif)
App sur developers.tiktok.com avec **Login Kit** et **Content Posting API** ; redirection `https://<ton-app>/api/tiktok/callback` ; clés dans `TIKTOK_CLIENT_KEY` et `TIKTOK_CLIENT_SECRET`.

Lance les demandes Meta, LinkedIn et TikTok tôt : leur validation prend plusieurs jours à plusieurs semaines.

## L'application sur le téléphone

Media Booster est une **application installable (PWA)** : pas de Play Store ni d'App Store.

- **Android (Chrome)** : un bandeau « Installer Media Booster » apparaît. Sinon : menu ⋮ › **Installer l'application**.
- **iPhone (Safari)** : **Partager** › **Sur l'écran d'accueil**.

Ensuite : plein écran, raccourcis par appui long sur l'icône (Créer, Veille, Calendrier, Le Grin), **Partager › Media Booster** depuis Chrome ou YouTube (Android) pour transformer un lien en post, page « Pas de connexion » hors réseau, bandeau « Nouvelle version disponible » après chaque mise à jour.

## Organisation du code

- **Espaces clients** : `lib/espace.ts` (espace courant), `lib/store.ts` (`db()` filtre automatiquement chaque requête par espace ; `dbGlobal()` réservé à la connexion, l'inscription, les tâches planifiées et les paiements), `lib/comptes.ts` (inscription, espaces actifs), `middleware.ts` (session, rôle, abonnement).
- **Marque et rubriques du client** : `lib/marque.ts`, `lib/marque-serveur.ts` ; consigne de rédaction : `styleGuide()` dans `lib/config.ts`.
- **Comptes reliés** : `lib/reseaux.ts` (Facebook, LinkedIn, WordPress), `lib/tiktok.ts` ; publication : `lib/publish.ts`.
- **Abonnement** : `lib/abonnement.ts` (formules), `lib/paiement.ts` (CinetPay), page `/abonnement`, administration `/plateforme`.
- **Application installable** : `app/manifest.ts`, `public/sw.js` (changer `VERSION` force une mise à jour), `components/Pwa.tsx`.
- **Charte** : émeraude `#047857`, ambre `#F59E0B`, encre `#0F172A`, sable `#F7F6F2` (variables en tête de `app/globals.css`).

Chaque modification envoyée sur GitHub est remise en ligne automatiquement par Vercel.

## Technique

Next.js 15 (App Router), TypeScript, Supabase, PWA (manifeste et service worker), `next/og` pour les visuels, Gemini ou Claude pour la rédaction, CinetPay pour les paiements.

Les conditions d'utilisation (`/cgu`) et la politique de confidentialité (`/confidentialite`) sont des modèles à faire relire par un juriste avant la mise en vente.
