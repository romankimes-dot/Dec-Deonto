# Podcasts NotebookLM : 10 résumés audio pour le parcours

10 épisodes audio couvrent les 15 étapes du parcours de l'app (`js/plan.js`) pour réviser l'épreuve 1 du DEC (session du 10 novembre 2026) en marchant, en voiture ou dans les transports. Les étapes voisines sont regroupées : un épisode seul dure 5 à 8 min, un épisode qui regroupe deux étapes dure 8 à 12 min.

Chaque dossier `NN-<id>/` contient deux fichiers :

- **`source.md`** : le dossier à téléverser dans NotebookLM. Le texte des fiches et des questions de l'app y est recopié mot pour mot. Seule la mise en forme change : les blocs des schémas (comparatifs, frises, étapes, arbres) deviennent des tableaux et des listes, les pastilles deviennent [EC], [CAC] et [PIÈGE], et les marques `{?}` reçoivent la mention « (à vérifier) ». La mention « (à vérifier) » a aussi été ajoutée à l'opposabilité du secret à la CNIL (épisode 05), à la demande de la relecture. Le dossier ajoute un en-tête commun sur l'épreuve (format, citations des rapports du jury) et des titres de section.
- **`consigne.txt`** : le texte à coller dans le champ de personnalisation (de 453 à 499 caractères).

Chaque dossier contient, dans l'ordre : le contexte de l'épreuve, le ou les schémas de l’étape (dont, pour l’épisode 06, le schéma « La procédure de sanction de la H2A »), des extraits des fiches de référence (pièges EC / CAC et points « à vérifier » compris), puis 8 à 10 questions d'annales. Pour chaque question : l'énoncé officiel, la bonne réponse, la réponse courte attendue et l'explication.

## Mode d'emploi, épisode par épisode

1. Ouvrir https://notebooklm.google.com avec votre compte Google. L'aide de Google semble désormais appeler le produit « Gemini Notebook » (à vérifier) : c'est le même outil.
2. **Créer un notebook par épisode** (« Créer » ou « Nouveau notebook ») et lui donner le nom de l'épisode, par exemple `03 – Le mandat du CAC`. Un notebook par épisode évite que l'audio mélange les thèmes.
3. **Ajouter la source** : téléverser `NN-<id>/source.md` et **uniquement ce fichier**. Si le format `.md` est refusé, ouvrir le fichier, tout copier et choisir la source « Texte copié ».
4. Dans le panneau **Studio**, ouvrir les options de **Résumé audio** (*Audio Overview*) avec l'icône crayon ou roue dentée. Ne pas cliquer sur la tuile elle-même : elle lancerait la génération avec les réglages par défaut.
5. Choisir les réglages :
   - **Format** : « Discussion approfondie » (*Deep Dive*), le format à deux voix. Les autres formats sont « Bref » (une seule voix), « Critique » et « Débat ».
   - **Langue** : **Français**.
   - **Longueur** : celle indiquée dans le tableau, soit **« Plus court »** (*Shorter*) pour un épisode seul, soit **« Par défaut »** (*Default*) pour un épisode qui regroupe deux étapes.
6. **Coller la consigne** : ouvrir `NN-<id>/consigne.txt`, tout copier, puis coller dans le champ de personnalisation (l'intitulé varie selon la version : « Personnaliser », « Que doivent aborder les présentateurs ? »).
7. Cliquer sur **Générer**. La génération prend quelques minutes et se poursuit en arrière-plan.
8. **Écouter les 30 premières secondes** : l'audio doit être en français, à deux voix, et poser une question suivie de « mettez sur pause ». Sinon, supprimer l'audio et le générer de nouveau.
9. **Télécharger** : menu « ⋮ » du résumé audio, puis « Télécharger ».
10. **Renommer** le fichier exactement comme dans la dernière colonne du tableau, au format `NN-<id>.m4a` (par exemple `03-mandat.m4a`). Si le fichier téléchargé n'est pas en `.m4a`, garder son extension d'origine et ne changer que le nom.
11. **Me l'envoyer** : déposer le fichier dans la conversation.

Comptez environ 10 minutes par épisode, génération comprise. Le compte gratuit limite le nombre de résumés audio par jour. Des guides tiers de 2026 parlent d'environ 3 par jour en gratuit et 20 avec l'abonnement (à vérifier) : en gratuit, prévoir 4 jours pour les 10 épisodes, en commençant par le début du parcours.

## Les 10 épisodes

| N° | Épisode | Étapes du parcours | Profession | Dossier | Longueur (réglage, durée) | Questions | Consigne (car.) | Fichier à renvoyer |
|---|---|---|---|---|---|---|---|---|
| 01 | Le cadre normatif, les niveaux d’assurance et les institutions | 1 + 2 | EC + CAC | `01-cadre-institutions/` | Par défaut, 8 à 12 min | 10 | 471 | `01-cadre-institutions.m4a` |
| 02 | Activités permises, sociétés, publicité, lettre de mission, honoraires, reprise de dossier | 3 + 4 | EC + CAC | `02-activites-lettre/` | Par défaut, 8 à 12 min | 10 | 481 | `02-activites-lettre.m4a` |
| 03 | Le mandat du commissaire aux comptes | 5 | CAC | `03-mandat/` | Plus court, 5 à 8 min | 8 | 453 | `03-mandat.m4a` |
| 04 | L’indépendance du CAC | 6 | CAC | `04-independance/` | Plus court, 5 à 8 min | 8 | 459 | `04-independance.m4a` |
| 05 | Secret professionnel et signalements | 7 | EC + CAC | `05-secret/` | Plus court, 5 à 8 min | 8 | 462 | `05-secret.m4a` |
| 06 | Discipline, sanctions et les quatre responsabilités | 8 + 10 | EC + CAC | `06-discipline-responsabilites/` | Par défaut, 8 à 12 min | 10 | 470 | `06-discipline-responsabilites.m4a` |
| 07 | Contrôle de qualité et contrôle d’activité | 9 | EC + CAC | `07-controle/` | Plus court, 5 à 8 min | 8 | 473 | `07-controle.m4a` |
| 08 | Les chiffres à connaître par cœur | 11 | EC + CAC | `08-chiffres/` | Plus court, 5 à 8 min | 8 | 465 | `08-chiffres.m4a` |
| 09 | Examens blancs : QCM et réponses courtes (QRC) | 12 + 13 | EC + CAC | `09-examens-blancs/` | Par défaut, 8 à 12 min | 10 | 499 | `09-examens-blancs.m4a` |
| 10 | Points faibles et révision de la veille de l’épreuve (J-1) | 14 + 15 | EC + CAC | `10-faibles-veille/` | Par défaut, 8 à 12 min | 10 | 497 | `10-faibles-veille.m4a` |

Dans l'app, les étapes 12 à 15 sont des actions (examens blancs, points faibles, veille) et n'ont pas de schéma. Les épisodes 09 et 10 rassemblent donc des passages de toutes les fiches :

- **Épisode 09** : tous les pièges `[PIÈGE]` des 13 schémas, puis tous leurs comparatifs EC / CAC. Questions : 5 tirées de sessions QCM (propositions du sujet), puis 5 tirées de sessions QRC.
- **Épisode 10** : les sections « Pièges EC vs CAC » des 8 fiches de référence, les arbres de décision des schémas et la liste des points « à vérifier ». Les questions portent surtout sur le CAC.

## À savoir

- **Limite de la consigne** : plusieurs guides donnent 500 caractères pour le champ de personnalisation du résumé audio. L'aide officielle de Google n'indique aucune limite, et un relèvement à 10 000 caractères a été annoncé pour les instructions du chat, sans confirmation pour le résumé audio. Toutes les consignes font donc moins de 500 caractères. Si le champ coupe le texte, vérifier que la dernière phrase (« N'affirme rien hors des sources… ») est bien collée.
- **Aucune question ne se répète d'un épisode à l'autre**, ni sous le même identifiant ni sous un énoncé quasi identique posé à une autre session (90 questions au total). Les questions de **mai 2026** sont exclues : l'app réserve cette session à l'« examen inédit », qui mesure la note sur des questions jamais vues.
- **Ce ne sont pas des corrigés officiels** : les réponses viennent de la banque de l'app (voir le README principal). Les questions de confiance « moyenne » ou « faible » sont signalées dans `source.md`.
- NotebookLM peut paraphraser de travers ou citer un chiffre en trop. En cas de doute à l'écoute, la fiche de l'app fait foi.
- **Régénérer les dossiers** : ils ont été produits par un script à partir de `data/fiches/` et `data/questions.json`. Si les fiches changent, demandez une nouvelle génération plutôt que de corriger `source.md` à la main.
