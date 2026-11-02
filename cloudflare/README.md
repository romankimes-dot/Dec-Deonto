# Synchronisation en ligne : mise en place (10 min, sans terminal)

La progression est copiée sur votre propre Worker Cloudflare (gratuit) et fusionnée entre vos appareils.
Rien n'est perdu : pour chaque question, la révision la plus récente l'emporte ; réponses, examens et badges des deux
appareils sont réunis. Le serveur garde aussi une copie par jour pendant 30 jours.

**Avant tout** : dans l'app, Réglages → Exporter, et gardez le fichier.

## 1. Espace KV
dash.cloudflare.com → **Storage & Databases → KV** → *Create* → nom : `dec1` → *Add*.
N'ajoutez aucune entrée : l'app les écrit elle-même.

## 2. Worker
**Compute (Workers) → Workers & Pages** → *Create* → *Start with Hello World* → nom : `dec1-sync` → *Deploy*.
Puis *Edit code* : remplacez tout le contenu par celui de [`worker.js`](worker.js) → *Deploy*.

## 3. Liaison et code secret
Dans le Worker → **Settings** :
- **Bindings** → *Add* → *KV namespace* → nom de variable : `DEC1` (majuscules) → espace : `dec1` → *Deploy*.
- **Variables and Secrets** → *Add* → type *Secret* → nom : `TOKEN` → valeur : un code long à vous
  (par ex. 30 caractères au hasard, notez-le) → *Deploy*.

Vérification : ouvrez `https://dec1-sync.<votre-sous-domaine>.workers.dev/` dans le navigateur. La page doit afficher `{"ok":true,"app":"dec1-sync"}`.

## 4. Dans l'app, sur chaque appareil
Réglages → **Synchronisation en ligne** → adresse du Worker (`https://dec1-sync.….workers.dev`) + code secret →
*Connecter et synchroniser*. Commencez par le téléphone (celui qui a la progression), puis les autres appareils.

## Fonctionnement
- Envoi au plus une fois par minute pendant le travail, et quand l'app passe en arrière-plan ; lecture à l'ouverture.
- Hors ligne : l'app fonctionne comme avant et se synchronise au retour du réseau.
- L'adresse et le code restent sur l'appareil (jamais dans l'export).
- Quota gratuit : 1 000 écritures par jour, largement suffisant.
- Revenir à une copie du serveur : KV → `dec1` → clé `backup:AAAA-MM-JJ` → copiez la valeur, puis collez-la dans
  Réglages → *Importer un texte collé*.
