// La ville des institutions : chaque bâtiment est une instance (Ordre, H2A, CNCC, ministères, juridictions).
// Rive gauche : l'expert-comptable ; rive droite : le commissaire aux comptes ; le fleuve est la frontière.
// Rendu 3D en CSS pur (perspective + faces d'un pavé), aucune dépendance, utilisable hors ligne. Toucher un
// bâtiment ouvre ses « pancartes » : qui est à l'intérieur, ce qu'il fait, les chiffres, les pièges, et le
// bâtiment jumeau de l'autre rive. Contenu repris des fiches (data/fiches, voir `fiche` de chaque bâtiment).
// Utilisé par l'app (vue « Ville », onglet Fiches) et par la page autonome (artefact).

export const VILLE = {
  rives: { ec: 'Expert-comptable', cac: 'Commissaire aux comptes', commun: 'Commun aux deux' },
  batiments: [
    {
      id: 'bercy', rive: 'ec', nom: 'Ministère de l’Économie', court: 'Bercy', type: 'Tutelle',
      role: 'Ministre chargé de l’économie : tutelle de l’Ordre des experts-comptables.',
      x: 16, y: 18, w: 110, d: 60, h: 46, style: 'ministere', jumeau: 'chancellerie', fiche: '01-ec-exercice.md',
      pancartes: [
        { qui: 'Le ministre', fait: 'Agrée les **normes professionnelles** par **arrêté**. Le **code de déontologie** des EC est adopté par **décret** (décret 2012-432, art. 141 à 169).' },
        { qui: 'Le commissaire du gouvernement', fait: 'Représente la tutelle **auprès du Conseil national et de chaque CROEC** : il **assiste aux séances**, **reçoit les décisions** et peut les **contester**. Contre une inscription ou un refus d’inscription, il saisit le **comité national du tableau**. En discipline : il peut **porter plainte** et **faire appel**, mais il **ne siège pas** dans les chambres ; les poursuites relèvent du **magistrat chargé des poursuites**.' },
        { qui: 'Au guichet des fonctionnaires', fait: 'Le ministre désigne les **2 fonctionnaires** qui siègent à la **chambre nationale de discipline** (avec un magistrat et 2 membres du Conseil national).' },
      ],
      pieges: ['Chez le CAC, la tutelle est le **garde des Sceaux**, pas Bercy.', 'Le commissaire du gouvernement n’est **pas membre** des chambres de discipline.'],
    },
    {
      id: 'chancellerie', rive: 'cac', nom: 'Ministère de la Justice', court: 'Chancellerie', type: 'Tutelle',
      role: 'Garde des Sceaux : la CNCC est placée auprès de lui ; il homologue les normes de la H2A.',
      x: 84, y: 18, w: 110, d: 60, h: 46, style: 'ministere', jumeau: 'bercy', fiche: '05-cac-exercice.md',
      pancartes: [
        { qui: 'Le garde des Sceaux', fait: '**Homologue par arrêté** les **NEP** adoptées par la H2A, ainsi que les **conventions de délégation** H2A → CNCC. Il peut **demander l’élaboration d’une NEP**. Il **regroupe** les compagnies régionales (17 CRCC depuis le 1er novembre 2020).' },
        { qui: 'Ce qu’il ne fait pas', fait: 'Il **ne saisit pas** le rapporteur général de la H2A (la liste des auteurs de saisine ne le comprend pas) et il n’adopte pas lui-même les normes : il les **homologue**.' },
        { qui: 'Au passage', fait: 'C’est aussi lui qui désigne le **magistrat président de la chambre nationale de discipline** des experts-comptables, parmi les présidents de chambre de la **cour d’appel de Paris**.' },
      ],
      pieges: ['**Homologue** (CAC) ≠ **agrée** (EC) : deux verbes, deux ministres.', 'Le garde des Sceaux **ne saisit pas** le rapporteur général.'],
    },
    {
      id: 'cnoec', rive: 'ec', nom: 'Conseil national de l’Ordre', court: 'CNOEC', type: 'Instance nationale',
      role: 'Représente la profession, élabore normes et code de déontologie, coordonne les CROEC.',
      x: 16, y: 37, w: 100, d: 70, h: 70, style: 'ordre', jumeau: 'cncc', fiche: '01-ec-exercice.md',
      chiffres: ['mandat 4 ans', 'suffrage direct depuis 2020', 'renommé par la loi 2022-172'],
      pancartes: [
        { qui: 'Les élus (étage de la direction)', fait: 'Membres élus pour **4 ans**, **au suffrage direct** par les experts-comptables **depuis 2020** (avant, élus par les conseils régionaux). Ancien nom : **Conseil supérieur** (CSOEC), renommé par la **loi 2022-172** du 14 février 2022, pas par la loi Pacte. Siège à Paris.' },
        { qui: 'Service des normes', fait: '**Élabore les normes professionnelles** (soumises à l’agrément du ministre par arrêté) et le **code de déontologie** (adopté ensuite par décret). **Définit le programme** et la méthodologie du **contrôle de qualité**, réalisé par les CROEC.' },
        { qui: 'Trésorerie', fait: 'Gère les ressources de l’Ordre, mais **ne collecte pas lui-même les cotisations** : elles sont appelées par les **CROEC** et reversées en partie.' },
        { qui: 'Passerelle vers la chambre nationale de discipline', fait: 'La **chambre nationale de discipline** siège **auprès du Conseil national** : c’est le bâtiment voisin (appel des décisions des chambres régionales).' },
        { qui: 'Comité national du tableau', fait: 'Reçoit le **recours du commissaire du gouvernement** contre une inscription au tableau ou un refus d’inscription.' },
        { qui: 'Comité LBC-FT', fait: 'Conclut les contrôles **LCB-FT** ; reçoit par **courrier confidentiel** les soupçons relevés en contrôle ; l’Ordre informe ensuite **Tracfin**.' },
      ],
      pieges: ['Il **ne collecte pas** les cotisations.', 'Le CAC n’a **pas** de chambre nationale d’appel : c’est la **commission des sanctions** de la H2A (sans appel), puis le Conseil d’État.'],
    },
    {
      id: 'cncc', rive: 'cac', nom: 'Compagnie nationale des CAC', court: 'CNCC', type: 'Instance nationale',
      role: 'Établissement d’utilité publique auprès du garde des Sceaux : représente, forme, contrôle par délégation.',
      x: 84, y: 38, w: 100, d: 70, h: 64, style: 'ordre', jumeau: 'cnoec', fiche: '05-cac-exercice.md',
      chiffres: ['60 membres', '4 ans', '30 sièges EIP + 30 non-EIP'],
      pancartes: [
        { qui: 'Le Conseil national (salle des 60)', fait: '**60 membres** désignés pour **4 ans** : **tous les présidents de CRCC** plus des CAC élus ; **moitié** CAC d’EIP, **moitié** CAC sans mandat d’EIP (**30 sièges par collège**, présidents de CRCC compris). Il élit un **président** et un **bureau**.' },
        { qui: 'Mission', fait: '**Représente** la profession, concourt au **bon exercice**, à la **surveillance** et à la **défense** des intérêts, assure la **formation**. Peut **demander l’élaboration d’une NEP** (comme le garde des Sceaux, l’AMF, l’ACPR, l’ANC, le CNoCP). Son président peut **saisir le rapporteur général** de la H2A.' },
        { qui: 'Services délégués par la H2A', fait: 'Par **conventions homologuées par arrêté** (2017, 19 mai 2023, 2 juillet 2026) : **contrôles d’activité des CAC sans mandat d’EIP** et **suivi de la formation continue**. La H2A garde la **supervision**. L’inscription sur la liste avait été déléguée de **2017 à novembre 2020** : elle est revenue à la H2A.' },
        { qui: 'Bureau du président', fait: 'Reçoit sous **10 jours** le recours contre la décision du président de la CRCC sur une **dérogation au barème** d’heures.' },
      ],
      pieges: ['**Aucune sanction** n’est prononcée ici : la discipline du CAC est à la **H2A**.', 'La CNCC **peut** demander une NEP ; une **CRCC ne le peut pas**.'],
    },
    {
      id: 'croec', rive: 'ec', nom: 'Conseil régional de l’Ordre', court: 'CROEC', type: 'Instance régionale',
      role: 'Tient le tableau, inscrit, appelle les cotisations, contrôle la qualité, concilie.',
      x: 16, y: 58, w: 96, d: 56, h: 40, style: 'regional', jumeau: 'crcc', fiche: '01-ec-exercice.md',
      chiffres: ['élus 4 ans', 'bureau 2 ans', 'président 4 ans max puis 2 ans de pause', 'serment sous 6 mois'],
      pancartes: [
        { qui: 'Accueil : le tableau', fait: '**Tient le tableau** (3 sections suivies de 11 listes), statue sur les **inscriptions**, appelle les **cotisations**, représente l’Ordre dans la région. **Serment** prêté **devant le conseil régional** dans les **6 mois** de l’inscription. Cotisations impayées **2 ans sur 10** : **radiation d’office** (pas une sanction).' },
        { qui: 'Le bureau du président', fait: 'Membres élus **4 ans**, bureau élu **2 ans**, présidence **4 années consécutives au plus** puis **2 ans** d’interruption. Le président est **conciliateur** (accord amiable) ou **arbitre** (sentence), désigne un confrère pour le **remplacement provisoire** d’un EC décédé ou empêché, et **conclut** chaque contrôle de qualité au vu du rapport.' },
        { qui: 'Service du contrôle de qualité', fait: 'Contrôleurs **désignés 3 ans** renouvelables par le conseil régional, **50 heures par an** au moins. Conclusions possibles : sans observation ; simples observations ; observations **et nouveau contrôle à un an** ; nouveaux manquements → **chambre de discipline**.' },
        { qui: 'Passerelle vers la chambre régionale de discipline', fait: 'La **chambre régionale de discipline** siège **auprès de chaque CROEC** : c’est le bâtiment voisin (première instance).' },
        { qui: 'Permanence déontologique', fait: 'En cas de doute déontologique, l’EC **consulte le CROEC**. Il y **déclare** ses activités commerciales accessoires et y **signale** l’exercice illégal.' },
      ],
      pieges: ['Chez le CAC, la **liste** est tenue par la **H2A**, pas par la CRCC.', 'La chambre régionale **n’existe pas** pour le CAC.'],
    },
    {
      id: 'crcc', rive: 'cac', nom: 'Compagnie régionale des CAC', court: 'CRCC', type: 'Instance régionale',
      role: 'Dans le ressort des cours d’appel : représentation, conciliation, dérogations au barème.',
      x: 84, y: 59, w: 96, d: 56, h: 36, style: 'regional', jumeau: 'croec', fiche: '05-cac-exercice.md',
      chiffres: ['17 CRCC depuis le 1er nov. 2020 (33 avant)', '22 membres au plus', 'dérogation sous 15 jours', 'conciliation 3 mois'],
      pancartes: [
        { qui: 'Le conseil régional (22 sièges au plus)', fait: '**22** est l’effectif maximal d’un conseil régional (compagnie d’au moins 900 membres), **pas un nombre de compagnies**. **Électeurs** : CAC **personnes physiques** inscrits, **à jour de cotisations**. **Éligibles** : personnes physiques à jour et **exerçant au 30 juin** de l’année d’expiration des mandats ; le président exerce au moins **une mission de certification**. Les **sociétés** ne sont **ni électrices ni éligibles**.' },
        { qui: 'Le bureau du président', fait: 'Statue sous **15 jours** sur la **dérogation au barème** d’heures (recours sous 10 jours devant le président de la CNCC) ; **concilie** les **co-commissaires** et les litiges d’**honoraires** (**3 mois**, puis le juge ; la H2A n’intervient pas). Il peut **saisir le rapporteur général** de la H2A et il est **avisé** des audiences de la commission des sanctions.' },
        { qui: 'Secrétariat des mandats', fait: 'Toute **nomination** à un mandat lui est **notifiée sous 8 jours** (lettre recommandée ou voie électronique).' },
        { qui: 'Ce qui ne se passe pas ici', fait: 'Ni **inscription** (H2A), ni **serment** (cour d’appel), ni **sanction** (H2A), ni **demande de NEP** (réservée au garde des Sceaux, à l’AMF, à l’ACPR, à l’ANC, au CNoCP et à la CNCC).' },
      ],
      pieges: ['Chez l’EC, le **serment** se prête au conseil régional ; chez le CAC, devant le **premier président de la cour d’appel**.', 'Une CRCC **ne peut pas** demander une NEP.'],
    },
    {
      id: 'h2a', rive: 'cac', nom: 'Haute autorité de l’audit', court: 'H2A', type: 'Supervision publique',
      role: 'Autorité publique indépendante (ex-H3C) : liste, normes, contrôles, enquêtes, sanctions.',
      x: 66, y: 42, w: 70, d: 70, h: 120, style: 'tour', jumeau: 'terrain', fiche: '07-cac-controle-activite.md',
      chiffres: ['depuis le 1er janvier 2024', 'commission : 1 magistrat + 4 qualifiés', 'nommés 6 ans, renouvelables 1 fois', 'prescription 6 ans'],
      pancartes: [
        { qui: 'Rez-de-chaussée : la liste', fait: '**Inscription** des CAC et **tenue de la liste**, par la H2A **elle-même** (déléguée à la CNCC de 2017 à 2020). Recours devant le **tribunal administratif**. **Avis** sur une question de déontologie.' },
        { qui: '1er étage : les normes', fait: 'Adopte les **NEP**, le code de déontologie et les normes de contrôle interne de qualité, **homologués par arrêté du garde des Sceaux**. **Deux commissions de normalisation** (durabilité ; certification des comptes et attestations), présidées par le **même membre du collège**. L’ancienne commission **paritaire** du H3C n’existe plus.' },
        { qui: '2e étage : direction des contrôles', fait: '**Contrôleurs salariés** de la H2A pour les CAC d’**EIP** ; les CAC **sans mandat d’EIP** sont contrôlés par la **CNCC par délégation**. Blanchiment découvert en contrôle : **les contrôleurs** informent Tracfin.' },
        { qui: '3e étage : rapporteur général et service des enquêtes', fait: 'Saisi par la **Cour des comptes**, le **procureur général**, les présidents de l’**AMF**, de l’**ACPR**, de la **H2A**, de la **CNCC** ou d’une **CRCC** ; **autosaisine** sur signalement. **Pas le garde des Sceaux.** Secret professionnel **non opposable**.' },
        { qui: '4e étage : le collège', fait: '**Non-praticiens majoritaires** : président **magistrat de la Cour de cassation**, membres du Conseil d’État, de la Cour des comptes, AMF, ACPR, Trésor, personnes qualifiées, **2 anciens CAC**. Il **poursuit** : **arrête les griefs** (notifiés par le **président de la H2A**), classe, propose une **composition administrative** ; en urgence, **suspension provisoire** de **6 mois** au plus (pas une sanction).' },
        { qui: 'Passerelle vers la commission des sanctions', fait: 'La **commission des sanctions** est **séparée du collège** : nul ne siège dans les deux. C’est le bâtiment voisin, relié à la tour par une passerelle : le collège **poursuit**, la commission **juge**.' },
        { qui: 'Annexe : formation continue', fait: 'Le **suivi** de la formation continue est **délégué à la CNCC**.' },
      ],
      pieges: ['La H2A **n’adopte pas** la déontologie des EC et ne juge **jamais** un expert-comptable pour son activité d’EC.', 'Interdiction temporaire **3 ans** au plus : les **5 ans** sont l’ancien régime H3C.', '**Réprimande** et **suspension** sont des peines d’EC, pas de CAC.'],
    },
    {
      id: 'terrain', rive: 'ec', nom: 'Terrain vague', court: 'Pas de H2A', type: 'Supervision publique',
      role: 'Aucune autorité publique indépendante chez l’expert-comptable : c’est l’Ordre qui contrôle.',
      x: 34, y: 46, w: 60, d: 60, h: 3, style: 'vide', jumeau: 'h2a', fiche: '12-schema-institutions-ec-cac.md',
      pancartes: [
        { qui: 'Panneau sur la grille', fait: 'Ici, rien à construire : chez l’EC, **l’Ordre contrôle lui-même** (contrôle de qualité par les CROEC, discipline par ses chambres présidées par un magistrat). La **tutelle** est assurée par le ministre de l’économie via le **commissaire du gouvernement**, pas par une autorité indépendante.' },
        { qui: 'Ce que cela change', fait: 'Pas de **sanction pécuniaire** pour l’EC (sauf **LCB-FT**), pas de **composition administrative**, pas de **prescription de 6 ans** écrite ; les juridictions sont **ordinales**, les sanctions du CAC sont **administratives**.' },
      ],
      pieges: ['Le contrôle de qualité EC est fait par l’**Ordre**, le contrôle d’activité CAC par la **H2A** (ou la CNCC par délégation).'],
    },
    {
      id: 'ce', rive: 'commun', nom: 'Conseil d’État', court: 'Conseil d’État', type: 'Juridiction',
      role: 'Dernier recours des deux professions, mais pas de la même façon.',
      x: 50, y: 16, w: 70, d: 44, h: 56, style: 'palais', fiche: '13-schema-discipline.md',
      pancartes: [
        { qui: 'Guichet EC', fait: '**Recours en cassation** contre les décisions de la **chambre nationale de discipline**.' },
        { qui: 'Guichet CAC', fait: '**Recours de pleine juridiction** contre les décisions de la **commission des sanctions** de la H2A : par la personne sanctionnée, ou par le **président de la H2A** après accord du collège.' },
      ],
      pieges: ['Cassation (EC) ≠ pleine juridiction (CAC).'],
    },
    {
      id: 'ca', rive: 'commun', nom: 'Cour d’appel', court: 'Cour d’appel', type: 'Juridiction',
      role: 'Le CAC y prête serment ; son premier président désigne le magistrat qui préside la chambre régionale des EC.',
      x: 50, y: 57, w: 64, d: 44, h: 44, style: 'palais', fiche: '05-cac-exercice.md',
      pancartes: [
        { qui: 'Salle des serments (CAC)', fait: 'Le CAC prête serment **devant le premier président de la cour d’appel** du ressort, **avant tout exercice**. L’EC, lui, jure devant le **conseil régional** de l’Ordre.' },
        { qui: 'Cabinet du premier président (EC)', fait: 'Il **désigne le magistrat** de l’ordre judiciaire qui **préside la chambre régionale de discipline** des experts-comptables.' },
        { qui: 'Au bout du couloir', fait: 'Le **relèvement de fonctions** d’un CAC (faute ou empêchement) est prononcé **par décision de justice**, à la demande des dirigeants, d’actionnaires (5 %), du CSE, du ministère public ou de l’AMF.' },
      ],
      pieges: ['Les CRCC sont établies dans le **ressort des cours d’appel** (17 après regroupements).'],
    },
    {
      id: 'ta', rive: 'cac', nom: 'Tribunal administratif', court: 'Trib. admin.', type: 'Juridiction',
      role: 'Recours contre l’inscription ou le refus d’inscription sur la liste des CAC.',
      x: 68, y: 73, w: 44, d: 36, h: 30, style: 'palais', jumeau: 'cnoec', fiche: '12-schema-institutions-ec-cac.md',
      pancartes: [
        { qui: 'Guichet', fait: 'La **liste** des CAC est tenue par la **H2A** ; contester une inscription ou un refus se fait devant la **juridiction administrative**. Chez l’EC, c’est le **commissaire du gouvernement** qui saisit le **comité national du tableau** (au Conseil national de l’Ordre).' },
      ],
      pieges: [],
    },
    {
      id: 'amf', rive: 'cac', nom: 'AMF et ACPR', court: 'AMF · ACPR', type: 'Autorités de marché',
      role: 'Voisines de la H2A : elles peuvent demander une NEP, saisir le rapporteur général, demander un relèvement.',
      x: 95, y: 49, w: 44, d: 40, h: 54, style: 'tour', fiche: '07-cac-controle-activite.md',
      pancartes: [
        { qui: 'Le président de l’AMF', fait: 'Peut **demander l’élaboration d’une NEP**, **saisir le rapporteur général** de la H2A et **demander le relèvement** d’un CAC d’une entité cotée. Le **secret professionnel** du CAC est **levé** à son égard. L’AMF reçoit les rapports des CAC des émetteurs et échange avec la H2A.' },
        { qui: 'L’ACPR', fait: 'Rôle comparable pour les **banques** et les **assurances**. Des membres de l’AMF et de l’ACPR siègent au **collège** de la H2A.' },
      ],
      pieges: ['Rien d’équivalent côté EC : aucune autorité de marché ne surveille l’expert-comptable.'],
    },
    {
      id: 'chreg', rive: 'ec', nom: 'Chambre régionale de discipline', court: 'Ch. régionale', type: 'Discipline · 1re instance',
      role: 'Auprès de chaque CROEC : juge l’expert-comptable en première instance.',
      x: 36, y: 70, w: 60, d: 44, h: 34, style: 'palais', jumeau: 'sanctions', fiche: '04-ec-responsabilite.md',
      chiffres: ['1 magistrat + 2 élus', 'appel dans le mois', 'appel suspensif'],
      pancartes: [
        { qui: 'La salle d’audience', fait: 'Présidée par un **magistrat de l’ordre judiciaire** (désigné par le **premier président de la cour d’appel**), avec **2 membres élus** du conseil régional. Décision motivée après audience.' },
        { qui: 'Le greffe : qui porte plainte', fait: 'Toute personne ayant **intérêt à agir** : **client**, **tiers**, **conseil régional**, **commissaire du gouvernement**. La plainte est adressée **à la chambre**.' },
        { qui: 'Le cabinet du magistrat chargé des poursuites', fait: 'Il **classe sans suite** (ordonnance susceptible de recours) ou **nomme un rapporteur** qui instruit, puis il prononce un **non-lieu** ou **notifie les griefs** et saisit la chambre. Procédure **contradictoire** : accès au dossier, conseil de son choix.' },
        { qui: 'Le tableau des peines', fait: '1. **Réprimande** · 2. **Blâme** avec inscription au dossier · 3. **Suspension** avec sursis · 4. **Suspension** sans sursis · 5. **Radiation** du tableau. **Pas de sanction pécuniaire** (sauf LCB-FT). L’**avertissement dans le cabinet du président** existe, hors des peines. Un **stagiaire** peut être sanctionné.' },
      ],
      pieges: ['Le commissaire du gouvernement **n’en est pas membre** : il porte plainte et fait appel.', '« Remontrance », « amende », « avertissement » ne figurent **pas** dans la liste des peines de l’EC.', 'Aucune « chambre régionale » n’existe pour le **CAC**.'],
    },
    {
      id: 'chnat', rive: 'ec', nom: 'Chambre nationale de discipline', court: 'Ch. nationale', type: 'Discipline · appel',
      role: 'Auprès du Conseil national : juge en appel les décisions des chambres régionales.',
      x: 36, y: 29, w: 60, d: 44, h: 42, style: 'palais', jumeau: 'sanctions', fiche: '04-ec-responsabilite.md',
      chiffres: ['1 magistrat + 2 fonctionnaires + 2 élus', 'puis Conseil d’État (cassation)'],
      pancartes: [
        { qui: 'La salle d’audience', fait: '**Président** : un magistrat désigné par le **garde des Sceaux** parmi les **présidents de chambre de la cour d’appel de Paris** ; **2 fonctionnaires** désignés par le ministre de l’économie ; **2 membres du Conseil national** élus (ord. art. 50).' },
        { qui: 'Le greffe : qui fait appel', fait: 'Appel dans le **mois** de la notification, **suspensif** : l’intéressé, le **magistrat chargé des poursuites**, le **commissaire du gouvernement**, le conseil régional.' },
        { qui: 'La sortie', fait: 'Contre sa décision : **recours en cassation devant le Conseil d’État**.' },
      ],
      pieges: ['Chez le CAC, **pas d’appel** : la commission des sanctions statue, puis le **Conseil d’État** en **pleine juridiction**.'],
    },
    {
      id: 'sanctions', rive: 'cac', nom: 'Commission des sanctions de la H2A', court: 'Sanctions H2A', type: 'Discipline · juge unique',
      role: 'Séparée du collège qui poursuit : elle juge le CAC et homologue les compositions administratives.',
      x: 60, y: 62, w: 60, d: 46, h: 40, style: 'palais', jumeau: 'chreg', fiche: '22-schema-sanctions-h2a.md',
      chiffres: ['1 magistrat + 4 qualifiés', 'nommés 6 ans, renouvelables 1 fois', 'audience 2 mois après les griefs', 'simplifiée : 15 000 € max', 'prescription 6 ans'],
      pancartes: [
        { qui: 'La salle d’audience', fait: 'Un **magistrat de la Cour de cassation** (président) et **4 personnes qualifiées** : un **ancien CAC**, une en **durabilité**, deux en matière **juridique, économique ou financière** ; nommés par **décret** pour **6 ans**, renouvelables une fois. **Incompatible** avec le collège. Audience **publique**, **2 mois au moins** après la notification des griefs ; le **président de la H2A** soutient les griefs et **propose une sanction** ; le président de la **CRCC** est avisé.' },
        { qui: 'Le bureau du président : procédure simplifiée', fait: 'Manquements **répétés, simples et établis** aux **obligations déclaratives** ou à la **formation continue** : le **président seul, sans débat**, prononce une **sanction pécuniaire** de **15 000 €** au plus ; **opposition** sous **30 jours**, puis audience.' },
        { qui: 'Le guichet des compositions administratives', fait: 'Le **président de la H2A** propose, l’intéressé accepte, le **collège valide**, la commission **homologue**. Toute sanction **sauf la radiation** ; somme plafonnée à **50 000 €** (personne physique) ou **200 000 €** (personne morale).' },
        { qui: 'Le tableau des sanctions', fait: '**Avertissement** · **blâme** · **interdiction temporaire** d’exercer (**3 ans au plus**, sursis possible) · **radiation** · retrait de l’**honorariat** · interdiction de fonctions de direction (3 ans) · **sanction pécuniaire** (**250 000 €** ; société **1 M€** ou la moyenne annuelle des honoraires) · **publication** · inéligibilité (10 ans). Sanctionne aussi les **autres personnes** (associés, dirigeants d’EIP, entité qui recrute un ancien CAC avant 3 ans…).' },
        { qui: 'La sortie', fait: '**Conseil d’État**, recours de **pleine juridiction** : la personne sanctionnée, ou le président de la H2A après accord du collège. **Prescription** : **6 ans**.' },
      ],
      pieges: ['Aucun **expert-comptable**, aucun président de **CRCC** ou de la **CNCC** n’y siège.', '**3 ans** au plus d’interdiction : les **5 ans** sont l’ancien H3C.', 'La **suspension provisoire** (6 mois, collège) n’est **pas** une sanction.', '« Comparution immédiate » : procédure **pénale**, pas disciplinaire.'],
    },
    {
      id: 'ifac', rive: 'commun', nom: 'IFAC', court: 'IFAC', type: 'International',
      role: 'Fédération mondiale des professionnels comptables : le CNOEC et la CNCC en sont membres.',
      x: 12, y: 5, w: 64, d: 34, h: 50, style: 'tour', fiche: '01-ec-exercice.md',
      pancartes: [
        { qui: 'Hall : les membres', fait: 'L’**International Federation of Accountants** fédère les organisations professionnelles du monde entier ; le **Conseil national de l’Ordre** et la **CNCC** en sont **membres**. Elle héberge les conseils normalisateurs des bâtiments voisins (IESBA, IAASB, IAESB).' },
        { qui: 'Recommandation reprise par l’Ordre', fait: 'La norme de formation **IES 7** inspire la recommandation de **120 heures sur 3 ans** (dont 20 par an) donnée par les conseils régionaux ; ce quantum ne figure dans aucun texte français.' },
      ],
      pieges: ['L’IFAC ne rend **aucune norme obligatoire** en France : seules les NP agréées et les NEP homologuées s’imposent.'],
    },
    {
      id: 'iesba', rive: 'commun', nom: 'IESBA', court: 'IESBA', type: 'International',
      role: 'Rédige le Code of Ethics international.',
      x: 30, y: 5, w: 50, d: 34, h: 40, style: 'tour', fiche: '01-ec-exercice.md',
      pancartes: [
        { qui: 'Salle de rédaction', fait: 'L’**International Ethics Standards Board for Accountants** écrit le **Code of Ethics**. Sa typologie des menaces (**intérêt personnel, défense, familiarité, intimidation**) **ne figure ni dans le code de déontologie des CAC ni dans les normes** en vigueur : ne pas la citer comme droit français.' },
      ],
      pieges: ['Le code de déontologie des **EC** est pris par **décret** ; celui des **CAC** est adopté par la **H2A** et homologué par arrêté. Ni l’un ni l’autre n’est le code IESBA.'],
    },
    {
      id: 'iaasb', rive: 'commun', nom: 'IAASB', court: 'IAASB', type: 'International',
      role: 'Rédige les normes ISA, ISRE, ISAE et ISRS, qui inspirent les normes françaises.',
      x: 46, y: 5, w: 54, d: 34, h: 44, style: 'tour', fiche: '01-ec-exercice.md',
      pancartes: [
        { qui: 'Salle de rédaction', fait: 'L’**International Auditing and Assurance Standards Board** rédige les **ISA** (audit), **ISRE 2400** (examen limité), **ISAE 3000/3400** (assurance), **ISRS 4400/4410** (procédures convenues, compilation). Elles **inspirent** les **NP** de l’Ordre et les **NEP** de la H2A, sans s’appliquer directement.' },
      ],
      pieges: ['Une NEP est **adoptée par la H2A** et **homologuée par arrêté** : l’IAASB n’intervient pas dans la chaîne française.'],
    },
    {
      id: 'iaesb', rive: 'commun', nom: 'IAESB', court: 'IAESB', type: 'International',
      role: 'Normes internationales de formation des professionnels comptables.',
      x: 60, y: 5, w: 46, d: 34, h: 34, style: 'tour', fiche: '01-ec-exercice.md',
      pancartes: [
        { qui: 'Salle de rédaction', fait: 'L’**International Accounting Education Standards Board** publie les normes de **formation** (IES), dont **IES 7** sur la formation continue.' },
      ],
      pieges: [],
    },
    {
      id: 'aceu', rive: 'commun', nom: 'Accountancy Europe', court: 'Accountancy Europe', type: 'International',
      role: 'Fédération européenne de la profession (ex-FEE).',
      x: 76, y: 5, w: 60, d: 34, h: 36, style: 'tour', fiche: '01-ec-exercice.md',
      pancartes: [
        { qui: 'Hall', fait: 'Ancienne **FEE** (Fédération des experts-comptables européens) : représentation de la profession auprès des institutions **européennes**. Rôle de représentation, pas de pouvoir normatif en France.' },
      ],
      pieges: [],
    },
    {
      id: 'ue', rive: 'cac', nom: 'Union européenne · CEAOB', court: 'UE · CEAOB', type: 'International',
      role: 'Directives et règlement du contrôle légal ; coopération des superviseurs européens.',
      x: 92, y: 5, w: 56, d: 34, h: 48, style: 'ministere', jumeau: 'terrain', fiche: '05-cac-exercice.md',
      pancartes: [
        { qui: 'Le bureau des textes', fait: '**Directive 2006/43/CE**, modifiée par la **directive 2014/56/UE** : contrôle légal des comptes dans l’UE. **Règlement (UE) 537/2014** : exigences propres aux **EIP** (services interdits, rotation, comité d’audit, revue indépendante).' },
        { qui: 'Le CEAOB', fait: 'Comité des organes européens de supervision de l’audit : la **H2A** y **coopère** avec ses homologues et avec les autorités de pays tiers.' },
      ],
      pieges: ['Ces textes visent le **CAC** ; l’**EC** n’a pas d’équivalent européen contraignant.'],
    },
    {
      id: 'tj', rive: 'commun', nom: 'Tribunal judiciaire ou de commerce', court: 'Trib. judiciaire', type: 'Responsabilité civile',
      role: 'Réparer un préjudice : le client ou le tiers y poursuit l’EC comme le CAC.',
      x: 11, y: 84, w: 60, d: 40, h: 34, style: 'palais', fiche: '21-schema-responsabilites.md',
      chiffres: ['EC : 5 ans, réductible à 1 an', 'CAC : 3 ans, 10 ans pour un crime', 'faute + préjudice + lien'],
      pancartes: [
        { qui: 'Guichet EC', fait: 'Responsabilité **contractuelle** envers le client (C. civ. 1231-1), **délictuelle** envers les tiers (1240-1241). **Obligation de moyens**. Prescription **5 ans** (C. civ. 2224), **réductible par contrat** jusqu’à **1 an** (une clause de 6 ou 10 mois est nulle, 12 mois valable). **Plafonnement** possible, sans effet en cas de faute lourde ou dolosive, ni envers les tiers.' },
        { qui: 'Guichet CAC', fait: 'Responsable envers l’**entité et les tiers** des fautes et négligences dans ses fonctions (ex L.822-17). Prescription **3 ans** à compter du fait, de sa **révélation** s’il a été dissimulé, **10 ans** pour un crime. **Ni plafond ni aménagement** : la mission légale est d’ordre public, même avec l’accord de l’assureur ou du président de la compagnie.' },
        { qui: 'Le bureau des assurances', fait: 'Assurance RC **obligatoire** des deux côtés (contrat collectif de l’**Ordre** ; contrat collectif de la **CNCC**). Jamais couverts : **amendes pénales**, fautes **intentionnelles ou dolosives**, **sanctions pécuniaires de la H2A**. L’EC justifie de son assurance auprès du **CROEC** ; sans assurance continue : **radiation d’office**.' },
      ],
      pieges: ['Le CAC n’est pas civilement responsable des infractions des **dirigeants**, sauf s’il les connaissait et ne les a pas signalées à l’**assemblée**.'],
    },
    {
      id: 'tcorr', rive: 'commun', nom: 'Tribunal correctionnel', court: 'Trib. correctionnel', type: 'Responsabilité pénale',
      role: 'Punir une infraction : texte, acte, intention.',
      x: 29, y: 84, w: 60, d: 40, h: 38, style: 'palais', fiche: '21-schema-responsabilites.md',
      chiffres: ['secret : 1 an, 15 000 €', 'CAC non-révélation : 5 ans, 75 000 €', 'incompatibilité CAC : 6 mois, 7 500 €'],
      pancartes: [
        { qui: 'Box de l’EC', fait: '**Auteur** : violation du **secret** (226-13), **blanchiment**, **faux**, escroquerie, abus de confiance, révélation d’une déclaration de soupçon au client, délit d’initié, participation à l’**exercice illégal**. **Complice** : comptes infidèles, dividendes fictifs, **abus de biens sociaux**, **fraude fiscale**, banqueroute.' },
        { qui: 'Box du CAC', fait: 'Délits **propres** : **informations mensongères** et **non-révélation** de faits délictueux (**5 ans, 75 000 €**), exercice **malgré une incompatibilité** (6 mois, 7 500 €), **usurpation du titre** (1 an, 15 000 €), **secret** (1 an, 15 000 €). Le **délit d’entrave** est commis **contre** lui par les dirigeants. Complicité possible (comptes infidèles, ABS).' },
        { qui: 'Panneau à l’entrée', fait: '« **Négligence grave** », « faute professionnelle », « manquement au devoir de conseil » : **pas des délits**. Cumul possible avec les sanctions de la H2A, sous réserve du **non bis in idem** encadré par le **Conseil constitutionnel**. La « comparution immédiate » est une procédure **pénale**, pas disciplinaire.' },
      ],
      pieges: ['L’**emprisonnement** n’est jamais une sanction disciplinaire.', 'Une amende pénale n’est **jamais couverte** par l’assurance RC.'],
    },
    {
      id: 'parquet', rive: 'commun', nom: 'Procureur de la République', court: 'Procureur', type: 'Ministère public',
      role: 'Le CAC lui révèle les faits délictueux ; l’EC n’y est pas tenu.',
      x: 47, y: 84, w: 54, d: 40, h: 44, style: 'palais', jumeau: 'tracfin', fiche: '17-schema-secret-signalements.md',
      chiffres: ['CAC : révélation obligatoire', 'EC : devoir de conseil, pas de révélation'],
      pancartes: [
        { qui: 'Guichet CAC : la révélation', fait: 'Faits délictueux découverts **à l’occasion de sa mission ou prestation** (L.821-10) : **révéler au procureur**, **même régularisés** (un vol remboursé reste à révéler), même chez une entité dont il n’est pas CAC. Ne pas révéler sciemment : **délit** (5 ans, 75 000 €). La révélation de bonne foi n’engage pas sa responsabilité. Le **délit d’entrave** se révèle aussi.' },
        { qui: 'Guichet EC : porte fermée', fait: '**Pas d’obligation de révélation** : l’EC exerce son **devoir de conseil** (informer, mettre en garde, exiger), **refuse son concours** ou **interrompt** la mission. Le secret n’est pas opposable en cas d’audition en matière pénale ni pour sa propre défense.' },
        { qui: 'Le procureur général (H2A)', fait: 'Le **procureur général** près la cour d’appel compte parmi ceux qui **saisissent le rapporteur général** de la H2A. Le **ministère public** peut aussi demander le **relèvement** d’un CAC.' },
      ],
      pieges: ['Révélation au procureur : **CAC seul**. Déclaration de soupçon à **Tracfin** : **les deux**.'],
    },
    {
      id: 'cass', rive: 'commun', nom: 'Cour de cassation', court: 'Cour de cassation', type: 'Juridiction',
      role: 'Ses magistrats président le collège et la commission des sanctions de la H2A.',
      x: 65, y: 84, w: 56, d: 40, h: 50, style: 'palais', fiche: '22-schema-sanctions-h2a.md',
      pancartes: [
        { qui: 'Le bureau des détachements', fait: 'Un **magistrat de la Cour de cassation** préside le **collège** de la H2A ; un autre (conseiller ou président de chambre) préside la **commission des sanctions**. Chez l’EC, les chambres de discipline sont présidées par un magistrat **judiciaire** (régionale) et un président de chambre de la **cour d’appel de Paris** (nationale).' },
        { qui: 'La jurisprudence', fait: 'La **2e chambre civile** définit la faute **dolosive** (acte délibéré commis avec conscience du caractère inéluctable du dommage), exclue de l’assurance RC comme la faute **intentionnelle**. Les dommages-intérêts pour violation du secret restent couverts ; seule l’amende est exclue.' },
      ],
      pieges: ['Le dernier recours disciplinaire est le **Conseil d’État** (cassation pour l’EC, pleine juridiction pour le CAC), pas la Cour de cassation.'],
    },
    {
      id: 'ccomptes', rive: 'cac', nom: 'Cour des comptes', court: 'Cour des comptes', type: 'Juridiction financière',
      role: 'Avec les chambres régionales des comptes : elle saisit le rapporteur général de la H2A.',
      x: 85, y: 84, w: 56, d: 40, h: 40, style: 'palais', fiche: '22-schema-sanctions-h2a.md',
      pancartes: [
        { qui: 'Le premier président', fait: 'Le **premier président de la Cour des comptes**, ou le président d’une **chambre régionale des comptes**, peut **saisir le rapporteur général** de la H2A, comme le procureur général et les présidents de l’AMF, de l’ACPR, de la H2A, de la CNCC et des CRCC.' },
        { qui: 'Au collège de la H2A', fait: 'Des membres de la **Cour des comptes** siègent au collège, aux côtés du Conseil d’État, de l’AMF, de l’ACPR et du Trésor.' },
      ],
      pieges: ['Rien d’équivalent côté EC : personne ne « saisit un rapporteur général », la plainte va à la **chambre régionale**.'],
    },
    {
      id: 'cavec', rive: 'ec', nom: 'CAVEC', court: 'CAVEC', type: 'Caisse de retraite',
      role: 'Caisse d’assurance vieillesse des experts-comptables et des CAC : ses cotisations comptent pour la radiation d’office.',
      x: 14, y: 95, w: 48, d: 30, h: 26, style: 'tour', fiche: '04-ec-responsabilite.md',
      pancartes: [
        { qui: 'Guichet des cotisations', fait: 'L’EC qui, pendant **2 ans** (consécutifs ou non) sur les **10 dernières années** et sans motif valable, n’a pas payé l’intégralité de ses **cotisations ordinales** ou de ses **cotisations sociales personnelles** (**CAVEC comprise**) est **radié d’office** du tableau par le **conseil régional**. Ce n’est **pas** une sanction disciplinaire.' },
      ],
      pieges: ['Radiation **d’office** (conseil régional) ≠ radiation **disciplinaire** (chambre).'],
    },
    {
      id: 'tracfin', rive: 'commun', nom: 'Tracfin', court: 'Tracfin', type: 'LCB-FT',
      role: 'Reçoit la déclaration de soupçon de l’EC comme du CAC.',
      x: 40, y: 95, w: 60, d: 30, h: 36, style: 'tour', jumeau: 'parquet', fiche: '17-schema-secret-signalements.md',
      chiffres: ['EC : NPLAB', 'CAC : NEP 9605', 'documents conservés 5 ans'],
      pancartes: [
        { qui: 'Guichet des déclarations', fait: '**Déclaration de soupçon**, si possible **avant l’opération**. Chez l’**EC** : par l’EC **en charge de la mission**, personnellement, **sans copie au CROEC** ; le **correspondant Tracfin** du cabinet (pas forcément EC) **ne déclare pas**. Chez le **CAC** : par le **CAC signataire** (NEP 9605). **Interdit** d’en informer le client ou le confrère successeur ; le CAC **ne démissionne pas** pour éviter la déclaration.' },
        { qui: 'Guichet des contrôleurs', fait: 'Blanchiment découvert pendant un contrôle : chez l’**EC**, le contrôleur informe le **comité LBC-FT de l’Ordre**, et **l’Ordre informe Tracfin** ; chez le **CAC**, **les contrôleurs** de la H2A (ou de la CNCC) **informent eux-mêmes Tracfin**. Le secret professionnel ne lui est **pas opposable** (déclaration, droit de communication).' },
        { qui: 'Les autres administrations', fait: 'Secret **non opposable** à l’**administration fiscale** (droit de communication, dans ses limites, EC) et aux autorités de marché (**AMF** ; **ACPR** pour le CAC). **Opposable à la CNIL** selon l’annale 2025-11 (à vérifier). Le client **ne peut pas délier** du secret, d’ordre public.' },
      ],
      pieges: ['Le **correspondant Tracfin** ne déclare pas ; le **déclarant** est l’EC en charge ou le CAC signataire.', 'Vigilance : **deux niveaux** chez l’EC (NPLAB), **trois** chez le CAC (NEP 9605).'],
    },
    {
      id: 'anc', rive: 'cac', nom: 'ANC et CNoCP', court: 'ANC · CNoCP', type: 'Normalisation comptable',
      role: 'L’Autorité des normes comptables et le Conseil de normalisation des comptes publics peuvent demander une NEP.',
      x: 72, y: 95, w: 56, d: 30, h: 32, style: 'tour', fiche: '05-cac-exercice.md',
      pancartes: [
        { qui: 'Guichet des demandes de NEP', fait: 'Peuvent **demander l’élaboration d’une NEP** à la H2A (prises en compte dans son plan d’orientation) : le **garde des Sceaux**, l’**AMF**, l’**ACPR**, l’**Autorité des normes comptables**, le **Conseil de normalisation des comptes publics** et la **CNCC**. **Pas une CRCC.**' },
      ],
      pieges: ['Les normes **comptables** (ANC) ne sont pas les normes d’**exercice professionnel** (NEP, H2A).'],
    },
  ],
  // « Qui fait quoi ? » : une affirmation, toucher le bon bâtiment.
  quiz: [
    { q: 'L’expert-comptable prête serment ici, dans les 6 mois de son inscription.', r: 'croec' },
    { q: 'Le commissaire aux comptes prête serment ici, avant tout exercice.', r: 'ca' },
    { q: 'On y tient la liste des commissaires aux comptes.', r: 'h2a' },
    { q: 'On y tient le tableau des experts-comptables.', r: 'croec' },
    { q: 'Ce ministre agrée par arrêté les normes professionnelles des EC.', r: 'bercy' },
    { q: 'Ce ministre homologue par arrêté les NEP.', r: 'chancellerie' },
    { q: 'Conseil de 60 membres pour 4 ans, tous les présidents régionaux compris.', r: 'cncc' },
    { q: 'Ses membres sont élus au suffrage direct depuis 2020.', r: 'cnoec' },
    { q: 'Un magistrat de la Cour de cassation et 4 personnes qualifiées y jugent le CAC.', r: 'sanctions' },
    { q: 'Un magistrat judiciaire et 2 élus y jugent l’EC en première instance.', r: 'chreg' },
    { q: 'L’appel du dossier disciplinaire d’un expert-comptable se juge ici.', r: 'chnat' },
    { q: 'Le dernier recours du CAC sanctionné : recours de pleine juridiction.', r: 'ce' },
    { q: 'Son président statue sous 15 jours sur une dérogation au barème d’heures.', r: 'crcc' },
    { q: 'Contrôle d’activité des CAC sans mandat d’EIP, par délégation.', r: 'cncc' },
    { q: 'Son président peut demander le relèvement du CAC d’une société cotée.', r: 'amf' },
    { q: 'Recours contre un refus d’inscription sur la liste des CAC.', r: 'ta' },
    { q: 'Chez l’EC, aucune autorité publique indépendante ne supervise la profession.', r: 'terrain' },
    { q: 'Le commissaire du gouvernement représente cette tutelle auprès des conseils de l’Ordre.', r: 'bercy' },
    { q: 'Le suivi de la formation continue des CAC lui est délégué.', r: 'cncc' },
    { q: 'Les sociétés n’y sont ni électrices ni éligibles.', r: 'crcc' },
    { q: 'Son président, seul et sans débat, prononce jusqu’à 15 000 € pour un défaut de formation continue.', r: 'sanctions' },
    { q: 'Le collège de cette tour arrête les griefs et peut suspendre provisoirement un CAC 6 mois.', r: 'h2a' },
    { q: 'Le CNOEC et la CNCC en sont membres.', r: 'ifac' },
    { q: 'On y rédige les ISA et les ISRE, qui inspirent les normes françaises.', r: 'iaasb' },
    { q: 'On y rédige le Code of Ethics international.', r: 'iesba' },
    { q: 'La directive 2006/43 et le règlement 537/2014 sur les EIP viennent d’ici.', r: 'ue' },
    { q: 'Le CAC doit lui révéler les faits délictueux, même régularisés ; l’EC n’y est pas tenu.', r: 'parquet' },
    { q: 'L’EC en charge de la mission, ou le CAC signataire, lui adresse la déclaration de soupçon.', r: 'tracfin' },
    { q: 'Prescription civile : 5 ans pour l’EC, 3 ans pour le CAC, c’est ici qu’on répare le préjudice.', r: 'tj' },
    { q: 'Informations mensongères, non-révélation, exercice malgré une incompatibilité : on y juge ces délits.', r: 'tcorr' },
    { q: 'Ses magistrats président le collège et la commission des sanctions de la H2A.', r: 'cass' },
    { q: 'Son premier président peut saisir le rapporteur général de la H2A.', r: 'ccomptes' },
    { q: 'Deux ans de cotisations impayées sur dix : radiation d’office, et cette caisse est concernée.', r: 'cavec' },
    { q: 'Ces normalisateurs comptables peuvent demander une NEP, contrairement à une CRCC.', r: 'anc' },
  ],
};

export const batiment = (id) => VILLE.batiments.find((b) => b.id === id);

// Feuille de style de la ville (partagée app / page autonome) : couleurs issues des jetons --ec, --cac, --card,
// --line, --text, --muted, --primary de la page hôte.
export const VILLE_CSS = `
.vl { --vl-rx: 58deg; --vl-rz: -28deg; --vl-zoom: 1; --vl-dx: 0px; --vl-dy: 0px; }
.vl-scene { position: relative; height: 420px; overflow: hidden; border-radius: 14px; border: 1px solid var(--line);
  background: linear-gradient(180deg, color-mix(in srgb, var(--primary) 10%, var(--card)) 0%, color-mix(in srgb, var(--primary) 3%, var(--card)) 45%, var(--card) 100%);
  perspective: 1100px; touch-action: none; user-select: none; -webkit-user-select: none; cursor: grab; }
.vl-scene.drag { cursor: grabbing; }
.vl-world { position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform-style: preserve-3d;
  transform: translate(var(--vl-dx, 0px), var(--vl-dy, 0px)) scale(var(--vl-zoom)) rotateX(var(--vl-rx)) rotateZ(var(--vl-rz)); }
.vl-ground { position: absolute; left: -330px; top: -480px; width: 660px; height: 960px; transform-style: preserve-3d;
  background: color-mix(in srgb, var(--muted) 12%, var(--card)); border-radius: 30px; }
.vl-intl { position: absolute; left: 0; right: 0; top: 0; height: 11%; border-radius: 30px 30px 0 0; background: color-mix(in srgb, var(--muted) 22%, var(--card)); }
.vl-zlabel.intl { top: 6px; bottom: auto; left: 14px; color: var(--muted); }
.vl-zone { position: absolute; top: 11%; bottom: 22%; border-radius: 30px; opacity: .55; }
.vl-zone.ec { left: 0; width: 44%; background: color-mix(in srgb, var(--ec) 16%, transparent); }
.vl-zone.cac { right: 0; width: 44%; background: color-mix(in srgb, var(--cac) 16%, transparent); }
.vl-just { position: absolute; left: 0; right: 0; bottom: 0; height: 22%; border-radius: 0 0 30px 30px; background: color-mix(in srgb, var(--muted) 18%, var(--card)); }
.vl-zlabel.just { left: 14px; color: var(--muted); }
.vl-river { position: absolute; left: 45%; width: 10%; top: 11%; bottom: 22%; background: color-mix(in srgb, var(--primary) 28%, var(--card)); border-radius: 40px; }
.vl-road { position: absolute; background: color-mix(in srgb, var(--muted) 30%, var(--card)); }
.vl-zlabel { position: absolute; bottom: 10px; font: 700 13px/1.1 inherit; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.vl-zlabel.ec { left: 14px; bottom: 23%; color: var(--ec); }
.vl-zlabel.cac { right: 14px; bottom: 23%; text-align: right; color: var(--cac); }
.vl-b { position: absolute; transform-style: preserve-3d; cursor: pointer; }
.vl-f { position: absolute; backface-visibility: visible; border: 1px solid rgba(0,0,0,.18); box-sizing: border-box; background: var(--vl-c); }
.vl-f.top { left: 0; top: 0; filter: brightness(1.18); }
.vl-f.n, .vl-f.s { left: 0; transform-origin: top; }
.vl-f.n { top: 0; transform: rotateX(90deg); filter: brightness(.92); }
.vl-f.s { transform: rotateX(90deg); filter: brightness(1.02); }
.vl-f.w, .vl-f.e { top: 0; transform-origin: left; transform: rotateY(-90deg); }
.vl-f.w { left: 0; filter: brightness(.8); }
.vl-f.e { filter: brightness(.88); }
.vl-f.s, .vl-f.e { background-image: repeating-linear-gradient(90deg, transparent 0 9px, rgba(255,255,255,.22) 9px 13px, transparent 13px 18px), repeating-linear-gradient(180deg, transparent 0 8px, rgba(255,255,255,.22) 8px 12px, transparent 12px 16px); }
.vl-b.vide .vl-f { background: transparent; border: 2px dashed color-mix(in srgb, var(--ec) 60%, var(--muted)); }
.vl-b.palais .vl-f.top { background-image: radial-gradient(circle at 50% 50%, rgba(255,255,255,.4) 0 18%, transparent 19%); }
.vl-b.ministere .vl-f.top { background-image: linear-gradient(90deg, transparent 0 48%, rgba(255,255,255,.4) 48% 52%, transparent 52%); }
.vl-b.sel .vl-f { filter: brightness(1.25) saturate(1.3); border-color: var(--text); }
.vl-b.twin .vl-f { outline: 2px dashed var(--text); outline-offset: 2px; }
.vl-b.good .vl-f { background: var(--ok); }
.vl-b.bad .vl-f { background: var(--ko); }
.vl-anchor { position: absolute; left: 0; top: 0; width: 0; height: 0; }
.vl-signs { position: absolute; inset: 0; pointer-events: none; }
.vl-sign { position: absolute; transform: translate(-50%, -100%); pointer-events: auto; cursor: pointer; white-space: nowrap; font: 700 12px/1.2 inherit; padding: 3px 7px;
  background: var(--card); color: var(--text); border: 1px solid var(--line); border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,.18); }
.vl-sign::after { content: ''; position: absolute; left: 50%; bottom: -7px; width: 2px; height: 7px; background: var(--muted); margin-left: -1px; }
.vl-sign.ec { border-color: var(--ec); } .vl-sign.cac { border-color: var(--cac); }
.vl-sign.sel { background: var(--text); color: var(--card); z-index: 1000 !important; }
.vl-sign.twin { outline: 2px dashed var(--text); outline-offset: 1px; }
.vl-sign.good { background: var(--ok); color: #fff; } .vl-sign.bad { background: var(--ko); color: #fff; }
.vl-hud { position: absolute; right: 10px; top: 10px; display: flex; gap: 6px; }
.vl-hud button, .vl-tools button { font: 600 14px/1 inherit; min-height: 34px; min-width: 34px; padding: 6px 8px; border-radius: 10px;
  border: 1px solid var(--line); background: var(--card); color: var(--text); cursor: pointer; }
.vl-hint { position: absolute; left: 12px; bottom: 10px; font-size: 12px; color: var(--muted); pointer-events: none; }
.vl-legend { display: flex; gap: 14px; flex-wrap: wrap; margin: 8px 0 0; font-size: 13px; color: var(--muted); }
.vl-legend i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; vertical-align: -1px; margin-right: 5px; }
.vl-tools { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.vl-tools button.on { background: var(--primary); color: #fff; border-color: var(--primary); }
.vl-panel { margin-top: 12px; }
.vl-pill { display: inline-block; font: 700 11px/1 inherit; letter-spacing: .06em; text-transform: uppercase; padding: 4px 8px; border-radius: 999px; color: #fff; background: var(--muted); }
.vl-pill.ec { background: var(--ec); } .vl-pill.cac { background: var(--cac); }
.vl-panel h2 { margin: 8px 0 2px; font-size: 20px; text-wrap: balance; }
.vl-role { color: var(--muted); font-size: 14px; margin: 0 0 10px; }
.vl-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; }
.vl-chips span { font-size: 12px; font-variant-numeric: tabular-nums; padding: 3px 8px; border-radius: 999px; border: 1px solid var(--line); background: color-mix(in srgb, var(--primary) 7%, var(--card)); }
.vl-floors { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.vl-floor { border: 1px solid var(--line); border-radius: 10px; background: color-mix(in srgb, var(--muted) 6%, var(--card)); }
.vl-floor summary { cursor: pointer; padding: 10px 12px; font-weight: 700; display: flex; gap: 8px; align-items: center; list-style: none; }
.vl-floor summary::-webkit-details-marker { display: none; }
.vl-floor summary::before { content: ''; width: 10px; height: 10px; border-radius: 2px; background: var(--muted); flex-shrink: 0; }
.vl-floor.ec summary::before { background: var(--ec); } .vl-floor.cac summary::before { background: var(--cac); }
.vl-floor[open] summary::before { background: var(--primary); }
.vl-floor div { padding: 0 12px 12px 30px; font-size: 15px; line-height: 1.45; }
.vl-pieges { margin: 12px 0 0; padding: 10px 12px; border-radius: 10px; background: var(--warn-bg, #fef3c7); color: var(--text); font-size: 14px; }
.vl-pieges ul { margin: 4px 0 0; padding-left: 18px; }
.vl-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.vl-quiz { margin-top: 12px; padding: 12px; border-radius: 12px; border: 2px solid var(--primary); }
.vl-quiz .q { font-weight: 700; font-size: 16px; }
.vl-quiz .fb { margin-top: 8px; font-size: 14px; }
.vl-quiz .fb.ok { color: var(--ok); } .vl-quiz .fb.ko { color: var(--ko); }
@media (max-width: 480px) { .vl-scene { height: 400px; } .vl-sign { font-size: 10.5px; padding: 2px 5px; } }
`;

const mdInline = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const GROUND = { w: 660, h: 960 };
const COLORS = { ec: 'var(--ec)', cac: 'var(--cac)', commun: 'var(--muted)' };

// Monte la ville dans `root`. opts.onFiche(file) : ouvrir la fiche source (facultatif) ; opts.fiches : titres par fichier.
export function renderVille(root, opts = {}) {
  const S = { sel: null, quiz: null, rx: 58, rz: -28, zoom: 1, fit: 1, dx: 0, dy: 0 };
  root.classList.add('vl');
  root.innerHTML = `
    <div class="vl-scene" id="vl-scene">
      <div class="vl-world" id="vl-world"><div class="vl-ground" id="vl-ground">
        <div class="vl-zone ec"></div><div class="vl-zone cac"></div><div class="vl-river"></div>
        <div class="vl-intl"></div><div class="vl-just"></div><div class="vl-road" style="left:0;right:0;top:11%;height:14px"></div><div class="vl-road" style="left:0;right:0;top:28%;height:14px"></div><div class="vl-road" style="left:0;right:0;top:50%;height:14px"></div><div class="vl-road" style="left:0;right:0;top:78%;height:14px"></div><div class="vl-zlabel intl">Quartier international</div><div class="vl-zlabel just">Quartier judiciaire et autres autorités</div>
        <div class="vl-zlabel ec">Rive EC · l’Ordre</div><div class="vl-zlabel cac">Rive CAC · H2A et Compagnie</div>
      </div></div>
      <div class="vl-signs" id="vl-signs"></div>
      <div class="vl-hud"><button type="button" data-vl="rot-" aria-label="Tourner à gauche">↶</button><button type="button" data-vl="rot+" aria-label="Tourner à droite">↷</button><button type="button" data-vl="zoom-" aria-label="Réduire">−</button><button type="button" data-vl="zoom+" aria-label="Agrandir">+</button><button type="button" data-vl="reset" aria-label="Vue de départ">⟲</button></div>
      <div class="vl-hint">Glisser pour déplacer · toucher un bâtiment</div>
    </div>
    <div class="vl-legend"><span><i style="background:var(--ec)"></i>Expert-comptable</span><span><i style="background:var(--cac)"></i>Commissaire aux comptes</span><span><i style="background:var(--muted)"></i>Commun</span><span><i style="border:2px dashed var(--ec);background:none"></i>Rien ne s’y trouve</span></div>
    <div class="vl-tools"><button type="button" data-vl="quiz">Qui fait quoi ? (jeu)</button><button type="button" data-vl="tour">Visite guidée</button></div>
    <div class="vl-panel card" id="vl-panel"></div>`;
  const scene = root.querySelector('#vl-scene'), signs = root.querySelector('#vl-signs'), world = root.querySelector('#vl-world'), ground = root.querySelector('#vl-ground'), panel = root.querySelector('#vl-panel');

  for (const b of VILLE.batiments) {
    const el = document.createElement('div');
    el.className = `vl-b ${b.rive} ${b.style}`; el.dataset.id = b.id;
    el.style.cssText = `left:${b.x / 100 * GROUND.w - b.w / 2}px;top:${b.y / 100 * GROUND.h - b.d / 2}px;width:${b.w}px;height:${b.d}px;--vl-c:${COLORS[b.rive]}`;
    el.innerHTML = `<div class="vl-f top" style="width:${b.w}px;height:${b.d}px;transform:translateZ(${b.h}px)"></div>
      <div class="vl-f n" style="width:${b.w}px;height:${b.h}px"></div><div class="vl-f s" style="top:${b.d}px;width:${b.w}px;height:${b.h}px"></div>
      <div class="vl-f w" style="width:${b.h}px;height:${b.d}px"></div><div class="vl-f e" style="left:${b.w}px;width:${b.h}px;height:${b.d}px"></div>
      <div class="vl-anchor" style="transform:translate3d(${b.w / 2}px,${b.d / 2}px,${b.h}px)"></div>`;
    el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('aria-label', b.nom);
    ground.appendChild(el);
    const sign = document.createElement('button'); sign.type = 'button'; sign.className = `vl-sign ${b.rive}`; sign.dataset.id = b.id; sign.innerHTML = mdInline(b.court);
    signs.appendChild(sign);
  }
  // Pancartes : projection 2D du sommet de chaque bâtiment (position écran de l'ancre), toujours lisibles.
  const place = () => {
    const sr = scene.getBoundingClientRect();
    for (const sign of signs.children) {
      const a = ground.querySelector(`.vl-b[data-id="${sign.dataset.id}"] .vl-anchor`).getBoundingClientRect();
      sign.style.left = `${a.left - sr.left}px`; sign.style.top = `${a.top - sr.top - 6}px`; sign.style.zIndex = String(Math.round(a.top));
    }
  };

  const apply = () => {
    root.style.setProperty('--vl-rx', `${S.rx}deg`); root.style.setProperty('--vl-rz', `${S.rz}deg`); root.style.setProperty('--vl-zoom', S.zoom * S.fit);
    root.style.setProperty('--vl-dx', `${S.dx}px`); root.style.setProperty('--vl-dy', `${S.dy}px`); place();
  };
  // La ville entière tient dans la scène, centrée, quelle que soit la largeur : le sol est mesuré à l'échelle 1
  // dans l'orientation de départ, puis réduit et recentré.
  const fit = () => {
    const rx = S.rx, rz = S.rz; S.rx = 58; S.rz = -28; S.fit = 1; S.zoom = 1; S.dx = 0; S.dy = 0; apply();
    const g = ground.getBoundingClientRect(), sc = scene.getBoundingClientRect(), w = world.getBoundingClientRect();
    const f = Math.max(.5, Math.min(1, (sc.width - 16) / g.width, (sc.height - 60) / g.height));
    S.fit = f;
    S.dx = (sc.left + sc.width / 2) - w.left - f * (g.left + g.width / 2 - w.left);
    S.dy = (sc.top + sc.height / 2 + 14) - w.top - f * (g.top + g.height / 2 - w.top);
    S.rx = rx; S.rz = rz; apply();
    // Second passage : recentrage exact à l'échelle retenue (la perspective déforme le sol).
    const g2 = ground.getBoundingClientRect();
    S.dx += (sc.left + sc.width / 2) - (g2.left + g2.width / 2); S.dy += (sc.top + sc.height / 2) - (g2.top + g2.height / 2); apply();
  };
  fit(); if (window.ResizeObserver) new ResizeObserver(() => fit()).observe(scene);

  // Glisser déplace la ville (carte) ; la rotation se fait avec les boutons ; un déplacement de moins de 6 px est un toucher.
  let drag = null;
  scene.addEventListener('pointerdown', (e) => { if (e.target.closest('.vl-hud')) return; drag = { x: e.clientX, y: e.clientY, dx: S.dx, dy: S.dy, moved: false, id: e.pointerId, target: e.target.closest?.('.vl-b, .vl-sign') }; scene.setPointerCapture?.(e.pointerId); });
  scene.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) { drag.moved = true; scene.classList.add('drag'); }
    if (!drag.moved) return;
    S.dx = drag.dx + dx; S.dy = drag.dy + dy; apply();
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { moved, target } = drag; drag = null; scene.classList.remove('drag');
    if (!moved && target) choose(target.dataset.id);
  };
  scene.addEventListener('pointerup', endDrag); scene.addEventListener('pointercancel', endDrag);
  scene.addEventListener('wheel', (e) => { e.preventDefault(); S.zoom = Math.max(.6, Math.min(2, S.zoom * (e.deltaY < 0 ? 1.1 : .9))); apply(); }, { passive: false });
  scene.addEventListener('keydown', (e) => { const b = e.target.closest?.('.vl-b, .vl-sign'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); choose(b.dataset.id); } });

  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-vl]'); if (!t) return;
    const a = t.dataset.vl;
    if (a === 'zoom+') { S.zoom = Math.min(2, S.zoom * 1.15); apply(); }
    else if (a === 'zoom-') { S.zoom = Math.max(.6, S.zoom / 1.15); apply(); }
    else if (a === 'reset') { S.rx = 58; S.rz = -28; fit(); }
    else if (a === 'rot-') { S.rz -= 15; apply(); }
    else if (a === 'rot+') { S.rz += 15; apply(); }
    else if (a === 'quiz') startQuiz();
    else if (a === 'tour') { S.tour = 0; choose(TOUR[0]); }
    else if (a === 'next-tour') { S.tour = (S.tour ?? -1) + 1; if (S.tour < TOUR.length) choose(TOUR[S.tour]); else { S.tour = null; choose(S.sel); } }
    else if (a === 'go') choose(t.dataset.id);
    else if (a === 'fiche') opts.onFiche?.(t.dataset.file);
    else if (a === 'stop-quiz') { S.quiz = null; mark(); showPanel(); }
    else if (a === 'next-q') nextQ();
  });

  const TOUR = ['bercy', 'chancellerie', 'cnoec', 'cncc', 'croec', 'crcc', 'chreg', 'chnat', 'terrain', 'h2a', 'sanctions', 'ce', 'ca', 'ta', 'amf', 'anc', 'ccomptes', 'parquet', 'tracfin', 'tj', 'tcorr', 'cass', 'cavec', 'ue', 'ifac', 'iesba', 'iaasb'];

  function mark() {
    const twin = S.sel && batiment(S.sel).jumeau;
    root.querySelectorAll('.vl-b, .vl-sign').forEach((el) => { el.classList.toggle('sel', el.dataset.id === S.sel); el.classList.toggle('twin', !S.quiz && el.dataset.id === twin); el.classList.remove('good', 'bad'); });
  }
  function choose(id) {
    if (S.quiz) return answer(id);
    S.sel = id; mark(); showPanel();
  }
  function showPanel() {
    const b = S.sel && batiment(S.sel);
    if (!b) { panel.innerHTML = `<p class="vl-role" style="margin:0">Touchez un bâtiment : ses pancartes disent qui s’y trouve et ce qu’il y fait. Les bâtiments jumeaux (pointillés) montrent l’équivalent de l’autre profession. La rive gauche est celle de l’expert-comptable, la rive droite celle du commissaire aux comptes.</p>`; return; }
    const twin = b.jumeau && batiment(b.jumeau);
    const ficheTitle = opts.fiches?.[b.fiche];
    panel.innerHTML = `<span class="vl-pill ${b.rive}">${VILLE.rives[b.rive]} · ${mdInline(b.type)}</span>
      <h2>${mdInline(b.nom)}</h2><p class="vl-role">${mdInline(b.role)}</p>
      ${b.chiffres?.length ? `<div class="vl-chips">${b.chiffres.map((c) => `<span>${mdInline(c)}</span>`).join('')}</div>` : ''}
      <ul class="vl-floors">${b.pancartes.map((p, i) => `<li><details class="vl-floor ${b.rive}"${i === 0 ? ' open' : ''}><summary>${mdInline(p.qui)}</summary><div>${mdInline(p.fait)}</div></details></li>`).join('')}</ul>
      ${b.pieges?.length ? `<div class="vl-pieges"><strong>À ne pas confondre</strong><ul>${b.pieges.map((p) => `<li>${mdInline(p)}</li>`).join('')}</ul></div>` : ''}
      <div class="vl-actions">${twin ? `<button type="button" class="btn sm" data-vl="go" data-id="${twin.id}">⇄ Jumeau : ${mdInline(twin.court)}</button>` : ''}
      ${b.fiche && opts.onFiche ? `<button type="button" class="btn sm" data-vl="fiche" data-file="${b.fiche}">Fiche : ${mdInline(ficheTitle || b.fiche)}</button>` : ''}
      ${S.tour != null ? `<button type="button" class="btn sm primary" data-vl="next-tour">${S.tour + 1 < TOUR.length ? `Suite de la visite (${S.tour + 1}/${TOUR.length}) ›` : 'Fin de la visite'}</button>` : ''}</div>`;
    panel.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }

  // Jeu : toucher le bâtiment qui correspond à l'affirmation.
  function startQuiz() {
    const order = VILLE.quiz.map((q, i) => ({ q, k: Math.random() + i / 1e6 })).sort((a, b) => a.k - b.k).map((x) => x.q);
    S.quiz = { order, i: 0, score: 0, answered: null }; S.sel = null; S.tour = null; mark(); showQ();
  }
  function showQ() {
    const Q = S.quiz, item = Q.order[Q.i];
    panel.innerHTML = `<div class="vl-quiz"><div class="vl-role" style="margin:0 0 4px">Question ${Q.i + 1} / ${Q.order.length} · ${Q.score} bonne${Q.score > 1 ? 's' : ''}</div><div class="q">${mdInline(item.q)}</div>
      <div class="vl-role" style="margin:6px 0 0">Touchez le bon bâtiment dans la ville.</div><div class="fb" id="vl-fb"></div>
      <div class="vl-actions"><button type="button" class="btn sm" data-vl="stop-quiz">Arrêter</button></div></div>`;
  }
  function answer(id) {
    const Q = S.quiz; if (Q.answered) return;
    const item = Q.order[Q.i], ok = id === item.r; Q.answered = id; if (ok) Q.score++;
    root.querySelectorAll('.vl-b, .vl-sign').forEach((el) => { el.classList.toggle('good', el.dataset.id === item.r); el.classList.toggle('bad', !ok && el.dataset.id === id); });
    const fb = panel.querySelector('#vl-fb'), r = batiment(item.r);
    fb.className = `fb ${ok ? 'ok' : 'ko'}`;
    fb.innerHTML = `${ok ? 'Oui : ' : `Non, c’était ${mdInline(r.court)} : `}${mdInline(r.pancartes[0].qui)}. <div class="vl-actions"><button type="button" class="btn sm primary" data-vl="next-q">${Q.i + 1 < Q.order.length ? 'Question suivante ›' : 'Voir le score'}</button><button type="button" class="btn sm" data-vl="go-detail" data-id="${r.id}"></button></div>`;
    fb.querySelector('[data-vl="go-detail"]').remove();
    opts.onAnswer?.(ok, item);
  }
  function nextQ() {
    const Q = S.quiz; Q.answered = null; Q.i++;
    if (Q.i >= Q.order.length) {
      const s = Q.score, n = Q.order.length; S.quiz = null; mark();
      panel.innerHTML = `<div class="vl-quiz"><div class="q">${s} / ${n}</div><div class="vl-role">${s === n ? 'Tout est à sa place.' : s >= n * .7 ? 'Bien : relisez les pancartes des bâtiments manqués.' : 'Faites la visite guidée, puis rejouez.'}</div><div class="vl-actions"><button type="button" class="btn sm primary" data-vl="quiz">Rejouer</button><button type="button" class="btn sm" data-vl="tour">Visite guidée</button></div></div>`;
      opts.onQuizEnd?.(s, n);
      return;
    }
    mark(); showQ();
  }

  showPanel();
  return { choose, state: S };
}
