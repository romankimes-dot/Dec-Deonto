# Shorts — format et consignes de rédaction

Un fichier par étape « schéma » du parcours (`js/plan.js`, `STEPS`) : `data/shorts/<étape>.json`.

```json
{
  "step": "independance",
  "shorts": [ { ... }, { ... } ]
}
```

Vérification : `node scripts/check_shorts.mjs data/shorts/<étape>.json` (sans argument : tous les fichiers ; lancé aussi par `npm test`).

## Champs communs

| Champ | Contenu |
|---|---|
| `id` | `<étape>-<nn>` sur deux chiffres, ex. `independance-07`. Stable : ne jamais renuméroter un short publié. |
| `type` | `duel` · `chiffre` · `liste` · `cas` · `vf` |
| `prof` | `EC`, `CAC` ou `EC+CAC` |
| `tags` | Sous-thèmes de la banque (ceux de l'entête `questions:` des fiches, ex. `independance_situations_risque`) |
| `fiche` | Fichier de la fiche source, ex. `16-schema-independance-cac.md` |
| `title` | Thème du short, 40 caractères au plus |
| `src` | 1 à 4 extraits **copiés tels quels** de la fiche (12 caractères au moins), qui prouvent le contenu. Le gras, les pastilles `{EC}`, les guillemets et la casse sont ignorés à la comparaison. |
| `quiz` | Sauf `vf` : `{ "q", "choices": [2 à 4], "answer": index, "why" }` |

Seul le gras `**…**` est autorisé dans les textes. Longueurs maximales : question 120, proposition 90, explication (`why`) 240.

## Formats

**duel** — la même règle côte à côte, EC puis CAC, puis le piège ; question ensuite.
```json
{ "type": "duel", "q": "Qui fixe le prix de la mission ?",
  "ec": { "main": "**Libres**", "det": "Convenus dans la **lettre de mission**. Aucun barème." },
  "cac": { "main": "**Barème d'heures**", "det": "Pour la certification, ALPE comprise. Taux horaire libre." },
  "trap": "Le barème fixe des heures, pas un tarif en euros." }
```
`main` 48 · `det` 150 · `trap` 120 (facultatif).

**chiffre** — un chiffre en très grand, ce qu'il mesure, puis le piège.
```json
{ "type": "chiffre", "big": "6 exercices", "label": "Durée du mandat du commissaire aux comptes", "det": "...", "trap": "..." }
```
`big` 18 · `label` 90 · `det` 150 et `trap` 120 facultatifs.

**liste** — 2 à 5 éléments révélés un à un (étapes, conditions, sanctions, qui fait quoi).
```json
{ "type": "liste", "q": "Les trois niveaux d'assurance", "items": [ { "k": "Audit", "v": "Assurance raisonnable, opinion positive" } ], "trap": "..." }
```
`k` 34 · `v` 100 (facultatif).

**cas** — question d'abord : une situation, la question, puis la correction (`quiz.why`).
```json
{ "type": "cas", "situation": "Un CAC se voit proposer par l'entité qu'il certifie de remplir ses déclarations fiscales.", "quiz": { ... } }
```
`situation` 280.

**vf** — question d'abord : une affirmation à juger vrai ou faux, puis la correction. Pas de `quiz`.
```json
{ "type": "vf", "statement": "...", "verdict": false, "why": "..." }
```
`statement` 170 · `why` 240.

## Consignes

- **Rien hors des fiches.** Chaque affirmation vient de la fiche citée (droit à jour au 1er novembre 2026) ; `src` le prouve.
- **Priorité aux notions les plus posées** (sous-thèmes fréquents de la banque) et aux pièges que la fiche signale (`{!}`, « Pièges qui reviennent »).
- **Distracteurs** tirés des confusions réelles : règle de l'autre profession, ancien régime (H3C, 5 ans), chiffre voisin.
- Un short = une idée. Phrases courtes, sans références d'articles (le jury ne les exige pas), sauf si le numéro est lui-même la réponse.

## Exactitude (ce que la vérification ligne à ligne a corrigé)

- **Même sens que la fiche.** Pas de « toujours », « jamais », « seul », « uniquement », « tous » absents de la source ; conditions, chiffres, acteurs et délais exacts ; aucune connaissance générale ajoutée (descriptions, sigles développés, exemples).
- **Les mots de la fiche** : « élabore » n'est pas « adopte », « statue sur » n'est pas « approuve », « exercer » n'est pas « détenir », « ≈ 6 ans » n'est pas « 6 ans ».
- **Un exemple n'est pas une définition** ; une liste incomplète est annoncée comme un extrait (« Quatre activités interdites », pas « Les quatre interdits »).
- **Quiz** : une seule proposition juste selon la fiche, chaque distracteur nettement faux selon la fiche, jamais vrai dans certains cas (« 10 ans » est vrai pour un crime ; le tiers du capital atteint le seuil du dixième).
- **Rien de ce que la fiche marque {?} ou « à vérifier »**, ni dans la leçon, ni dans `why`.
