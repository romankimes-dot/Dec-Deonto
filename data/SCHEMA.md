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
        "expected": ["élément attendu 1", "élément attendu 2"],   // 1 à 6 éléments courts (150 caractères au plus si possible)
        "model_answer": "Réponse rédigée courte (1 à 4 phrases, 350 caractères au plus), telle qu'attendue sur copie."
      },
      "explanation": "Explication pédagogique (350 caractères au plus) : la règle, le piège, la distinction EC/CAC si utile.",
      "reference": "Texte(s) de référence : ex. Ord. 45-2138 art. 22 ; D. 2012-432 art. 141 s. ; C. com. L.821-28 ; NP 2300",
      "confidence": "high",    // high | medium | low  (low = à vérifier par l'utilisateur)
      "update_note": "Optionnel : évolution du droit depuis la session, en 1 ou 2 phrases (ex. H3C → H2A au 1er janvier 2024 ; nouveaux seuils 2024)",
      "answer_changed": true,  // optionnel : la bonne réponse retenue diffère de la clé de l'époque
      "review_note": "Optionnel : journal de relecture, jamais affiché à l'apprenant"
    }
  ]
}
```

## Champs facultatifs

- `qcm.crossProf` : index du leurre qui est **la règle de l'autre profession** (jamais la bonne réponse). Sert à la statistique « confusion EC / CAC ». Seulement sur les QCM rédigés (sessions QRC, transfert), jamais sur un sujet QCM officiel.
- `intrus` : `{ "q": "Laquelle n'est pas… ?", "items": [3 éléments attendus ou plus, 100 caractères au plus], "leurre": "…", "cross": true|false, "why": "pourquoi le leurre n'en fait pas partie" }`. Alimente le jeu « Trouvez l'intrus » (trois éléments tirés + le leurre). Le leurre doit être faux de façon certaine ; `cross` s'il s'agit de la règle de l'autre profession.
- `hors_annales: true` : obligatoire dans `data/bank/transfert.json` (questions de transfert rédigées hors annales, session `transfert`).
- `update_note` : **seulement l'évolution du droit** depuis la session (1 ou 2 phrases), affichée à l'apprenant.
- `review_note` : texte libre, **jamais affiché** à l'apprenant. Tout journal de relecture y va (« Relecture : », « non consulté », « non vérifié », « à vérifier »), jamais dans `update_note` ni `explanation`.
- `answer_changed: true` : la bonne réponse retenue diffère de la clé de l'époque (droit nouveau ou clé erronée) ; l'`update_note` dit pourquoi.

## Règles

- **Chaque question existe dans les deux formats.** Sujet QRC d'origine → rédiger `qcm` avec 4 propositions plausibles (distracteurs issus des confusions classiques, notamment EC vs CAC). Sujet QCM d'origine → reprendre les 4 propositions telles quelles dans `qcm`, et rédiger `qrc` (question ouverte + éléments attendus).
- **Réponses à jour au 1er novembre 2026**, pas à la date du sujet. Quand la règle a changé, répondre selon le droit actuel et le signaler dans `update_note`.
- **Références** : citer le texte, pas copier un corrigé commercial. Rédaction originale.
- **Réponses courtes** : les rapports de jury attendent des réponses synthétiques (un mot, un chiffre, une liste). `model_answer` tient en 1 à 4 phrases et 350 caractères au plus ; `explanation` en 350 caractères au plus (règle, piège, contraste EC/CAC) ; chaque élément `expected` en 150 caractères au plus si possible, sans perdre d'information juridique utile.
- **Vocabulaire** : un seul sigle, **LCB-FT** (jamais LBC-FT ni LAB, sauf dans le nom de la NPLAB) ; **H2A** (ex-H3C jusqu'au 31 décembre 2023 ; « H3C » seulement pour l'historique) ; **APG** (appel public à la générosité) ; **Tracfin** ; **garde des Sceaux**. Dates en toutes lettres (« 1er janvier 2024 »). Espaces insécables et apostrophes : traités à l'affichage, ne pas les remplacer en masse dans les données.
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
- Ordre : Conseil national de l'Ordre des experts-comptables (ex-Conseil supérieur, renommé par la loi 2022-172 du 14 février 2022) ; conseils régionaux (CROEC) ; commissaire du gouvernement ; chambres régionales de discipline (président magistrat + membres élus) ; chambre nationale de discipline (appel) ; recours contre la chambre nationale : Conseil d'État.
- Sanctions disciplinaires (ord. art. 53) : réprimande ; blâme avec inscription au dossier ; suspension pour une durée déterminée avec sursis ; suspension sans sursis ; radiation du tableau avec interdiction définitive d'exercer. Sanctions complémentaires LCB-FT : sanction pécuniaire, interdiction temporaire d'exercer…
- Référentiel normatif : cadre de référence des missions ; 3 natures : missions d'assurance sur comptes complets historiques (présentation NP 2300, examen limité NP 2400, audit : normes ISA, et NP 2910 pour l'audit d'une petite entité ; il n'y a pas de « NP 2100 ») ; autres missions d'assurance (attestations particulières NP 3100, examen d'informations financières prévisionnelles NP 3400) ; missions sans assurance (compilation NP 4410, procédures convenues NP 4400) ; autres prestations. Textes applicables à toutes les missions : code de déontologie, NPMQ (management de la qualité, depuis le 1er janvier 2025 : agréée par arrêté du 30 mai 2024, inspirée d'ISQM 1, 8 composantes ; « maîtrise de la qualité » et 6 domaines avant), NPLAB (anti-blanchiment). Normes élaborées par le Conseil national et agréées par arrêté du ministre chargé de l'économie.
- Présentation : assurance modérée sur la cohérence et la vraisemblance ; attestation sans observation / avec observation(s) / refus d'attester. Examen limité : assurance modérée, conclusion normée (favorable sans observation / favorable avec observation(s) / avec réserve(s) / défavorable / impossibilité de conclure). Audit : assurance raisonnable, opinion.
- Capital des sociétés d'EC : plus de 2/3 des droits de vote détenus par des experts-comptables (ou sociétés inscrites) ; formes libres sauf celles conférant la qualité de commerçant (SNC, commandite) ; AGC.
- Activités interdites : actes de commerce, mandats commerciaux, agent d'affaires, détention de fonds, sauf activités commerciales accessoires autorisées (ord. art. 22, depuis la loi 2010-853 ; la loi Pacte n'a modifié que le maniement de fonds, avec le mandat implicite, les honoraires de succès et l'EC en entreprise) ; incompatibilité avec tout emploi salarié (sauf chez un membre de l'Ordre, un CAC, une AGC, une succursale ou une société pluri-professionnelle d'exercice, ord. art. 22).
- Taux d'encadrement : 1 EC pour 15 comptables salariés (fonctions comptables).
- Honoraires : libres, convenus par lettre de mission ; honoraires au succès interdits pour les missions de prérogative d'exercice (missions comptables), possibles pour certaines missions ; indexation possible si clause ; pas de barème.
- Secret professionnel (ord. art. 21, C. pén. 226-13) ; levées : contrôle de qualité, AMF, Tracfin, administration fiscale (droit de communication), CNIL (loi 78-17 art. 19 III), information ou poursuites engagées contre l'EC (ord. art. 21) ; opposable au témoin en matière pénale (CPP art. 109) ; le client ne peut pas délier.
- Responsabilité civile : prescription de droit commun 5 ans ; limitation contractuelle possible mais clause de prescription réduite encadrée ; assurance RC obligatoire.
- LCB-FT : NPLAB ; vigilance standard / renforcée ; déclaration de soupçon à Tracfin faite personnellement par l'expert-comptable en charge de la mission (C. mon. fin. R.561-23 I, al. 2, NPLAB § 47 ; pas de « déclarant désigné » ; le correspondant Tracfin, pas forcément EC, ne déclare pas ; pas de copie au conseil régional) ; bénéficiaire effectif (> 25 % capital/droits de vote ou contrôle) ; PPE.

Commissariat aux comptes :
- Code de commerce livre VIII recodifié par l'ordonnance n° 2023-1142 du 6 décembre 2023, en vigueur le 1er janvier 2024 : la Haute autorité de l'audit (H2A) remplace le H3C ; articles L.820-x (dispositions communes, H2A, commission des sanctions), L.821-x (commissaires aux comptes), L.822-x (auditeurs de durabilité). Numérotation réglementaire R.821-x / D.821-x / A.821-x. Les anciennes références (L.823-x, R.822-x) doivent être signalées comme anciennes dans `update_note`.
- Code de déontologie des CAC : annexe 8-1 (décret 2020-292 du 21 mars 2020, modifié en dernier lieu par le décret 2026-176 du 11 mars 2026) ; Titre I (art. 3 à 17) = dispositions applicables à toutes missions et prestations : principes fondamentaux de comportement (intégrité, impartialité, indépendance, conflits d'intérêts, compétence, confraternité, discrétion…), conduite de la mission ou de la prestation, honoraires (art. 12 à 14, dont l'interdiction des honoraires subordonnés au résultat, art. 13), publicité et sollicitation (art. 15 et 16), limitations et interdictions ; Titre II (art. 18 à 37) = dispositions particulières à la certification des comptes et des informations de durabilité (services interdits, situations à risque et mesures de sauvegarde, acceptation et conduite de la mission, réseau, liens personnels/financiers/professionnels, honoraires de certification). Des normes de déontologie homologuées par arrêté existent désormais (A.821-54 s.).
- Organisation : CNCC (Conseil national : 60 membres pour 4 ans, présidents de CRCC compris, les autres élus par deux collèges EIP / non-EIP, D.821-14), CRCC ; inscription sur la liste tenue par la H2A elle-même (déléguée à la CNCC de 2017 à 2020) ; recours contre les décisions d'inscription : juridiction administrative (R.821-68), en pratique le tribunal administratif ; prestation de serment devant la cour d'appel.
- Nomination judiciaire : tout associé en SNC (L.221-9), un ou plusieurs associés représentant au moins le dixième du capital en SARL, SAS, SA et SCA (L.223-35, L.227-9-1, L.225-218, L.226-6) ; le tiers du capital vaut pour la demande motivée d'un mandat de trois exercices. Nomination : seuils des sociétés commerciales (décret 2024-152, exercices ouverts à compter du 1er janvier 2024) : 5 M€ de bilan, 10 M€ de CA HT, 50 salariés (2 sur 3) ; filiales significatives : 2,5 M€ / 5 M€ / 25 ; petits groupes ; associations subventions publiques > 153 000 € ; APG (appel public à la générosité) dons > 153 000 € ; syndicats de salariés ressources > 230 000 € ; organismes de formation (bilan 230 000 €, CA 153 000 €, 3 salariés). Mandat de 6 exercices ; mission ALPE (audit légal des petites entreprises) de 3 exercices.
- EIP : rotation du cabinet 10 ans (prolongation possible jusqu'à 16 ans appel d'offres / 24 ans co-commissariat ; 2 ans de plus sur autorisation de la H2A ; puis 4 ans d'attente, L.821-45) ; rotation du signataire 6 exercices dans la limite de 7 ans, puis viduité de 3 ans (L.821-34 : vaut aussi pour les entités de L.612-1, les associations faisant appel à la générosité du public et les filiales importantes d'EIP ayant le même CAC) ; services interdits (règlement UE 537/2014 art. 5 : tenue de comptabilité, paie, conseil fiscal, évaluation, audit interne, services juridiques, RH…) ; comité d'audit.
- Non-EIP : plus de liste de services interdits depuis la loi Pacte, mais approche risques/sauvegardes ; le CAC ne peut accepter ou poursuivre la mission en cas de risque d'autorévision ou d'indépendance compromise, lorsque des mesures de sauvegarde appropriées ne peuvent être mises en œuvre (L.821-28 IV) ; la non-immixtion dans la gestion est une règle distincte (L.821-54).
- Démission : motifs légitimes (cessation définitive, motif personnel impérieux, difficultés dans l'accomplissement de la mission, impossibilité de mesures de sauvegarde) ; obstacles (ne pas démissionner pour se soustraire à une obligation légale : alerte, révélation, déclaration de soupçon, rapport). Révocation pour faute ou empêchement par décision de justice. Relèvement de fonctions (L.821-50, ex L.823-7).
- Honoraires : barème d'heures (D.821-188, ex R.823-12 ; tranches selon bilan + produits) pour la certification ; dérogation : président de la CRCC, puis président de la CNCC, puis bureau de la H2A, puis tribunal administratif (D.821-190, D.821-191) ; litige sur le montant en certification : conciliation du président de la CRCC (R.821-196), puis le juge ; honoraires des prestations hors barème ; litige sur prestations : tribunal compétent.
- Révélation des faits délictueux au procureur (L.821-10, ex L.823-12) : faits connus « à l'occasion de sa mission ou prestation » (donc aussi les prestations) ; non-révélation = délit (L.821-9). Délit d'entrave (L.821-6 3°, ex L.820-4). Secret professionnel (L.821-35, ex L.822-15) avec levées : entre CAC de la consolidante et des consolidées, président du tribunal (alerte), H2A, AMF, Tracfin ; L.821-35 ne prévoit aucune levée au profit du successeur, dont l'accès aux documents du prédécesseur relève de L.821-44 (contact préalable : code de déontologie art. 26).
- Discipline : commission des sanctions de la H2A (L.820-2 V : un magistrat de la Cour de cassation président, 4 personnes qualifiées dont une ayant exercé la profession de CAC ; pas les experts-comptables) ; faute disciplinaire = manquement aux conditions légales d'exercice, négligence grave ou fait contraire à la probité ou à l'honneur (L.821-70) ; rapporteur général (enquêtes), saisi par la Cour des comptes, le procureur général, l'AMF, l'ACPR, la H2A, la CNCC ou une CRCC, ou par autosaisine (L.821-73) ; procédures : ordinaire, simplifiée, composition administrative ; sanctions personnes physiques : avertissement, blâme, interdiction temporaire d'exercer (max 3 ans depuis 2024, L.821-71 ; 5 ans avant), radiation, sanction pécuniaire (max 250 000 € pers. physique / 1 M€ pers. morale), interdiction temporaire d'exercer des fonctions d'administrateur… ; prescription 6 ans ; appel devant le Conseil d'État.
- Formation continue : 120 heures sur 3 ans consécutifs (minimum 20 h/an) ; actions éligibles (A.821-46) : séminaires, autoformation encadrée et formation à distance ; colloques (45 h sur 3 ans) ; conception ou animation (20 h par an) ; rédaction et publication (30 h sur 3 ans) ; travaux techniques (20 h par an) ; formation continue particulière ; formation particulière si pas d'exercice pendant 3 ans.
- Contrôle d'activité : par la H2A (contrôleurs) avec délégation possible à la CNCC pour les non-EIP, par convention homologuée, et concours possible de l'AMF ou de l'ACPR (L.820-14) ; au moins tous les 6 ans ; 3 ans pour les CAC des EIP visées au i) de l'art. 26 § 2 du règlement 537/2014 (R.820-49) ; secret non opposable aux contrôleurs (L.820-17), qui informent eux-mêmes Tracfin (L.820-18) ; obligations de coopération, accès aux dossiers.
- Co-commissariat obligatoire pour les comptes consolidés (sauf exceptions) ; en cas de désaccord sur la répartition : saisine du président de la CRCC ou, si les CAC relèvent de compagnies distinctes, du président de leur compagnie respective (code de déontologie art. 24 I).
- Durabilité (CSRD, ordonnance 2023-1142) : mission de certification des informations en matière de durabilité, assurance modérée (limitée).
- LCB-FT CAC : NEP 9605 ; déclaration de soupçon par le CAC signataire ; bénéficiaire effectif.
