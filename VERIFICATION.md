# Vérification des fiches (3 novembre 2026)

Cinq relectures indépendantes ont contrôlé les 21 fiches (`data/fiches/`) et le contenu de la ville des institutions (`js/ville.js`, `js/ville3d.js`), au regard du droit en vigueur en novembre 2026 :

- l'exercice de l'expert-comptable ;
- le contrôle de qualité et la responsabilité de l'EC ;
- l'exercice du commissaire aux comptes ;
- la supervision par la H2A et la responsabilité du CAC ;
- la ville des institutions.

Environ 570 affirmations ont été contrôlées.

## Limites
- Légifrance, h2a-france.org, cncc.fr et experts-comptables.fr n'étaient pas joignables depuis la session, et l'outil Pappers n'avait plus de crédits.
- Le **code de commerce** a été lu en texte intégral grâce à un miroir de Légifrance mis à jour le 3 novembre 2026 (github.com/LeMyst/codes).
- Les autres textes ont été lus à travers des **extraits** de recherche : ordonnance 45-2138, décret 2012-432, code monétaire et financier, code de justice administrative, loi 78-17.
- Une correction n'est faite que si elle s'appuie sur un texte ou sur deux sources concordantes. Les autres points restent signalés plus bas, avec le marqueur {?} dans les fiches.

## Corrigé
| Fiche(s) | Ce qui était faux ou périmé | Correction et source |
|---|---|---|
| 03, 10, 20, glossaire, palais | Norme de **maîtrise** de la qualité (2011), 6 éléments | Norme de **management** de la qualité, en vigueur le 1er janvier 2025 (arrêté du 30 mai 2024), calquée sur ISQM 1, 8 composantes. L'ancienne norme est gardée et signalée comme telle, pour les annales 2018 à 2024. |
| 07, 20 | Les contrôleurs de la H2A « convoquent et entendent » | Leurs pouvoirs sont fixés par C. com. L.820-17 : documents, informations de tiers, contrôles sur place, experts. Convoquer et entendre relève de l'enquête du rapporteur général (L.821-74). Voir l'annale 2023-11 Q16. |
| 07 | Recommandations dans le rapport du contrôleur ; « injonction ou mise en demeure » | Pré-rapport, puis un mois pour les observations (R.820-47). Les recommandations sont formulées par la formation d'examen des contrôles (L.820-2 III 3°). Aucune injonction n'est prévue après un contrôle. |
| 07 | La CNCC « a transposé ISQM 1 et 2 » | C'est la H2A qui adopte les normes (L.820-1 I 2°) ; la CNCC ne donne qu'un avis. |
| 08 | Auditeurs de durabilité classés sous L.821-70 | Ils relèvent de leur propre régime (L.822-30 à L.822-32). |
| 08 | Non-révélation : « omettre **sciemment** » | Le mot « sciemment » n'est pas dans L.821-9 : c'est un délit intentionnel au sens de C. pén. 121-3. |
| 08, 22 | Composition administrative proposée « après la notification des griefs » | Elle se propose une fois les griefs **arrêtés** (L.821-78). |
| 08 | Interdiction « d'exercer la fonction de CAC » | Interdiction d'exercer tout ou partie des missions, ou d'en accepter de nouvelles (L.821-71). |
| 16 | Interdiction après le mandat limitée aux sociétés contrôlées | Elle vise aussi les sociétés qui **contrôlent** l'entité (L.821-32, alinéa 2). |
| 01, 12, ville | Le commissaire du gouvernement conteste aussi le **refus** d'inscription au tableau | Contre un refus, c'est l'**intéressé** qui saisit le comité national du tableau ; contre une inscription, c'est le commissaire (ordonnance, art. 42, comme dans la banque, 2023-11 Q6). |
| 01, 12, ville | Membres du Conseil national tous élus au suffrage direct | Les présidents des CROEC sont membres de droit ; les autres membres sont élus au suffrage direct depuis 2020 (ord. art. 33). |
| 01, ville | IAESB présenté comme actif | L'IAESB a cessé ses activités en 2019 ; les IES sont tenues par l'IFAC. |
| 01 | Mandat implicite = mandat tacite (C. civ. 1985) | Présomption simple de mandat posée par la loi Pacte (ord. art. 2). |
| 01 | Nationalité, reconduction tacite, missions juridiques | Art. 27 (réciprocité, État tiers) ; C. consom. L.215-3 (non-professionnels) ; ord. art. 22. |
| 01, 11 | « L'EC ne délivre pas d'attestation » lorsqu'il y a un CAC | « N'a pas à délivrer, **sauf considérations particulières** » (NP 2300 § A10). |
| 02, 06 | C. mon. fin. R.561-23 **IV** | R.561-23 **I**, alinéa 2. |
| 04 | CGI 1740 A et 1753 | CGI **1740 A bis** (loi 2018-898) et 1750 pour l'interdiction. |
| 04, 13 | Pas de conciliation préalable | Depuis le 12 juin 2025, conciliation obligatoire avant une plainte entre professionnels (D. 2025-506, D. 2012-432 art. 161). |
| 04, 13 | AGC jugées par la chambre régionale | Elles relèvent d'une commission nationale (ord. art. 49 bis). |
| 05 | Décret 2024-152 « du 24 février » | Du **28 février 2024**. |
| 05 | Passage à l'assurance raisonnable « envisagé » | Abandonné par la directive Omnibus I (2026/470). |
| 05 | Déclaration des heures de formation à la CRCC | Sur le portail de la **CNCC** (délégataire), au plus tard le 31 mars. |
| ville | Le code de déontologie du CAC « adopté par la H2A » | C'est un **décret** (annexe 8-1) ; la H2A adopte les normes de déontologie. |
| ville | Relèvement placé à la cour d'appel ; commission des sanctions « juge unique » ; « 22 membres » fixes à la CRCC ; déclaration des activités accessoires au CROEC | Pancarte retirée ; « instance unique, sans appel » ; 22 **au plus** ; déclaration des mandats sociaux. Cinq questions du jeu « Qui fait quoi ? » sont reformulées pour n'avoir qu'une réponse. |

Douze shorts reposaient sur ces passages : ils sont mis à jour, et `node scripts/check_shorts.mjs` les valide. Les PDF des fiches et des plans sont régénérés.

## Restent à trancher (sources contradictoires ou texte non lu)
- **Secret de l'EC, annale 2025-11 Q4.**
  - La clé retenue par la banque donne le secret **opposable à la CNIL**. Or la loi 78-17 (art. 19 III) ne réserve, face à la CNIL, que les secrets de l'avocat, des journalistes et le secret médical.
  - Un corrigé de la Revue française de comptabilité retient au contraire l'**audition pénale** (CPP art. 109 ; ord. art. 21 al. 4).
  - Mise à jour du 8 novembre 2026 : la banque retient désormais l'**audition pénale** (clé a), en confiance *low* tant que l'art. 19 III et l'art. 21 de l'ordonnance n'ont pas été relus ; voir la section suivante.
- **Recours contre une décision d'inscription de la H2A**, et contre la dérogation au barème. La banque retient le tribunal administratif, la H2A ne figurant pas, selon elle, dans CJA R.311-1. Deux relectures, sur sources secondaires, penchent pour le Conseil d'État. CJA non lu : point marqué {?} dans la fiche 12.
- **Chambre nationale de discipline.** Un extrait de l'art. 50 issu de la loi 2022-172 donne deux fonctionnaires, ce que retient la fiche. Des décisions anciennes citent un conseiller référendaire et un fonctionnaire.
- **Nouvelle NPMQ.** Les intitulés français des 8 composantes, le régime de la revue indépendante et la confirmation annuelle d'indépendance sont à confirmer sur le texte.
- **Prescription disciplinaire de l'EC** : aucun texte trouvé.
- **Comité d'audit** : un membre indépendant toujours exigé ? Le champ couvre aussi les sociétés de financement.
- **Services fiscaux et d'évaluation « toujours » interdits aux CAC d'EIP** : la France n'a peut-être pas levé l'option du règlement 537/2014, art. 5 § 3.
- **Transposition d'Omnibus I** en droit français : non confirmée au 3 novembre 2026.
- **Points de détail non vérifiés** : RI art. 406 dans le règlement intérieur de 2024 ; L.561-28 ou L.561-30 pour l'information de Tracfin par l'Ordre ; ratio d'un EC pour quinze salariés en AGC ; numéros d'articles du code de déontologie CAC après le décret 2026-176.

Pour lire ces textes en entier, autorisez legifrance.gouv.fr, h2a-france.org, cncc.fr et experts-comptables.fr dans les réglages réseau de l'environnement.

## Revue du 8 novembre 2026
Revue globale (`revue/REVUE-2026-11.md`, 83 constats ; détail dans `revue/constats-bruts.json`), appliquée le 9 novembre 2026 par lots, puis intégrée. Mêmes limites que ci-dessus : Légifrance et Pappers inaccessibles, seul le code de commerce relu dans le miroir LEGI.

**Corrigé**
- **Clés fausses en droit actuel** : 2018-11-CAC-15 et 2019-11-CAC-12 (éligibilité au conseil régional de la CRCC, D.821-31 II relu : exercer la profession au 30 juin de l'année d'expiration des mandats) ; 2025-11-EC-04 (secret de l'EC : audition pénale, et non la CNIL). Huit questions portent `answer_changed`.
- **Banque** (349 questions, dont les questions de transfert) : journaux de relecture déplacés dans `review_note` (jamais affiché), `update_note` limité à l'évolution du droit, explications et corrigés raccourcis (≤ 350 caractères), NPMQ de **management** (arrêté du 30 mai 2024) pour les questions datées, sigles harmonisés (LCB-FT, H2A, Tracfin, garde des Sceaux), longueurs des leurres rééquilibrées dans les QCM rédigés. Confiance : 249 *high*, 95 *medium*, 5 *low*.
- **Fiches, shorts, glossaire, ville** : fiches et shorts alignés sur la banque (encadrés « À retenir », points non tranchés signalés) ; glossaire porté de 93 à 178 entrées ; « H2A (ex-H3C jusqu'au 31 décembre 2023) » et « Comité LCB-FT » dans la ville. PDF des fiches et de la ville régénérés.
- **Technique** : navigation vers les PDF servie comme fichier (plus la page de l'app), PDF précachés, données en réseau d'abord (2,5 s), VERSION de `sw.js` désormais **calculée** par `scripts/build_bank.py` (empreinte du contenu servi) et vérifiée par `npm run check` et un test ; synchronisation protégée par `If-Match` (412) ; un seul format pour les pourcentages, notes et compteurs ; examen blanc sans jumeaux, avec quotas par thème, les questions *low* en dernier recours seulement ; textes d'aide raccourcis, nom « DEC Épreuve 1 ».

**Reste à vérifier** (incertitude notée en `review_note`, en confiance *medium* ou *low*, ou en « Points non tranchés » des fiches)
- **CMF** R.561-23 (I al. 2 ou IV) et **NPLAB** § 47 / A47 : déclarant de substitution en AGC.
- **Ordonnance 45-2138** : art. 2 ou 22 pour la présomption de mandat ; attribution Macron, Pacte ou loi 2010-853 ; art. 7 et 12 (signature de la lettre de mission) ; art. 21 et 22 (secret, exceptions au salariat).
- **Loi 78-17** art. 19 III et **CPP** art. 109 (2025-11-EC-04, confiance *low*).
- **Décret 2012-432** art. 125, 145 et 161, **décret 2025-506** (délais de la conciliation préalable, date d'effet du 12 juin 2025), quantum de formation de l'EC (recommandation de l'Ordre, RI art. 607 à 612).
- **NPMQ de 2024** : confirmation annuelle d'indépendance, revue des audits d'entités cotées, critères d'affectation, supervision. **NP 2400** § 22 : conclusion « favorable » ou « sans réserve ». **NEP 9605** : numéros de paragraphe et correspondant Tracfin côté CAC.
- Questions en confiance *low* : 2023-05-CAC-17 (doctrine CNCC sur la mission complémentaire), 2023-11-CAC-15 (modalités du contrôle d'activité), 2025-05-EC-10, 2025-11-EC-04, 2026-05-CAC-16.
- Détails : sigles ARPEC et SIEC, numéro de NEP de la lettre d'affirmation, loi 88-227 art. 11-7, montants des seuils D.221-5, seuil de 10 000 € des fonds de dotation (fiche 05).
- **Non fait** : sections longues des fiches repliées (`renderMarkdown` échappe le HTML), propositions officielles de plus de 170 caractères (reprises telles quelles, `data/SCHEMA.md`), ouverture des PDF sur un vrai iPhone ou Android, course résiduelle du KV Cloudflare entre lecture et écriture.
