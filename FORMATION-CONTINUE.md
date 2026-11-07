# Note de travail : mode « Formation continue » (V2)

Piste ouverte le 7 novembre 2026. À reprendre après l'examen du 10 novembre.
Rien ici n'est implémenté ; l'app actuelle reste un outil de préparation à l'épreuve 1 du DEC.

## 1. Décision de principe

- Nouvelle version de l'app, à structure différente, la moins coûteuse possible (structure, temps, maintenance, coûts).
- Deux modes :
  - **Préparation à l'examen** (l'existant) : annales, minuteur 3 min, grades, souvenirs.
  - **Formation des diplômés** : modules horodatés, attestation, compteur d'heures. Pas de minuteur, gamification masquée.
- **Cible de départ : les experts-comptables seuls.** Les CAC viendront ensuite (mappage aux domaines H2A, export CNCC) ; une même formation vaut pour les deux.
- Portage par **un organisme déjà certifié Qualiopi** (IRF régional, CFPC, éditeur) plutôt que créer le nôtre. Nous fournissons contenu et plateforme ; lui fournit n° de déclaration d'activité, Qualiopi, attestation, tutorat.

## 2. Cadre réglementaire (relevé le 7/11/2026, à revérifier sur Légifrance)

### Experts-comptables
- Décret n° 2012-432 du 30 mars 2012, art. 148 : devoir de formation (code de déontologie).
- Norme de l'Ordre (issue d'IES 7) : **120 h sur 3 ans, dont 20 h minimum par an**. Vérifié lors du contrôle qualité du CROEC.
- Activités « vérifiables » (dont **e-learning tutoré**) majoritaires ; « non vérifiables » (lecture, autoformation seule) accessoires.
- Une même formation peut être validée pour l'activité EC et l'activité CAC.

### Commissaires aux comptes (pour plus tard)
- Arrêté du 28 décembre 2023 → art. **A. 821-46 s.** du code de commerce, en vigueur au 1er janvier 2024.
- 120 h sur 3 ans consécutifs, 20 h minimum par an. Actions admises : séminaires, autoformation encadrée, **formation à distance**, enseignement. Colloques plafonnés à 45 h / 3 ans.
- Attestation de présence délivrée par l'organisme ; déclaration à la CNCC avant le 31 mars ; justificatifs conservés 10 ans.
- Orientations H2A : décision FP 2024-19 (20 juin 2024). Le domaine « déontologie, indépendance, organisation » ne pèse que 9,66 % des heures déclarées en 2023 : marché peu servi.
- Formation particulière pour le CAC sans mandat depuis 3 ans : L. 821-24 II.

### Formation à distance et financement
- Code du travail **D. 6313-3-1** : assistance technique et pédagogique, information sur les activités et leur durée moyenne, évaluations.
- **Qualiopi** obligatoire pour un financement FIF-PL (libéraux) ou OPCO Atlas (salariés de cabinets). Le FIF-PL plafonne l'e-learning (50 % dans plusieurs professions ; vérifier la fiche 6920Z de l'année).
- RGPD : comptes nominatifs, traces de connexion, durée de conservation.

### Sources
- Légifrance, section A821-1 à A821-61 : https://www.legifrance.gouv.fr/codes/id/LEGISCTA000048933940/2024-01-01
- Arrêté du 28 décembre 2023 : https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000048735742
- CNCC, obligation de formation (campagne 2024) : https://doc.cncc.fr/docs/votre-obligation-de-formation-co/attachments/cncc-obligation-de-formation-continue-campagne-2024
- H2A, dossier formation continue : https://h2a-france.org/publications-et-actualites/dossiers-thematiques/formation-continue/
- H2A, décision FP 2024-19 : https://h2a-france.org/wp-content/uploads/2024/07/Decision-2024-FP-n2024-19-orientations-et-domaines-de-formation.pdf
- H2A, bilan campagne 2023 : https://h2a-france.org/wp-content/uploads/2024/12/Formation-professionnelle-des-CAC-Bilan-de-la-campagne-2023.pdf
- OEC BFC, obligation de formation : https://bfc.experts-comptables.fr/l-obligation-de-formation-continue
- Code du travail D. 6313-3-1 : https://code.travail.gouv.fr/code-du-travail/d6313-3-1
- FIF-PL, critères 6920Z : https://www.fifpl.fr/sites/default/files/documents/criteres/6920ZC.pdf

## 3. Ce que le mode Formation doit produire

1. **Modules horodatés** : titre, durée de référence (ex. « Secret professionnel · 1 h 30 »), objectifs pédagogiques, séquence fiches + cas, quiz final (seuil ≥ 80 %), temps actif mesuré (détection d'inactivité).
2. **Compte nominatif et traces** : identité, journal de connexion, temps par module. Implique un backend et un hébergement mensuel (rupture avec le localStorage actuel).
3. **Attestation PDF** : identité, heures, modules, domaines, n° de déclaration d'activité de l'organisme porteur, signature. Export CSV pour une déclaration.
4. **Assistance pédagogique** : question au formateur sous 48 h, FAQ (exigé par D. 6313-3-1).
5. **Évaluations Qualiopi** : positionnement initial, quiz final, satisfaction, évaluation « à froid ».
6. **Versionnement des textes** : chaque fiche porte une date de vérification et une périodicité ; alerte « texte modifié ».
7. **Veille** (voir § 5).

## 4. Attractivité pour des praticiens chevronnés

- Grades et souvenirs masqués. À la place : « 14 h / 20 h cette année · 61 h / 120 h · échéance 2027 », rappel avant la fin d'année ou avant le contrôle qualité.
- **Cas tirés de décisions disciplinaires réelles** (chambres régionales, H2A) : « Qu'auriez-vous fait ? », puis la décision prononcée.
- Parcours **« Ce qui a changé depuis votre DEC »** par ancienneté (recodification 2023, H2A, CSRD, LAB).
- Sessions de 15 min, desktop d'abord, lecture confortable, aucun rythme imposé.
- Chaque réponse cite l'article et renvoie au texte.
- **Auto-diagnostic cabinet** (indépendance, LAB, lettre de mission) exportable pour le dossier de contrôle qualité.
- Argument commercial : « vos 20 h de l'année, dont 4 h de déontologie, chez vous, attestées ».

## 5. Section Veille à faible maintenance

- Un fichier `veille.json` : date, titre, source, résumé de 3 lignes, fiches impactées. Pas de flux automatique.
- Calendrier de révision intégré : chaque fiche porte `verifiee_le` et une périodicité (déontologie : 12 mois ; LAB : 6 mois). L'app liste « à revérifier ce mois ». Rappel par un événement récurrent dans l'agenda.
- Rythme : une revue trimestrielle d'une heure (publications CSOEC, H2A, JO).
- Côté utilisateur : « Ce qui a changé depuis votre dernière visite », généré depuis le fichier, comptabilisé comme autoformation.

## 6. Tarification (à construire)

- Référence : prix de journée IRF / CFPC et plafonds FIF-PL de l'année.
- Pistes : abonnement annuel par EC (20 h), licence cabinet, ou partage de recette avec l'organisme porteur.
- Dépend de la voie retenue au § 7.

## 7. Trois voies de portage

| Voie | Structure | Valeur pour l'EC | Coût |
|---|---|---|---|
| 1. Autoformation déclarée | app actuelle + relevé d'heures exporté | activité non vérifiable, accessoire | nul |
| 2. **Organisme porteur certifié** | contenu + plateforme fournis, licence ou partage | activité vérifiable, attestée | faible |
| 3. Organisme propre | déclaration d'activité, Qualiopi, bilan pédagogique, RGPD | idem | élevé |

Recommandation : voie 2.

## 8. Avant de coder : valider le besoin

- 5 ou 6 entretiens avec des EC : comment ils se forment aujourd'hui (IRF, CFPC, webinaires, surtout fiscal et social), s'ils rattrapent leurs heures avant le contrôle qualité, ce qu'ils accepteraient de payer pour de la déontologie à distance.
- Un échange avec un IRF ou le CFPC : liste exacte des pièces attendues (programme, durées, quiz, traces, attestation) et conditions financières.

## 9. Ordre de marche

1. Bascule de mode + compteur d'heures local, sans valeur légale (dans l'app actuelle, peu de travail).
2. Modules horodatés, quiz, attestation auto-déclarative, fichier de veille et calendrier de révision.
3. Backend (comptes, traces), accord avec l'organisme porteur, attestation officielle, tarification.
4. Extension CAC : domaines H2A, export CNCC.
