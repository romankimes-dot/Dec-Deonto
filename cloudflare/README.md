# Synchronisation en ligne : mise en place (10 min, sans terminal)

La progression est copiée sur votre propre Worker Cloudflare (gratuit) et fusionnée entre vos appareils.
Rien n'est perdu : pour chaque question, la révision la plus récente l'emporte ; réponses, examens et badges des deux
appareils sont réunis. Le serveur garde aussi une copie par jour pendant 30 jours.

**Avant tout** : dans l'app, Réglages → Exporter, et gardez le fichier.

## 1. Espace KV
dash.cloudflare.com → **Storage & Databases → KV** → *Create* → nom : `dec1` → *Add*.
N'ajoutez aucune entrée : l'app les écrit elle-même.

## 2. Worker (déployé depuis GitHub)
Le Worker `dec-deonto` est relié au dépôt : Cloudflare le redéploie à chaque push sur `main`, d'après
[`wrangler.jsonc`](../wrangler.jsonc) (code : `cloudflare/worker.js`, espace KV relié sous le nom `DEC1`).

## 3. Code secret
Worker `dec-deonto` → **Paramètres → Variables et secrets** → *Ajouter* → type *Secret* → nom : `TOKEN` → valeur : un
code long à vous (par ex. 30 caractères au hasard, notez-le). Il est conservé d'un déploiement à l'autre.

Vérification : ouvrez `https://dec-deonto.<votre-sous-domaine>.workers.dev/` : la page doit afficher `{"ok":true,"app":"dec1-sync"}`.

## 4. Dans l'app, sur chaque appareil
Réglages → **Synchronisation en ligne** → adresse du Worker (`https://dec-deonto.….workers.dev`) + code secret →
*Connecter et synchroniser*. Commencez par le téléphone (celui qui a la progression), puis les autres appareils.

## Fonctionnement
- Envoi au plus une fois par minute pendant le travail, et quand l'app passe en arrière-plan ; lecture à l'ouverture.
- Hors ligne : l'app fonctionne comme avant et se synchronise au retour du réseau.
- L'adresse et le code restent sur l'appareil (jamais dans l'export).
- Quota gratuit : 1 000 écritures par jour, largement suffisant.
- Revenir à une copie du serveur : KV → `dec1` → clé `backup:progress:AAAA-MM-JJ` → copiez la valeur, puis collez-la dans
  Réglages → *Importer un texte collé*.

## Ernest
Le même Worker sert aussi Ernest (dépôt `romankimes-dot/Ernest`) :
- `/ernest` : l'état d'Ernest, synchronisé entre appareils (copie du jour : `backup:ernest:AAAA-MM-JJ`).
- `/pont/deonto` : le plan du jour de cette app, déposé à chaque synchro s'il a changé. Ernest le récupère tout seul
  (les choses du jour, l'objectif Épreuve 1 et ses jalons, les jours travaillés dans la serre), une fois par version ;
  une chose supprimée dans Ernest n'est jamais remise.
Dans Ernest : Réglages › Synchronisation, même adresse et même code (pré-remplis si Deonto est connecté dans le même navigateur).
