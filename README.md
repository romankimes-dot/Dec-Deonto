# DEC · Épreuve 1 — outil de révision (déontologie EC / CAC)

Application web hors ligne (PWA) pour préparer l'épreuve n°1 du Diplôme d'expertise comptable :
« Réglementation professionnelle et déontologie de l'expert-comptable et du commissaire aux comptes ».

Session visée : **mardi 10 novembre 2026, 10 h 30 – 11 h 30**.

## L'épreuve (note du jury SIEC, version du 6 juillet 2026)

| | |
|---|---|
| Nature | écrit « sous forme de questions » : **QRC** (réponses courtes, double correction, 40 pts ramenés /20) **ou QCM** (20 questions, 4 propositions, 1 pt/question, pas de points négatifs) |
| Durée / coefficient | 1 h / 1 |
| Structure | 10 questions expertise comptable (1–10) + 10 questions commissariat aux comptes (11–20) |
| Note éliminatoire | < 6/20 |
| Documents | aucun |
| Alternance constatée | nov. 2025 QCM → mai 2026 QRC → nov. 2026 probablement QCM (préparer les deux) |
| Ce que dit le jury | la partie CAC est systématiquement moins bien réussie ; les candidats confondent les règles EC et CAC ; références d'articles et quantum des sanctions non exigés |

Programme officiel (arrêté du 13 février 2019) : exercice de la profession · éthique et déontologie · contrôle de qualité · responsabilité du professionnel, pour les deux professions.

## Utilisation sur téléphone

1. Ouvrir https://romankimes-dot.github.io/Dec-Deonto/ dans Safari (iPhone) ou Chrome (Android).
2. « Partager » → « Sur l'écran d'accueil » (iPhone) ou « Installer l'application » (Android).
3. Au premier lancement en ligne, l'app met tout en cache (questions, fiches). Elle fonctionne ensuite **sans réseau**.
4. La progression est stockée **sur le téléphone** uniquement. Réglages → Exporter pour la sauvegarder.

## Modes

- **Réviser** : répétition espacée (SM-2 simplifié). Cartes dues + nouvelles cartes (CAC en premier). Format QCM, QRC ou mixte.
- **Entraîner** : série ciblée par profession, thème, sujet ; ou « mes 20 questions les plus ratées ».
- **Examen** : 10 EC + 10 CAC, 60 min chrono, QCM ou QRC avec auto-correction, note /20, détail par thème.
- **Fiches** : synthèses par thème (chiffres, instances, listes).
- **Stats** : maîtrise par thème × profession, points faibles, historique des examens.
- **Carrière** : 8 grades, du stagiaire de 1re année à l'expert-comptable installé. Le bureau évolue et se remplit des objets gagnés.
- **Collection** : 209 badges en 7 familles (couverture, séries, maîtrise, repassage, anecdotes de carrière, chiffres et pièges, cachés). Catalogue complet dans `BADGES.md`.
- **Souvenirs** : 64 cartes-souvenirs datées, chacune liée aux questions qui la débloquent.

Les badges sont recalculés à partir de l'historique existant à la première ouverture. Pour modifier le catalogue : éditer `BADGES.md`, puis `npm run build`.

## Contenu et véracité

- Les **questions** sont les sujets officiels, mot pour mot : 16 sessions (mai 2018 → mai 2026), 14 téléchargées depuis la docuthèque du SIEC, 2 (nov. 2024, mai 2026) depuis le sujet diffusé par compta-online.
- Les **réponses, explications et références** ont été rédigées à partir des textes (ordonnance 45-2138, décret 2012-432, code de commerce recodifié 2024, codes de déontologie, NEP, NP), **pas recopiées d'un corrigé**. Elles ne sont pas des corrigés officiels.
- Chaque question porte un niveau de **confiance** (`high` / `medium` / `low`). Les `low` sont signalées « à vérifier » dans l'app.
- Pour fiabiliser : déposer vos supports dans `sources/supports/` (annales ANECS avec corrigés de membres du jury, manuel, référentiel normatif, fiches de cours) et demander une passe de contrôle question par question.

## Développement

```
npm test                      # tests du moteur SRS / examen
python3 -I scripts/build_bank.py   # fusionne data/bank/*.json → data/questions.json, valide, index des fiches
python3 -m http.server 8080   # puis http://localhost:8080
```

- `data/bank/<session>.json` : une session = 20 questions (schéma dans `data/SCHEMA.md`).
- `data/fiches/*.md` : fiches de synthèse.
- `scripts/fetch_annales.sh` : re-télécharge les sujets officiels et les rapports de jury.
- Déploiement : GitHub Pages publie directement la branche `main` (https://romankimes-dot.github.io/Dec-Deonto/). Le workflow `.github/workflows/verifications.yml` ne fait que les vérifications (tests, banque, badges).
