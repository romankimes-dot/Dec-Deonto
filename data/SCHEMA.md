# Banque de questions — schéma et consignes de rédaction

Un fichier par session dans `data/bank/<AAAA-MM>.json` :

```json
{
  "session": "2025-11",
  "format": "qcm",            // format d'origine du sujet : "qcm" ou "qrc"
  "questions": [
    {
      "id": "2025-11-EC-01",   // <session>-<EC|CAC>-<n° sur 2 chiffres>
      "n": 1,
      "profession": "EC",      // "EC" ou "CAC"
      "theme": "exercice",     // exercice | deontologie | controle_qualite | responsabilite
      "tags": ["incompatibilites_activites"],
      "points": 1,             // barème d'origine (QCM = 1, QRC = points indiqués, 2 par défaut)
      "question": "Texte intégral de la question d'origine, sans le barème.",
      "qcm": {
        "question": "Optionnel : reformulation si la question d'origine ne se prête pas au QCM",
        "choices": ["a", "b", "c", "d"],   // exactement 4, une seule juste
        "answer": 1                          // index 0..3 de la bonne réponse
      },
      "qrc": {
        "question": "Optionnel : reformulation ouverte si la question d'origine était un QCM",
        "expected": ["élément attendu 1", "élément attendu 2"],   // 1 à 6 éléments courts
        "model_answer": "Réponse rédigée courte (1 à 4 phrases), telle qu'attendue sur copie."
      },
      "explanation": "Explication pédagogique (2 à 6 phrases) : la règle, le piège, la distinction EC/CAC si utile.",
      "reference": "Texte(s) de référence : ex. Ord. 45-2138 art. 22 ; D. 2012-432 art. 141 s. ; C. com. L.821-28 ; NP 2300",
      "confidence": "high",    // high | medium | low  (low = à vérifier par l'utilisateur)
      "update_note": "Optionnel : évolution depuis la session (ex. H3C → H2A au 01/01/2024 ; nouveaux seuils 2024)"
    }
  ]
}
```

## Règles

- **Chaque question existe dans les deux formats.** Sujet QRC d'origine → rédiger `qcm` avec 4 propositions plausibles (distracteurs issus des confusions classiques, notamment EC vs CAC). Sujet QCM d'origine → reprendre les 4 propositions telles quelles dans `qcm`, et rédiger `qrc` (question ouverte + éléments attendus).
- **Réponses à jour au 1er novembre 2026**, pas à la date du sujet. Quand la règle a changé, répondre selon le droit actuel et le signaler dans `update_note`.
- **Références** : citer le texte, pas copier un corrigé commercial. Rédaction originale.
- **Réponses courtes** : le jury attend « un mot, un chiffre, une liste ». `model_answer` doit tenir en 1 à 4 phrases.
- **`confidence`** : honnête. `low` dès qu'un chiffre, un article ou une composition d'instance est incertain.
- Thème = un des 4 thèmes du programme officiel :
  - `exercice` : cadre légal, organisation de la profession, accès, périmètre des missions, nomination/lettre de mission/cessation, modes d'exercice, honoraires, spécificités CAC (non-immixtion, entrave, co-commissariat, révélation, EIP), spécificités EC (devoir de conseil, personnes physiques), textes UE/internationaux, référentiel normatif, formation.
  - `deontologie` : codes de déontologie EC et CAC, principes fondamentaux, indépendance, incompatibilités, situations à risque, réseau, secret professionnel, publicité, confraternité, honoraires au succès, LCB-FT (obligations de vigilance et déclaration).
  - `controle_qualite` : H2A/AMF, contrôle qualité OEC, contrôle d'activité CAC, NPMQ, revue indépendante.
  - `responsabilite` : responsabilité civile, pénale, disciplinaire (procédure, instances, sanctions), administrative, assurance.

## Tags (vocabulaire fermé, 1 à 3 par question)

EC : `referentiel_normatif`, `missions_assurance`, `lettre_mission`, `honoraires`, `publicite_demarchage`, `secret_professionnel`, `incompatibilites_activites`, `societes_ec_capital`, `ordre_organisation`, `inscription_tableau`, `discipline_sanctions`, `responsabilite_civile`, `responsabilite_penale`, `lcb_ft`, `controle_qualite`, `devoir_conseil`, `confraternite_reprise_dossier`, `formation`, `delegation_signature`, `personnes_physiques`, `loi_pacte`, `missions_legales`

CAC : `h2a_supervision`, `cncc_crcc_organisation`, `inscription_liste`, `nomination_seuils`, `mandat_duree_cessation`, `demission_revocation`, `honoraires_bareme`, `lettre_mission_nep210`, `independance_situations_risque`, `incompatibilites_liens`, `reseau`, `services_interdits_eip`, `eip`, `co_commissariat`, `non_immixtion`, `secret_professionnel`, `revelation_procureur`, `lcb_ft`, `controle_activite`, `discipline_sanctions`, `responsabilite_civile`, `responsabilite_penale`, `formation`, `publicite_demarchage`, `prestations_declaration_activite`, `agp_associations`, `delit_entrave`, `code_deontologie_structure`, `nep`, `durabilite_csrd`, `alpe_petites_entreprises`

## Repères juridiques à jour (état au 1er novembre 2026)

Expertise comptable :
- Ordonnance n° 45-2138 du 19 septembre 1945 (modifiée notamment par la loi Macron 2015-990 et la loi Pacte 2019-486). Décret n° 2012-432 du 30 mars 2012 (le code de déontologie des professionnels de l'expertise comptable y est intégré, art. 141 à 169).
- Ordre : Conseil national de l'Ordre des experts-comptables (ex-Conseil supérieur, renommé par la loi Pacte) ; conseils régionaux (CROEC) ; commissaire du gouvernement ; chambres régionales de discipline (président magistrat + membres élus) ; chambre nationale de discipline (appel) ; recours contre la chambre nationale : Conseil d'État.
- Sanctions disciplinaires (ord. art. 53) : réprimande ; blâme avec inscription au dossier ; suspension pour une durée déterminée avec sursis ; suspension sans sursis ; radiation du tableau avec interdiction définitive d'exercer. Sanctions complémentaires LCB-FT : sanction pécuniaire, interdiction temporaire d'exercer…
- Référentiel normatif : cadre de référence des missions ; 3 natures : missions d'assurance sur comptes complets historiques (présentation NP 2300, examen limité NP 2400, audit NP 2100 ne pas confondre) ; autres missions d'assurance (attestations particulières NP 3100, examen d'informations financières prévisionnelles NP 3400) ; missions sans assurance (compilation NP 4410, procédures convenues NP 4400) ; autres prestations. Textes applicables à toutes les missions : code de déontologie, NPMQ (maîtrise de la qualité), NPLAB (anti-blanchiment). Normes agréées par arrêté du ministre (budget) après avis du Conseil national.
- Présentation : assurance modérée sur la cohérence et la vraisemblance ; attestation sans observation / avec observation(s) / refus d'attester. Examen limité : assurance modérée, conclusion normée. Audit : assurance raisonnable, opinion.
- Capital des sociétés d'EC : plus de 2/3 des droits de vote détenus par des experts-comptables (ou sociétés inscrites) ; formes libres sauf celles conférant la qualité de commerçant (SNC, commandite) ; AGC.
- Activités interdites : actes de commerce, mandats commerciaux, agent d'affaires, détention de fonds, sauf activités commerciales accessoires autorisées (loi Pacte art. 22 ord.) ; incompatibilité avec tout emploi salarié (sauf chez un EC, AGC, CAC).
- Taux d'encadrement : 1 EC pour 15 comptables salariés (fonctions comptables).
- Honoraires : libres, convenus par lettre de mission ; honoraires au succès interdits pour les missions de prérogative d'exercice (missions comptables), possibles pour certaines missions ; indexation possible si clause ; pas de barème.
- Secret professionnel (ord. art. 21, C. pén. 226-13) ; levée : témoignage en justice/audition pénale, contrôle qualité, AMF ; le client ne peut pas délier.
- Responsabilité civile : prescription de droit commun 5 ans ; limitation contractuelle possible mais clause de prescription réduite encadrée ; assurance RC obligatoire.
- LCB-FT : NPLAB ; vigilance standard / renforcée ; déclaration de soupçon à Tracfin par le professionnel (pas de copie à l'Ordre) ; bénéficiaire effectif (> 25 % capital/droits de vote ou contrôle) ; PPE.

Commissariat aux comptes :
- Code de commerce livre VIII recodifié par l'ordonnance n° 2023-1142 du 6 décembre 2023, en vigueur le 1er janvier 2024 : la Haute autorité de l'audit (H2A) remplace le H3C ; articles L.820-x (dispositions communes, H2A, commission des sanctions), L.821-x (commissaires aux comptes), L.822-x (auditeurs de durabilité). Numérotation réglementaire R.821-x / D.821-x / A.821-x. Les anciennes références (L.823-x, R.822-x) doivent être signalées comme anciennes dans `update_note`.
- Code de déontologie des CAC : annexe 8-1 (décret 2020-292 du 21 mars 2020, mis à jour 2024) ; Titre I = dispositions applicables à toutes missions et prestations (principes fondamentaux de comportement : intégrité, impartialité, indépendance, conflits d'intérêts, compétence, confraternité, discrétion…) ; Titre II = dispositions complémentaires pour la mission de certification (indépendance, situations à risque et mesures de sauvegarde, liens personnels/financiers/professionnels, réseau, honoraires, publicité…). Des normes de déontologie homologuées par arrêté existent désormais (A.821-54 s.).
- Organisation : CNCC (Conseil national : 60 membres élus pour 4 ans + autres membres), CRCC ; inscription sur la liste tenue par la H2A (délégation possible à la CNCC) ; recours contre refus d'inscription : Conseil d'État / cour d'appel de Paris selon les cas (vérifier) ; prestation de serment devant la cour d'appel.
- Nomination : seuils des sociétés commerciales (décret 2024-152, exercices ouverts à compter du 1er janvier 2024) : 5 M€ de bilan, 10 M€ de CA HT, 50 salariés (2 sur 3) ; filiales significatives : 2,5 M€ / 5 M€ / 25 ; petits groupes ; associations subventions publiques > 153 000 € ; AGP dons > 153 000 € ; syndicats de salariés ressources > 230 000 € ; organismes de formation (bilan 230 000 €, CA 153 000 €, 3 salariés). Mandat de 6 exercices ; mission ALPE (audit légal des petites entreprises) de 3 exercices.
- EIP : rotation du cabinet 10 ans (prolongation possible jusqu'à 16 ans appel d'offres / 24 ans co-commissariat) ; rotation du signataire 6 ans, viduité 3 ans ; services interdits (règlement UE 537/2014 art. 5 : tenue de comptabilité, paie, conseil fiscal, évaluation, audit interne, services juridiques, RH…) ; comité d'audit.
- Non-EIP : plus de liste de services interdits depuis la loi Pacte, mais approche risques/sauvegardes ; interdictions : situation d'autorévision, immixtion dans la gestion, et services fournis par le réseau non conformes.
- Démission : motifs légitimes (cessation définitive, motif personnel impérieux, difficultés dans l'accomplissement de la mission, impossibilité de mesures de sauvegarde) ; obstacles (ne pas démissionner pour se soustraire à une obligation légale : alerte, révélation, déclaration de soupçon, rapport). Révocation pour faute ou empêchement par décision de justice. Relèvement de fonctions (art. L.821-? ex L.823-7).
- Honoraires : barème d'heures (D.821-188, ex R.823-12 ; tranches selon bilan + produits) pour la certification ; dérogation : président de la CRCC ; recours : H2A ; honoraires des prestations hors barème ; litige sur prestations : tribunal compétent.
- Révélation des faits délictueux au procureur (L.821-10, ex L.823-12) : obligation dans la mission de certification, pas pour une simple prestation ; non-révélation = délit. Délit d'entrave (L.820-? ex L.820-4). Secret professionnel (L.821-? ex L.822-15) avec levées : entre CAC d'une mère et de ses filiales consolidées, successeur, H2A, AMF, Tracfin.
- Discipline : commission des sanctions de la H2A (L.820-2 : CAC, contrôleurs de pays tiers, membres de comités spécialisés… mais pas les experts-comptables) ; rapporteur général (enquêtes) ; procédures : ordinaire, simplifiée, composition administrative ; sanctions personnes physiques : avertissement, blâme, interdiction temporaire d'exercer (max 3 ans depuis 2024, L.821-71 ; 5 ans avant), radiation, sanction pécuniaire (max 250 000 € pers. physique / 1 M€ pers. morale), interdiction temporaire d'exercer des fonctions d'administrateur… ; prescription 6 ans ; appel devant le Conseil d'État.
- Formation continue : 120 heures sur 3 ans consécutifs (minimum 20 h/an) ; actions éligibles : formations suivies, formations dispensées, participation à des colloques, groupes de travail, publications, activités pédagogiques, formation à distance… ; formation particulière si pas d'exercice pendant 3 ans.
- Contrôle d'activité : par la H2A (contrôleurs) avec délégation/concours possible à la CNCC pour les non-EIP ; tous les 6 ans (non-EIP) / 3 ans (EIP) ; obligations de coopération, accès aux dossiers.
- Co-commissariat obligatoire pour les comptes consolidés (sauf exceptions) ; en cas de désaccord sur la répartition : conciliation par le président de la CRCC.
- Durabilité (CSRD, ordonnance 2023-1142) : mission de certification des informations en matière de durabilité, assurance modérée (limitée).
- LCB-FT CAC : NEP 9605 ; déclaration de soupçon par le CAC signataire ; bénéficiaire effectif.
