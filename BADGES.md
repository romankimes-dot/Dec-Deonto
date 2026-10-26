# Catalogue des badges et de la carrière — DEC Épreuve 1

> **Statut : validé le 23 octobre 2026, implémenté.** Les données des anecdotes (section 6) et des badges de questions (section 7) sont générées depuis ce fichier par `scripts/build_badges.py` : modifier ce document puis relancer le script.

## 0. Ce qui existe aujourd'hui (analyse)

### Banque de questions

| | |
|---|---|
| Volume | 320 questions (16 sessions, mai 2018 → mai 2026) |
| Structure d'une question | id `AAAA-MM-EC-nn` ou `AAAA-MM-CAC-nn`, profession, thème, 1 à 3 tags, barème, version QCM (4 propositions), version QRC (éléments attendus + réponse type), explication, référence, confiance |
| Thèmes (programme officiel) | exercice · déontologie · contrôle de qualité · responsabilité |
| Sous-thèmes | les 46 tags du vocabulaire fermé utilisés dans la banque (`data/SCHEMA.md`) |
| Distinction EC / CAC | 10 + 10 par session, toujours |
| Transversal | pas de champ dédié. Deux notions existent des deux côtés : **LAB** (tag `lcb_ft`, 24 questions EC + CAC) et **secret professionnel** (tag `secret_professionnel`, 17 questions), soit 38 questions transversales |
| Difficulté | pas de champ dédié. Proxy proposé : question « chiffrée » (liste en famille 6), réponse de confiance `low`, ou taux d'échec personnel ≥ 50 % |

Répartition (320 questions) :

| | Exercice | Déontologie | Contrôle qualité | Responsabilité |
|---|---|---|---|---|
| EC | 79 | 43 | 16 | 22 |
| CAC | 75 | 48 | 11 | 26 |

Sous-thèmes les plus fréquents : référentiel normatif (40), H2A (31), discipline (31), missions d'assurance (27), Ordre (25), indépendance et situations à risque (25), LAB (24), structure du code de déontologie CAC (24), CNCC/CRCC (23), lettre de mission (19).

### Historique des réponses disponible

Stocké sur le téléphone (`localStorage`) :

- `cards[id]` : état de répétition espacée (répétitions, échecs, intervalle, dernière révision).
- `attempts[]` : `{ id, ok, mode, t }` pour chaque réponse, **plafonné aux 400 dernières**.
- `exams[]` : chaque examen blanc (note, détail EC/CAC, détail par thème, ids).

Conséquence : plusieurs badges (« réussie 2 fois lors de sessions différentes », « 3e passage complet ») demandent un historique complet. Je propose d'ajouter un **compteur par question** (vues, réussites, échecs, jours de réussite distincts, nombre de passages) qui ne grossit pas avec le temps. Le calcul rétroactif part de `attempts`, `cards` et `exams`. L'app n'étant pas encore publiée, il n'y a pas d'historique perdu.

### Notions clés couvertes (et où)

Lettre de mission · honoraires · secret professionnel · LAB · indépendance · inscription au tableau · serment EC · inscription sur la liste H2A · serment CAC · contrôle qualité OEC · contrôle d'activité H2A · discipline EC et CAC · référentiel normatif et niveaux d'assurance · devoir de conseil · reprise de dossier · publicité · sociétés d'expertise comptable · nomination et seuils CAC · mandat, démission, fusion · barème d'heures · co-commissariat · révélation au procureur · délit d'entrave · EIP et services interdits · réseau · formation continue · déclaration d'activité CRCC · durabilité (CSRD).

### Parcours réel utilisé pour les anecdotes (sources vérifiées)

**Expert-comptable** (règlement du stage, guide d'application CNOEC 2026 ; ordonnance 45-2138 ; décret 2012-432) :

1. Entrée en stage avec le DSCG (ou DSCG incomplet, à obtenir avant la fin de la 2e année, sinon suspension).
2. Inscription au tableau **en qualité d'expert-comptable stagiaire**, sous le contrôle de l'Ordre (donc soumis à la discipline). Titre protégé.
3. Stage de **3 ans à temps complet** (au moins **28 h par semaine**), sous un maître de stage inscrit au tableau, avec un contrôleur du stage désigné par le conseil régional.
4. Obligations : fiches annuelles d'activité et de formation, **4 rapports semestriels** en 2e et 3e années, **entretien de 2e année**, journées de formation (24 journées sur 3 ans à Paris, dont 9 audit), travaux d'audit.
5. **Attestation de fin de stage**, obligatoire pour s'inscrire au DEC ; le diplôme doit être obtenu dans les **6 ans**.
6. DEC : épreuve 1, épreuve 2, mémoire (« expert-comptable mémorialiste » autorisé depuis 2022).
7. Inscription au tableau comme expert-comptable : demande au conseil régional, avis du commissaire du gouvernement, **prestation de serment**, cotisation annuelle.
8. Installation : exercice individuel, entrepreneur individuel (loi 2022-172) ou société d'expertise comptable (plus des 2/3 des droits de vote aux EC, formes commerciales à responsabilité illimitée exclues), assurance RC obligatoire, CAVEC.

**Commissaire aux comptes** (H2A ; code de commerce recodifié) :

1. Inscription sur la liste tenue par la **H2A** (portail en ligne, liste I personnes physiques / sociétés).
2. **Serment** devant le premier président de la **cour d'appel** (« Je jure d'exercer ma profession avec honneur, probité et indépendance, de respecter et faire respecter les lois »), oral en audience solennelle ou écrit selon la CRCC. **Aucun mandat ne peut être accepté avant le serment.**
3. Rattachement à la CRCC, déclaration d'activité, formation continue (120 h sur 3 ans).

---

## 1. Règles communes

| Terme | Définition retenue |
|---|---|
| Réponse réussie | QCM : bonne proposition. QRC : note « Bien » ou « Facile » en révision, « Je savais » en entraînement, au moins la moitié des points en examen blanc |
| Session | une **journée calendaire** (heure locale du téléphone). « Deux sessions différentes » = deux jours différents |
| Question vue | au moins une réponse enregistrée, quel que soit le mode |
| Passage complet | toutes les questions de la banque vues au moins N fois |
| Thème | l'un des 8 couples profession × thème du programme, plus le bloc **transversal** (LAB + secret) |
| Question difficile | question de la liste « chiffrée » (famille 6) ou réponse de confiance `low` ou question ratée au moins 2 fois |
| Rareté | **commun** (s'obtient en quelques jours), **rare** (une à deux semaines d'effort), **épique** (maîtrise réelle), **légendaire** (excellence ou exploit) |

Les illustrations sont des icônes SVG originales (même trait, même palette que les scènes de carrière). La colonne « Objet dans la scène » indique ce qui apparaît physiquement dans le bureau une fois le badge débloqué.

---

## 2. Famille 1 — Couverture « J'ai tout vu »

| Badge | Description | Condition exacte | Rareté | Illustration / objet dans la scène |
|---|---|---|---|---|
| **Premier dossier ouvert** | Le classeur est vide, mais il a une étiquette. | 1 question vue | commun | Chemise cartonnée sur le bureau |
| **Le quart du cabinet** | Vous connaissez déjà un dossier client sur quatre. | 25 % de la banque vue | commun | Pile de 2 dossiers |
| **Mi-parcours** | Comme une situation intermédiaire : cohérente et vraisemblable. | 50 % vue | rare | Pile de 4 dossiers |
| **Les trois quarts** | Il ne reste que les dossiers que personne ne veut prendre. | 75 % vue | rare | Étagère remplie aux 3/4 |
| **J'ai tout vu** | Plus aucune question ne vous surprend. Enfin, presque. | 100 % vue | épique | Étagère pleine, classeurs colorés |
| **Tout le Tableau** | Les 160 questions d'expertise comptable sont passées entre vos mains. | 100 % des questions EC vues | rare | Classeur bleu « OEC » |
| **Toute la Liste** | Les 160 questions CAC, H2A comprise. | 100 % des questions CAC vues | rare | Code de commerce rouge sur l'étagère |
| **Tracfin n'a qu'à bien se tenir** | Toutes les questions de lutte anti-blanchiment, EC et CAC. | 100 % des questions tag `lcb_ft` vues | rare | Loupe posée sur un dossier |
| **Coffre-fort** | Toutes les questions de secret professionnel. | 100 % des questions tag `secret_professionnel` vues | rare | Petit coffre sous le bureau |
| **Couverture de thème** × 8 | Un badge par couple profession × thème (« Exercice EC vu », « Responsabilité CAC vue »…). | 100 % des questions du couple vues | commun | Intercalaire coloré dans l'étagère |
| **Sous-thème vu** × 46 | Un autocollant par sous-thème (lettre de mission, barème, réseau…). | 100 % des questions du tag vues | commun | Autocollant sur le tableau de liège |
| **Collectionneur d'autocollants** | Tous les sous-thèmes, sans exception. | les 46 badges « sous-thème vu » | épique | Tableau de liège couvert |

## 3. Famille 2 — Séries de bonnes réponses d'affilée

La série compte les bonnes réponses consécutives, tous modes confondus. Une erreur la remet à zéro. Le **record personnel** est affiché en permanence dans l'en-tête de l'app (flamme + nombre).

| Badge | Description | Condition | Rareté | Objet dans la scène |
|---|---|---|---|---|
| **Première écriture passée** | Débit, crédit, équilibre. | série de 1 | commun | — |
| **Trois sur trois** | Le triplé du contrôleur de stage. | série de 3 | commun | Post-it « 3 » sur l'écran |
| **Main chaude** | Cinq d'affilée, le café n'a pas encore refroidi. | série de 5 | commun | Tasse fumante |
| **Sans réserve** | Dix réponses justes : opinion favorable sans observation. | série de 10 | rare | Tampon « certifié » |
| **Image fidèle** | Vingt d'affilée, un examen blanc complet sans faute. | série de 20 | épique | Cadre « 20/20 » au mur |
| **??? → Commissaire à la constance** | (caché) Trente d'affilée. | série de 30 | épique | Plante qui fleurit |
| **??? → Mandat de six exercices… sans une erreur** | (caché) Cinquante d'affilée. | série de 50 | légendaire | Trophée doré sur l'étagère |

La **plante verte** du bureau grandit avec le record : pousse (3), plante (10), plante haute (20), plante en fleurs (30), palmier (50).

## 4. Famille 3 — Maîtrise

**Thème maîtrisé** = sur l'ensemble des réponses du thème, taux de réussite **≥ 90 %**, **et** chaque question du thème réussie **au moins 2 fois, lors de 2 jours différents**.

| Badge | Description | Condition | Rareté | Objet dans la scène |
|---|---|---|---|---|
| **Maîtrise — Exercice EC** | L'ordonnance de 1945 n'a plus de secret. | thème EC × exercice maîtrisé | épique | Diplôme encadré « Exercice » |
| **Maîtrise — Déontologie EC** | Probité, conscience, et un peu de patience. | EC × déontologie | épique | Balance dorée |
| **Maîtrise — Contrôle qualité EC** | Vous pourriez contrôler le contrôleur. | EC × contrôle qualité | épique | Check-list encadrée |
| **Maîtrise — Responsabilité EC** | Civile, pénale, disciplinaire : vous savez qui vient sonner. | EC × responsabilité | épique | Parapluie (l'assurance RC) |
| **Maîtrise — Exercice CAC** | Seuils, mandats, barème : tout est dans la tête. | CAC × exercice | épique | Diplôme « Exercice CAC » |
| **Maîtrise — Déontologie CAC** | Tiers objectif, raisonnable et informé : c'est vous. | CAC × déontologie | épique | Bouclier « Indépendance » |
| **Maîtrise — Contrôle d'activité CAC** | Le contrôleur H2A repart avec le sourire. | CAC × contrôle qualité | épique | Lampe de bureau verte |
| **Maîtrise — Responsabilité CAC** | La commission des sanctions ne vous connaît pas. | CAC × responsabilité | épique | Cadenas fermé |
| **Maîtrise — Transversal** | LAB et secret professionnel, des deux côtés. | bloc transversal maîtrisé | épique | Coffre-fort ouvert, rangé |
| **Bloc EC maîtrisé** | Prêt pour les questions 1 à 10. | les 4 thèmes EC maîtrisés | légendaire | Grand diplôme « Expert-comptable » |
| **Bloc CAC maîtrisé** | Prêt pour les questions 11 à 20, celles qui font chuter la moyenne. | les 4 thèmes CAC maîtrisés | légendaire | Carte professionnelle CAC encadrée |
| **Maîtrise totale** | 20/20 n'est plus une hypothèse d'école. | les 9 badges de maîtrise | légendaire | Le mur entier s'illumine |

## 5. Famille 4 — Repassage

| Badge | Description | Condition exacte | Rareté | Objet dans la scène |
|---|---|---|---|---|
| **Deuxième lecture** × 9 | Une revue de dossier, comme le prévoit la NPMQ. | toutes les questions du thème vues au moins 2 fois, la 2e vue un autre jour que la 1re | commun | Stylo vert sur le dossier |
| **Revue indépendante** | Ratée, puis juste trois fois. Le revoyeur est convaincu. | au moins 1 question ratée puis réussie 3 fois après l'échec, sur 3 jours distincts | rare | Deuxième paire de lunettes |
| **Revue indépendante en série** | Dix questions ratées, dix questions rattrapées. | 10 questions ayant obtenu « Revue indépendante » | épique | Bannette « revu » pleine |
| **Dossier assaini** × 9 | Plus aucun point en suspens dans ce thème. | thème dont **aucune** question n'a pour dernière réponse un échec (toutes les questions vues) | rare | Bannette « en suspens » vide |
| **Deuxième passage complet** | Toute la banque, deux fois. | chaque question vue au moins 2 fois | rare | Calendrier de révision coché |
| **Troisième passage complet** | La banque est lue comme un code de poche. | chaque question vue au moins 3 fois | épique | Code de poche usé, marque-pages |

## 6. Famille 5 — Anecdotes de carrière

Chaque anecdote se débloque quand **toutes** les questions listées sont réussies au moins une fois (avec « au moins N parmi » quand la liste est longue). Elle s'affiche comme une **carte-souvenir datée** du jour du déblocage, avec un texte court réaliste.

### 6.1 Le stage (EC)

| # | Anecdote | Carte-souvenir | Questions rattachées | Rareté |
|---|---|---|---|---|
| A1 | **Premier jour de stage** | « Inscrit au tableau comme expert-comptable stagiaire. On me prévient : même stagiaire, la chambre de discipline me connaît. » | 2021-11-EC-05, 2024-11-EC-02 | commun |
| A2 | **Première fiche de paie** | « 47 lignes, une seule erreur : le taux de prévoyance. Et un client qui demande si je peux aussi rédiger le contrat de travail. » | 2018-05-EC-10, 2018-11-EC-03, 2019-11-EC-05 | commun |
| A3 | **Première déclaration de revenus du dirigeant** | « Lettre de mission séparée signée par le gérant à titre personnel. » | 2018-11-EC-08 | commun |
| A4 | **Premiers contrôles par épreuves** | « J'ai pointé la banque, rapproché les ventes et testé trois charges. La présentation a des diligences, elle aussi. » | 2021-05-EC-10, 2019-05-EC-03 | commun |
| A5 | **Première attestation de présentation** | « "Cohérence et vraisemblance". J'ai appris la formule par cœur. » | 2018-05-EC-03, 2019-11-EC-07, 2023-05-EC-08, 2024-05-EC-07, 2025-05-EC-04 | rare |
| A6 | **Premier compte rendu de travaux** | « Le client a un CAC : pas d'attestation, un compte rendu. » | 2019-05-EC-04, 2025-11-EC-03 | commun |
| A7 | **Première revue par l'associé** | « Supervision, revue de dossier : 14 annotations au crayon vert. » | 2022-11-EC-03, 2022-11-EC-05, 2023-11-EC-04 | commun |
| A8 | **Première lettre de mission rédigée** | « Signée par le client et par l'expert-comptable responsable. Pas par moi. » | 2018-11-EC-07, 2022-11-EC-01, 2022-05-EC-10, 2020-11-EC-08 | rare |
| A9 | **Premier KYC** | « Bénéficiaire effectif : plus de 25 %. J'ai remonté trois holdings. » | 2019-05-EC-09, 2019-05-EC-10, 2026-05-CAC-12 | rare |
| A10 | **Premier client PPE** | « Le client est maire. Vigilance renforcée, et l'associé valide l'entrée en relation. » | 2022-05-EC-01 | rare |
| A11 | **Première opération atypique** | « Un virement sans justification économique. Examen renforcé, note au dossier. » | 2026-05-EC-09, 2018-11-EC-06 | rare |
| A12 | **Première déclaration de soupçon (en formation)** | « Le déclarant écrit à Tracfin. Personne d'autre n'en saura rien, pas même le confrère qui reprend le dossier. » | 2019-11-EC-01, 2019-05-EC-05, 2022-05-EC-05, 2020-11-CAC-20 | épique |
| A13 | **Journées de formation des stagiaires** | « Neuf journées sur l'audit. Les heures de formation s'ajoutent aux travaux, elles ne les remplacent pas. » | 2018-11-EC-10, 2023-11-CAC-18, 2024-11-CAC-19 | commun |
| A14 | **Premier client qui refuse un conseil** | « Informer, mettre en garde, exiger, refuser. Le mail de mise en garde est parti à 18 h 02. » | 2022-05-EC-03, 2023-05-EC-03, 2024-05-EC-09 | rare |
| A15 | **Premier dossier repris à un confrère** | « Lettre au prédécesseur avant d'accepter. Il me répond que ses honoraires sont réglés. Ouf. » | 2020-11-EC-02, 2024-05-EC-10, 2026-05-EC-06, 2024-11-EC-07 | rare |
| A16 | **Premier client qui part** | « Il veut ses pièces. Je n'ai pas le droit de les retenir pour une indemnité de rupture. » | 2018-11-EC-05, 2025-11-EC-09 | rare |
| A17 | **Premier client qui résilie en cours d'année** | « Les travaux faits sont dus. L'indemnité, seulement si la lettre de mission la prévoit. » | 2022-11-EC-07, 2023-11-EC-07, 2022-11-EC-08 | commun |

### 6.2 Le diplôme et l'inscription (EC)

| # | Anecdote | Carte-souvenir | Questions rattachées | Rareté |
|---|---|---|---|---|
| A18 | **Le DEC en poche** | « Épreuve 1 validée. Je sais enfin pourquoi la partie CAC fait baisser la moyenne. » | se débloque avec le badge **Bloc EC maîtrisé** + **Bloc CAC maîtrisé** | légendaire |
| A19 | **Dossier d'inscription au tableau** | « Diplôme, moralité, pas d'incompatibilité. Le commissaire du gouvernement a émis son avis. » | 2024-11-EC-03, 2023-11-EC-06, 2023-11-EC-08 | rare |
| A20 | **Prestation de serment d'expert-comptable** | « Devant le conseil régional de l'Ordre. Conscience et probité. » | 2021-11-EC-08, 2026-05-EC-01 | épique |
| A21 | **Première cotisation ordinale** | « Payée. La CAVEC aussi : deux ans d'impayés sur dix, et c'est la radiation d'office. » | 2022-05-EC-06, 2026-05-EC-10 | commun |

### 6.3 L'installation (EC)

| # | Anecdote | Carte-souvenir | Questions rattachées | Rareté |
|---|---|---|---|---|
| A22 | **Statut choisi** | « Entrepreneur individuel : patrimoine personnel protégé. » | 2024-11-EC-01 | commun |
| A23 | **Création de la société d'expertise comptable** | « Plus des deux tiers des droits de vote aux experts-comptables. Pas de SNC. » | 2018-11-EC-02, 2021-05-EC-03, 2023-05-EC-01, 2024-05-EC-04, 2026-05-EC-05 | épique |
| A24 | **La plaque sur la porte** | « Nom, titre, Ordre. Pas de "meilleur cabinet de la région". » | 2018-05-EC-09, 2023-11-EC-10, 2019-11-EC-02 | rare |
| A25 | **Premier post sur les réseaux** | « Interdit : "Votre comptable ne vous satisfait pas ?". Autorisé : une information sincère. » | 2021-11-EC-01, 2024-11-EC-06, 2025-05-EC-03, 2025-11-EC-02 | rare |
| A26 | **Premier client signé** | « Le formulaire d'entrée en relation est complet. La lettre de mission aussi. » | 2022-05-EC-10, 2022-05-EC-08, 2020-11-EC-01 | commun |
| A27 | **Premiers honoraires encaissés** | « Pas de barème, une indexation prévue au contrat. Le virement est arrivé. » | 2024-11-EC-10, 2018-05-EC-05 | commun |
| A28 | **Success fee refusé** | « Pas d'honoraires au succès sur la comptabilité. Sur la levée de fonds, on en reparle. » | 2024-05-EC-03, 2025-11-EC-05 | rare |
| A29 | **Mission gracieuse pour l'association du quartier** | « Possible, avec une lettre de mission. » | 2025-05-EC-10 | commun |
| A30 | **Premier compte de campagne** | « Le candidat a perdu. Le compte, lui, est en état d'examen. » | 2020-11-EC-05, 2024-11-EC-09, 2026-05-EC-08 | rare |
| A31 | **Première consultation juridique** | « Accessoire à une mission comptable permanente. L'avocat d'en face n'a rien dit. » | 2022-11-EC-02, 2023-05-EC-09 | commun |
| A32 | **Premier mandat social** | « Administrateur d'une association. Déclaré au conseil régional. » | 2018-05-EC-04, 2019-05-EC-07 | commun |
| A33 | **Premier stagiaire encadré** | « Un expert-comptable pour quinze collaborateurs. Mon premier stagiaire arrive lundi. » | 2019-11-EC-10, 2023-05-EC-10 | rare |
| A34 | **Premier sous-traitant** | « Pour la tenue, il faut un professionnel inscrit. Le titulaire du DSCG sera salarié. » | 2024-05-EC-06 | commun |
| A35 | **Premier contrôle qualité réussi** | « Examen de l'organisation, puis revue des dossiers. Conclusion : sans observation. » | 2019-11-EC-04, 2020-11-EC-03, 2023-05-EC-02, 2022-11-EC-06, 2024-05-EC-02 | épique |
| A36 | **Contrôle qualité LAB** | « Le contrôleur a ouvert le dossier du client PPE en premier. » | 2022-05-EC-02, 2021-11-EC-09 | rare |
| A37 | **Devenu contrôleur qualité** | « Candidature acceptée. À mon tour de poser les questions. » | 2024-05-EC-01 | épique |
| A38 | **Convocation devant la chambre régionale** | « Classement sans suite. Mais je connais maintenant la composition par cœur. » | 2021-05-EC-06, 2024-05-EC-05, 2021-11-EC-06, 2025-05-EC-06, 2024-11-EC-04 | rare |
| A39 | **Secret professionnel tenu** | « Le client voulait que je parle à son banquier. Il ne peut pas me délier. » | 2021-11-EC-07, 2025-11-EC-04, 2022-05-EC-04 | rare |
| A40 | **Faits délictueux découverts** | « Ce n'est pas au procureur que l'expert-comptable écrit d'abord. » | 2026-05-EC-03 | rare |
| A41 | **Élu au conseil régional** | « Scrutin de liste depuis 2020. Six ans de présidence au maximum. » | 2022-05-EC-07, 2023-11-EC-05 | épique |
| A42 | **Conciliation au conseil régional** | « Un différend d'honoraires réglé autour d'un café, pas d'un arbitre. » | 2021-11-EC-02 | commun |
| A43 | **Un confrère malade** | « Le conseil régional organise la suppléance. On se relaie sur ses dossiers. » | 2021-11-EC-03 | rare |

### 6.4 Le commissariat aux comptes

| # | Anecdote | Carte-souvenir | Questions rattachées | Rareté |
|---|---|---|---|---|
| A44 | **Inscription sur la liste H2A** | « Dossier déposé sur le portail de la Haute autorité de l'audit. » | 2023-05-CAC-11, 2020-11-CAC-13, 2024-11-CAC-12 | rare |
| A45 | **Serment devant la cour d'appel** | « "Honneur, probité et indépendance". Avant ça, aucun mandat possible. » | 2023-11-CAC-11 | épique |
| A46 | **Création de la société de CAC** | « Pas d'association : une société inscrite sur la liste. » | 2018-05-CAC-13, 2024-05-CAC-20, 2023-05-CAC-18 | rare |
| A47 | **Premier mandat** | « Six exercices. Les seuils de 2024 sont dépassés : 10 M€ de chiffre d'affaires et 50 salariés. » | 2025-05-CAC-11, 2023-05-CAC-16, 2019-05-CAC-15, 2026-05-CAC-16 | épique |
| A48 | **Première lettre de mission CAC** | « La NEP 210 l'exige, même pour une mission légale. » | 2021-05-CAC-13 | commun |
| A49 | **Premier mandat associatif** | « Plus de 153 000 € de dons : contrôle du compte d'emploi des ressources. » | 2023-05-CAC-15, 2025-05-CAC-17, 2025-05-CAC-14, 2024-11-CAC-13 | rare |
| A50 | **Déclaration à la CRCC** | « Mandat et prestations déclarés. Honoraires compris. » | 2019-05-CAC-19, 2021-11-CAC-19, 2022-11-CAC-18, 2024-11-CAC-20 | commun |
| A51 | **Premier refus de mission pour indépendance** | « Son conjoint est directeur financier de l'entité. Lien personnel : refus. » | 2018-05-CAC-20, 2022-05-CAC-15, 2021-05-CAC-19, 2019-05-CAC-20, 2026-05-CAC-17 | épique |
| A52 | **Première dérogation au barème** | « Le président de la CRCC a dit oui. Recours possible devant la H2A sinon. » | 2021-11-CAC-11, 2022-05-CAC-20, 2022-11-CAC-15, 2024-11-CAC-11, 2025-11-CAC-13 | rare |
| A53 | **Premier co-commissariat** | « Répartition équilibrée des travaux. En cas de désaccord, le président de la CRCC concilie. » | 2021-05-CAC-18, 2022-11-CAC-13, 2022-05-CAC-12 | rare |
| A54 | **Premier bilan certifié** | « Réguliers et sincères, image fidèle. Assurance raisonnable. Signé. » | 2026-05-CAC-13, 2023-11-CAC-14, 2022-05-CAC-13 | épique |
| A55 | **Première révélation au procureur** | « Le dirigeant avait remboursé. La révélation reste due. » | 2018-05-CAC-15, 2022-05-CAC-18, 2025-05-CAC-18 | épique |
| A56 | **Délit d'entrave évité** | « Les pièces sont arrivées le lendemain de mon courrier. » | 2022-05-CAC-19, 2019-05-CAC-16 | rare |
| A57 | **Premier contrôle H2A** | « Le contrôleur a tout pu consulter. Le secret ne lui est pas opposable. » | 2018-05-CAC-11, 2019-05-CAC-18, 2023-11-CAC-15, 2023-11-CAC-16 | épique |
| A58 | **Premier mandat EIP** | « Comité d'audit, rotation, services interdits : la liste européenne est sur mon bureau. » | 2021-05-CAC-15, 2021-11-CAC-20, 2023-11-CAC-17 | légendaire |
| A59 | **Entrée dans un réseau** | « Intérêt économique commun : on est un réseau. Doute ? On saisit la H2A. » | 2021-05-CAC-16, 2026-05-CAC-18, 2024-11-CAC-14 | rare |
| A60 | **Fusion de cabinets** | « Les mandats de l'absorbée passent à l'absorbante. » | 2019-05-CAC-14, 2021-05-CAC-14, 2026-05-CAC-11 | rare |
| A61 | **Démission motivée** | « Motif légitime, pas pour éviter une révélation. » | 2022-11-CAC-12, 2022-11-CAC-14, 2023-05-CAC-19 | rare |
| A62 | **Frisson à la commission des sanctions** | « Ce n'était pas moi. Mais j'ai révisé la composition. » | 2025-05-CAC-20, 2025-11-CAC-16, 2026-05-CAC-15 | épique |
| A63 | **Première mission durabilité** | « Informations CSRD : assurance limitée. » | 2024-11-CAC-16 | rare |
| A64 | **Premier mandat ALPE** | « Trois exercices, un rapport sur les risques. » | 2024-11-CAC-11 | rare |

**Total : 64 anecdotes**, couvrant les 4 thèmes des deux professions. Le rattachement est revu automatiquement à chaque évolution de la banque : un script de contrôle signale toute anecdote dont un id n'existe plus.

## 7. Famille 6 — Badges de questions (chiffres et pièges)

Condition : réussir **toutes** les questions de la liste au moins une fois, puis **2 fois sur 2 jours différents** pour la version « or » (même badge, cadre doré).

| Badge | Description | Questions | Rareté |
|---|---|---|---|
| **Seuils en tête** | 5 M€, 10 M€, 50 salariés, et les petits groupes. | 2025-05-CAC-11, 2023-05-CAC-16, 2023-11-CAC-20, 2023-05-CAC-20 | rare |
| **Le gardien des délais** | Prescriptions, délais de formation, durées de mandat. | 2018-11-CAC-12, 2018-11-CAC-16, 2018-11-CAC-18, 2019-05-EC-02, 2023-05-EC-07, 2026-05-CAC-16 | épique |
| **153 000 €** | Le chiffre que tout le monde retient, et ceux qu'on oublie. | 2025-05-CAC-17, 2025-05-CAC-14, 2024-11-CAC-13, 2023-05-CAC-15 | rare |
| **Un pour quinze** | Le taux d'encadrement, sans hésitation. | 2019-11-EC-10, 2023-05-EC-10 | commun |
| **Les deux tiers** | Capital et droits de vote des sociétés d'expertise comptable. | 2021-05-EC-03, 2023-05-EC-01, 2024-05-EC-04 | rare |
| **Soixante membres** | La composition du Conseil national de la CNCC. | 2019-11-CAC-13, 2021-05-CAC-12, 2025-11-CAC-19 | épique |
| **120 heures** | Formation continue CAC : quantum et actions éligibles. | 2024-11-CAC-18, 2024-11-CAC-19, 2023-11-CAC-18 | rare |
| **Le juge des sanctions** | Toutes les listes de sanctions, EC et CAC. | 2025-05-EC-01, 2026-05-EC-02, 2025-11-EC-10, 2022-11-CAC-11, 2023-11-CAC-13, 2025-11-CAC-15 | épique |
| **Niveau d'assurance** | Raisonnable, modérée, aucune : jamais confondues. | 2018-05-EC-01, 2018-05-EC-02, 2019-05-EC-01, 2021-05-EC-02, 2022-11-EC-10, 2023-11-CAC-14, 2024-11-CAC-16 | épique |
| **Le cadre de référence** | Les trois natures de missions et les textes communs. | 2021-05-EC-07, 2025-05-EC-02, 2023-11-EC-02, 2020-11-EC-09, 2018-05-EC-07 | rare |
| **Ni EC ni CAC** | Les questions où les règles des deux professions divergent. | 2022-11-CAC-19, 2024-05-CAC-20, 2022-11-CAC-17, 2025-05-CAC-12, 2020-11-CAC-15 | épique |
| **Barème d'heures** | Dérogation, recours, prestations hors barème. | 2021-11-CAC-11, 2022-11-CAC-15, 2023-05-CAC-14, 2024-11-CAC-11 | rare |
| **Les cinq étapes** | Procédure disciplinaire CAC de bout en bout. | 2021-11-CAC-12, 2021-11-CAC-15, 2023-11-CAC-12, 2026-05-CAC-19 | épique |

## 8. Famille 7 — Badges cachés et insolites

Affichés « ??? » dans la collection jusqu'au déblocage, avec un indice d'une ligne.

| Badge | Indice | Condition exacte | Rareté |
|---|---|---|---|
| **Avant l'ouverture du cabinet** | « Le café n'est pas encore fait. » | une réponse enregistrée entre 5 h et 7 h | rare |
| **Clôture tardive** | « Comme un 30 avril au soir. » | une réponse entre 23 h et 2 h | rare |
| **De retour de congés** | « Le courrier s'est accumulé. » | une session après au moins 3 jours sans réponse | commun |
| **Période fiscale** | « Mai, en cabinet. » | 100 réponses dans la même journée | épique |
| **Sans-faute sur les dossiers sensibles** | « Vingt questions qui font peur. » | 20 questions difficiles d'affilée réussies | légendaire |
| **Mode avion** | « Aucune connexion, aucune excuse. » | une session entière avec le téléphone hors ligne | commun |
| **Week-end studieux** | « Le samedi et le dimanche. » | des réponses un samedi et le dimanche suivant | commun |
| **Sept jours sur sept** | « Une semaine sans pause. » | au moins 10 réponses par jour, 7 jours consécutifs | épique |
| **Rattrapage** | « La deuxième chance existe. » | un examen blanc < 10, puis le suivant ≥ 14 | rare |
| **Mention très bien** | « 16 et plus, en conditions réelles. » | un examen blanc ≥ 16/20 | épique |
| **Contre la montre** | « Il reste vingt minutes. » | examen blanc rendu en moins de 40 minutes avec ≥ 14/20 | épique |
| **Partie CAC parfaite** | « Les questions 11 à 20. » | 10/10 sur la partie CAC d'un examen blanc | légendaire |
| **La veille** | « Le 9 novembre. » | une session la veille de l'épreuve (date choisie dans Réglages ; par défaut le 9 novembre 2026) | commun |
| **Jour J** | « Le 10 novembre, 10 h 29. » | ouvrir l'app le jour de l'épreuve avant son heure de début (par défaut le 10 novembre 2026 avant 10 h 30) | rare |

---

## 9. Carrière : grades et scènes

La carrière suit le parcours réel (section 0). Un grade se débloque par une **combinaison de badges et de maîtrise**, jamais par le seul volume de réponses.

| # | Grade | Condition de déblocage | Décor | Objets ajoutés au décor |
|---|---|---|---|---|
| 1 | **Expert-comptable stagiaire, 1re année** | au départ | Open space, poste partagé, écran unique | Diplôme DSCG punaisé |
| 2 | **Stagiaire, 2e année** | badges « Le quart du cabinet » + 3 anecdotes du stage (A1 à A17) + 1 « Deuxième lecture » | Open space, poste attitré avec plante | Badge d'accès, planning de formation |
| 3 | **Stagiaire, 3e année** | « Mi-parcours » + 8 anecdotes du stage + 2 thèmes maîtrisés | Bureau partagé à deux | Cadre « Entretien de 2e année » |
| 4 | **Mémorialiste, candidat au DEC** | « Les trois quarts » + « Sans réserve » (série 10) + 4 thèmes maîtrisés dont 2 CAC | Bureau partagé, tableau blanc couvert de schémas | Attestation de fin de stage encadrée |
| 5 | **Diplômé d'expertise comptable** | « J'ai tout vu » + « Bloc EC maîtrisé » ou « Bloc CAC maîtrisé » + un examen blanc ≥ 12 | Bureau personnel, fenêtre | Diplôme DEC au mur |
| 6 | **Expert-comptable inscrit au tableau** | A19 + A20 + 6 thèmes maîtrisés | Bureau personnel, bibliothèque | Certificat d'inscription, médaille de l'Ordre |
| 7 | **Commissaire aux comptes** | A44 + A45 + « Bloc CAC maîtrisé » | Bureau personnel, porte vitrée | Carte professionnelle, Code de commerce rouge, mallette d'audit |
| 8 | **Expert-comptable installé** | « Maîtrise totale » + A23 + A24 + un examen blanc ≥ 16 | **Cabinet** avec accueil, salle de réunion, **plaque sur la porte** | Plaque gravée à votre nom, machine à café, trophées |

### Les scènes SVG

- **Un seul personnage** du début à la fin : silhouette stylisée, cheveux courts, veste bleu marine, lunettes rondes, sans genre marqué. Il prend de l'assurance au fil des grades (posture, tenue plus formelle, sourire).
- **Une seule palette** : bleu nuit `#0f172a`, bleu ordre `#1e40af`, cyan EC `#0e7490`, violet CAC `#7c3aed`, bois clair, vert plante, or pour les trophées. Même trait, mêmes ombres plates.
- **Décor évolutif** : open space (grades 1-2) → bureau partagé (3-4) → bureau personnel (5-7) → cabinet avec plaque (8).
- **Salle des trophées** : chaque badge ayant un « objet dans la scène » l'ajoute au décor du grade courant (diplômes au mur, dossiers sur l'étagère, plante qui grandit, tampon, coffre, Code de commerce, carte CAC, tasse puis machine à café au-delà de « Période fiscale »).
- Format : 9 SVG de 360 × 240 (un par grade + le cabinet de nuit pour « Clôture tardive »), objets en calques nommés, affichés ou non selon les badges.

### Écran « Ma carrière »

- Frise verticale des 8 grades : scène débloquée en couleur avec sa date, scènes suivantes en silhouette floutée, avec la condition à remplir.
- La scène du grade actuel est en grand, interactive : toucher un objet ouvre le badge correspondant.

### Animations

- **Badge** : l'icône tombe dans la scène, petit rebond, halo de la couleur de rareté, vibration courte du téléphone.
- **Grade** : fondu vers la nouvelle scène, le personnage déménage, bandeau « Nouveau grade ».
- **Anecdote** : carte-souvenir qui se retourne, datée du jour, avec la question qui l'a débloquée.

---

## 10. Écran Collection

- Onglets par famille, compteur « débloqués / total ».
- Pour chaque badge : icône (grisée si verrouillée), rareté, condition, **barre de progression vers le palier suivant** (par exemple « 63 % de la banque vue, prochain palier 75 % »).
- Badges cachés : « ??? » et l'indice.
- Anecdotes : album de cartes-souvenirs, au dos les questions concernées (lien direct vers un entraînement sur ces questions).

## 11. Implémentation prévue (après validation)

- `js/badges.js` : catalogue déclaratif (id, famille, rareté, condition sous forme de fonction pure sur un état agrégé) et moteur de calcul.
- Nouvel état agrégé dans la progression : par question `{vues, réussites, échecs, joursRéussite[], passages, dernierRésultat}` ; séries courante et record ; compteurs par jour ; badges débloqués avec date.
- **Calcul rétroactif** au premier lancement de la nouvelle version, à partir de `attempts`, `cards` et `exams`.
- `js/career.js` + `assets/scenes/*.svg` : scènes à calques.
- Vues « Collection » et « Ma carrière », animations CSS.
- `tests/badges.test.js` : un test par condition de déblocage, plus le calcul rétroactif.
- `scripts/check_badges.py` : vérifie que chaque id cité ici existe dans la banque.
- Commits atomiques : modèle de données, moteur, catalogue, rétroactif, collection, scènes, carrière, animations.

## 12. Décisions validées (23 octobre 2026)

1. Pas de robe de CAC : **carte professionnelle CAC** et **mallette d'audit**.
2. « Sessions différentes » = **jours calendaires différents** (heure locale du téléphone).
3. Réussite en QRC = auto-évaluation « Bien » ou « Facile » (révision), « Je savais » (entraînement), au moins la moitié des points (examen blanc).
4. Grade 6 (inscription au tableau EC) avant grade 7 (commissaire aux comptes).
5. Les 46 badges de sous-thème sont conservés ; la collection les affiche regroupés.
