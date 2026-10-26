# Podcasts NotebookLM : un résumé audio par étape du parcours

15 épisodes courts (5 à 8 min), un par étape du parcours de l'app (`js/plan.js`), pour réviser l'épreuve 1 du DEC (session du 10 novembre 2026) en marchant, en voiture ou dans les transports.

Chaque dossier `NN-<id>/` contient deux fichiers :

- **`source.md`** : le dossier à téléverser dans NotebookLM. Il recopie les fiches de l'app sans rien ajouter : contexte de l'épreuve et citations du jury, schéma de l'étape, extraits des fiches de référence, pièges EC / CAC, puis 6 à 8 questions d'annales avec leur énoncé officiel, la bonne réponse et l'explication. Les marques `{?}` (« à vérifier ») sont conservées.
- **`consigne.txt`** : le texte à coller dans le champ de personnalisation (entre 446 et 491 caractères).

## Mode d'emploi, épisode par épisode

1. Ouvrir https://notebooklm.google.com avec votre compte Google. L'aide de Google appelle désormais le produit « Gemini Notebook » : c'est le même outil.
2. **Créer un notebook par épisode** (« Créer » ou « Nouveau notebook ») et lui donner le nom de l'épisode, par exemple `05 – Le mandat du CAC`. Un notebook par épisode évite que l'audio mélange les étapes.
3. **Ajouter la source** : téléverser `NN-<id>/source.md` et **uniquement ce fichier**. Si le format `.md` est refusé, ouvrir le fichier, tout copier et choisir la source « Texte copié ».
4. Dans le panneau **Studio**, cliquer sur le crayon ou la roue dentée de **Résumé audio** (Audio Overview) pour afficher les options, sans cliquer sur la tuile elle-même, qui lancerait la génération avec les réglages par défaut.
5. Choisir les réglages :
   - **Format** : « Discussion approfondie » (*Deep Dive*), le format à deux voix. Les autres formats sont « Bref » (une seule voix), « Critique » et « Débat ».
   - **Langue** : **Français**.
   - **Longueur** : **« Plus court »** (*Shorter*).
6. **Coller la consigne** : ouvrir `NN-<id>/consigne.txt`, tout copier, coller dans le champ « Que doivent aborder les présentateurs ? » (ou « Personnaliser »).
7. Cliquer sur **Générer**. La génération prend quelques minutes et se poursuit en arrière-plan.
8. **Écouter les 30 premières secondes** : l'audio doit être en français, à deux voix, et poser une question avec « mettez sur pause ». Sinon, supprimer l'audio et le générer de nouveau.
9. **Télécharger** : menu « ⋮ » du résumé audio, puis « Télécharger ».
10. **Renommer** le fichier `NN-<id>.m4a`, exactement comme dans la dernière colonne du tableau ci-dessous (par exemple `05-mandat.m4a`). Si le fichier téléchargé n'est pas en `.m4a`, garder son extension d'origine et ne changer que le nom.
11. **Me l'envoyer** : déposer le fichier dans la conversation.

Comptez environ 10 minutes par épisode, génération comprise. Le compte gratuit limite le nombre de résumés audio par jour : selon des guides tiers de 2026, c'est environ 3 par jour en gratuit et 20 avec l'abonnement. Pour les 15 épisodes en gratuit, prévoir 5 jours, en commençant par les premières étapes.

## Les 15 épisodes

| N° | Étape | Profession | Dossier | Questions | Consigne (car.) | Fichier à renvoyer |
|---|---|---|---|---|---|---|
| 01 | Le cadre normatif et les niveaux d’assurance | EC | `01-cadre/` | 8 | 491 | `01-cadre.m4a` |
| 02 | Les institutions : Ordre, H2A, CNCC | EC + CAC | `02-institutions/` | 8 | 446 | `02-institutions.m4a` |
| 03 | Activités permises, sociétés, publicité | EC | `03-activites/` | 8 | 452 | `03-activites.m4a` |
| 04 | Lettre de mission, honoraires, reprise de dossier | EC + CAC | `04-lettre/` | 8 | 451 | `04-lettre.m4a` |
| 05 | Le mandat du commissaire aux comptes | CAC | `05-mandat/` | 8 | 451 | `05-mandat.m4a` |
| 06 | L’indépendance du CAC | CAC | `06-independance/` | 8 | 476 | `06-independance.m4a` |
| 07 | Secret professionnel et signalements | EC + CAC | `07-secret/` | 8 | 455 | `07-secret.m4a` |
| 08 | Discipline et sanctions | EC + CAC | `08-discipline/` | 8 | 446 | `08-discipline.m4a` |
| 09 | Contrôle de qualité et contrôle d’activité | EC + CAC | `09-controle/` | 8 | 455 | `09-controle.m4a` |
| 10 | Les quatre responsabilités | EC + CAC | `10-responsabilites/` | 8 | 463 | `10-responsabilites.m4a` |
| 11 | Les chiffres à connaître par cœur | EC + CAC | `11-chiffres/` | 8 | 482 | `11-chiffres.m4a` |
| 12 | Premier examen blanc en QCM : pièges qui reviennent dans les 12 schémas, questions de sessions QCM avec les 4 propositions du sujet | EC + CAC | `12-blanc-qcm/` | 8 | 453 | `12-blanc-qcm.m4a` |
| 13 | Examen blanc en QRC : tous les comparatifs EC / CAC des schémas, questions de sessions QRC | EC + CAC | `13-blanc-qrc/` | 8 | 452 | `13-blanc-qrc.m4a` |
| 14 | Points faibles : les « Pièges EC vs CAC » des 8 fiches de référence, questions surtout CAC et notions posées plusieurs fois | EC + CAC | `14-faibles/` | 8 | 451 | `14-faibles.m4a` |
| 15 | Veille : les arbres de décision de tout le programme et la liste des points « à vérifier » | EC + CAC | `15-veille/` | 6 | 465 | `15-veille.m4a` |

Les étapes 12 à 15 n'ont pas de schéma dans l'app : ce sont des actions (examens blancs, points faibles, veille). Leurs dossiers rassemblent donc des passages de tous les schémas, comme indiqué dans le tableau.

## À savoir

- **Limite de la consigne** : 500 caractères, la limite du champ de personnalisation du résumé audio selon plusieurs guides. L'aide officielle de Google n'indique aucune limite, et un relèvement à 10 000 caractères a été annoncé pour les instructions du chat sans être confirmé pour le résumé audio. Toutes les consignes tiennent donc en moins de 500 caractères. Si le champ coupe le texte, vérifier que la dernière phrase (« N'affirme rien hors des sources… ») est bien collée.
- **Aucune question ne se répète** d'un épisode à l'autre (118 questions au total). Les questions de **mai 2026** sont exclues, car l'app réserve cette session pour l'« examen inédit » qui mesure la note sur des questions jamais vues.
- **Ce ne sont pas des corrigés officiels** : les réponses viennent de la banque de l'app (voir le README principal). Les questions de confiance « moyenne » ou « faible » sont signalées dans `source.md`.
- NotebookLM peut encore paraphraser de travers ou citer un chiffre en trop. En cas de doute à l'écoute, la fiche de l'app fait foi.
- **Régénérer les dossiers** : ils ont été produits par un script à partir de `data/fiches/` et `data/questions.json`. Si les fiches changent, demandez une nouvelle génération plutôt que de corriger `source.md` à la main.
