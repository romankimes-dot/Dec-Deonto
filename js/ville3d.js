// La ville des institutions, version « palais mental » : une ville en rues (une rue par niveau de l'organisation,
// le fleuve entre la rive EC et la rive CAC), de petits bâtiments marqués d'un symbole sur la façade, un véhicule
// que l'on conduit (ou qu'un pilote automatique mène par les rues), une minicarte et une grande carte, une liste
// « Aller à » rangée par profession. On entre dans chaque bâtiment et on y marche parmi les gens qui le composent
// (magistrats, élus, fonctionnaires, personnalités qualifiées) : chacun dit qui il est et ce qu'il fait.
// Rendu WebGL avec three.js, passé en paramètre (js/vendor/three.module.min.js dans l'app, inclus dans la page
// autonome). Les données de disposition (rues, emplacements, symboles) sont pures : js/villeplan.js les reprend
// pour les plans imprimables.

import { VILLE, batiment } from './ville.js';

// `approx` : nombre de figurants choisi pour la mise en scène, sans valeur à retenir (jamais affiché).
// Couleurs des personnages, par rôle.
const ROLE = {
  magistrat: '#b91c1c', elu_ec: '#0e7490', elu_cac: '#7c3aed', fonctionnaire: '#64748b', qualifie: '#d97706',
  ancien_cac: '#a78bfa', durabilite: '#15803d', ministre: '#1e40af', gouvernement: '#334155', agent: '#0891b2', eip: '#5b21b6', pro: '#0f766e',
};

// Qui siège dans chaque bâtiment : groupes de personnes (n sièges), disposées autour d'une table ou en rangs.
// `fait` est ce que dit la personne quand on s'approche. Les pancartes du bâtiment deviennent des guichets le long du mur.
export const groupLabel = (g) => `${g.label}${g.n > 1 && !g.approx ? ` ×${g.n}` : ''}`;
export const SALLES = {
  cnoec: { layout: 'table', groupes: [
    { n: 1, label: 'Président', role: 'elu_ec', qui: 'Le président du Conseil national', fait: 'Élu par le conseil. Le Conseil national **représente la profession** auprès des pouvoirs publics, **élabore les normes** (agréées par arrêté du ministre) et le **code de déontologie** (adopté par décret), organise la **formation** et **coordonne les CROEC**.' },
    { approx: true, n: 6, label: 'Présidents des CROEC', role: 'elu_ec', qui: 'Un président de conseil régional', fait: 'Les **présidents des conseils régionaux** sont membres **de droit** du Conseil national (ord. art. 33).' },
    { approx: true, n: 14, label: 'Élus', role: 'elu_ec', qui: 'Un membre élu du Conseil national', fait: 'Élu **au suffrage direct** par les experts-comptables **depuis 2020** (avant : par les conseils régionaux), pour **4 ans**. L’effectif du conseil n’est pas au programme : retenir le mode d’élection et la durée.' },
    { n: 1, label: 'Commissaire du gouvernement', role: 'gouvernement', debout: true, qui: 'Le commissaire du gouvernement', fait: 'Représente le **ministre chargé de l’économie**. Il **assiste aux séances** sans être membre, **reçoit les décisions** et peut les contester. Il peut saisir le **comité national du tableau** contre une **inscription** (contre un refus, c’est l’intéressé), porter plainte et faire appel en discipline.' },
  ] },
  croec: { layout: 'table', groupes: [
    { n: 1, label: 'Président du CROEC', role: 'elu_ec', qui: 'Le président du conseil régional', fait: '**4 années consécutives au plus**, puis **2 ans** d’interruption. **Conciliateur** (accord amiable) ou **arbitre** (sentence) ; désigne le **remplaçant provisoire** d’un confrère décédé ou empêché ; **conclut** chaque contrôle de qualité au vu du rapport.' },
    { approx: true, n: 10, label: 'Élus', role: 'elu_ec', qui: 'Un membre élu du conseil régional', fait: 'Élu pour **4 ans** ; le **bureau** est élu pour **2 ans**. Le conseil **tient le tableau**, statue sur les **inscriptions**, appelle les **cotisations**, organise le **contrôle de qualité**, reçoit le **serment** (dans les **6 mois** de l’inscription).' },
    { n: 1, label: 'Commissaire du gouvernement', role: 'gouvernement', debout: true, qui: 'Le commissaire du gouvernement', fait: 'Placé auprès de **chaque CROEC** comme auprès du Conseil national : assiste aux séances, reçoit les décisions ; recours devant le **comité national du tableau** contre une **inscription** ; contre un **refus**, c’est l’intéressé qui le saisit.' },
    { approx: true, n: 2, label: 'Contrôleurs qualité', role: 'pro', debout: true, qui: 'Un contrôleur de qualité', fait: 'Expert-comptable **désigné 3 ans** renouvelables par le conseil régional, **50 heures par an** au moins. Il rédige le rapport ; le **président** conclut : sans observation, simples observations, ou observations **et nouveau contrôle à un an**.' },
  ] },
  chreg: { layout: 'tribunal', groupes: [
    { n: 1, label: 'Magistrat président', role: 'magistrat', qui: 'Le président de la chambre régionale', fait: 'Un **magistrat de l’ordre judiciaire**, désigné par le **premier président de la cour d’appel**. Peines possibles : **réprimande, blâme, suspension** (avec ou sans sursis), **radiation**. Pas de sanction pécuniaire hors LCB-FT.' },
    { n: 2, label: 'Membre élu', role: 'elu_ec', qui: 'Un membre élu du conseil régional', fait: '**2 membres** du conseil régional siègent avec le magistrat : c’est la **première instance** disciplinaire de l’expert-comptable, y compris du **stagiaire**.' },
    { n: 1, label: 'Magistrat chargé des poursuites', role: 'magistrat', debout: true, qui: 'Le magistrat chargé des poursuites', fait: 'Reçoit la **plainte** (client, tiers, conseil régional, commissaire du gouvernement), la **classe** ou nomme un **rapporteur**, puis **notifie les griefs** et saisit la chambre. Il peut **faire appel**.' },
    { n: 1, label: 'Rapporteur', role: 'pro', debout: true, qui: 'Le rapporteur', fait: 'Nommé par le magistrat chargé des poursuites, il **instruit** l’affaire de façon **contradictoire** : accès au dossier, conseil de son choix.' },
  ] },
  chnat: { layout: 'tribunal', groupes: [
    { n: 1, label: 'Président (cour d’appel de Paris)', role: 'magistrat', qui: 'Le président de la chambre nationale', fait: 'Magistrat désigné par le **garde des Sceaux** parmi les **présidents de chambre de la cour d’appel de Paris**. La chambre juge en **appel** (dans le **mois**, **suspensif**) ; ensuite, **cassation devant le Conseil d’État**.' },
    { n: 2, label: 'Fonctionnaire', role: 'fonctionnaire', qui: 'Un fonctionnaire', fait: '**2 fonctionnaires** désignés par le **ministre chargé de l’économie**.' },
    { n: 2, label: 'Membre du Conseil national', role: 'elu_ec', qui: 'Un membre élu du Conseil national', fait: '**2 membres du Conseil national** élus (ord. art. 50). Chez le CAC, rien de tel : pas d’appel, la commission des sanctions puis le Conseil d’État.' },
  ] },
  cncc: { layout: 'rangs', groupes: [
    { n: 1, label: 'Président de la CNCC', role: 'elu_cac', qui: 'Le président de la CNCC', fait: 'Élu par le Conseil national, qui élit aussi le **bureau**. Il peut **saisir le rapporteur général** de la H2A et reçoit sous **10 jours** le recours contre une décision d’un président de CRCC sur le **barème d’heures**.' },
    { n: 17, label: 'Président de CRCC', role: 'pro', qui: 'Un président de compagnie régionale', fait: '**Tous les présidents de CRCC** (17 depuis le 1er novembre 2020) siègent de droit au Conseil national, comptés dans les **30 sièges** du collège de leur catégorie.' },
    { n: 42, label: 'CAC élu', role: 'elu_cac', qui: 'Un CAC élu au Conseil national', fait: 'Deux collèges de **30 sièges** chacun, présidents de CRCC compris : **CAC d’EIP** et **CAC sans mandat d’EIP**. Chaque collège élit 30 CAC moins le nombre de présidents de CRCC de sa catégorie. **60 membres** en tout, pour **4 ans**.' },
  ] },
  crcc: { layout: 'table', groupes: [
    { n: 1, label: 'Président de la CRCC', role: 'elu_cac', qui: 'Le président de la compagnie régionale', fait: 'Exerce au moins **une mission de certification**. Statue sous **15 jours** sur les **dérogations au barème**, **concilie** co-commissaires et litiges d’**honoraires** (**3 mois**), peut **saisir le rapporteur général**, est **avisé** des audiences de la commission des sanctions.' },
    { approx: true, n: 21, label: 'Élus (22 au plus avec le président)', role: 'elu_cac', qui: 'Un membre élu du conseil régional', fait: '**22 membres au plus** (compagnie d’au moins 900 membres). Électeurs et éligibles : **personnes physiques à jour de cotisations**, exerçant au **30 juin** ; les **sociétés** ne sont **ni électrices ni éligibles**.' },
  ] },
  h2a: { layout: 'table', groupes: [
    { n: 1, label: 'Président (Cour de cassation)', role: 'magistrat', qui: 'Le président de la H2A', fait: '**Magistrat de la Cour de cassation**. Le collège **poursuit** : il **arrête les griefs**, que le président **notifie** ; il soutient les griefs à l’audience et **propose une sanction** ; il peut proposer une **composition administrative**.' },
    { approx: true, n: 5, label: 'CE · Cour des comptes · AMF · ACPR · Trésor', role: 'fonctionnaire', qui: 'Un membre venu du Conseil d’État, de la Cour des comptes, de l’AMF, de l’ACPR ou du Trésor', fait: 'Le collège est composé de **non-praticiens majoritaires**. En urgence, sa formation plénière peut **suspendre provisoirement** un CAC **6 mois au plus** (pas une sanction).' },
    { approx: true, n: 2, label: 'Personnalités qualifiées', role: 'qualifie', qui: 'Une personnalité qualifiée', fait: 'Le collège adopte aussi les **NEP** et les **normes** de déontologie (homologuées par arrêté du garde des Sceaux ; le code de déontologie, lui, est un décret) et délègue à la CNCC les contrôles des **non-EIP** et le **suivi de la formation**.' },
    { n: 2, label: 'Ancien CAC', role: 'ancien_cac', qui: 'Un ancien commissaire aux comptes', fait: '**2 anciens CAC** siègent au collège. Nul ne siège **à la fois** au collège et à la commission des sanctions.' },
    { n: 1, label: 'Rapporteur général', role: 'agent', debout: true, qui: 'Le rapporteur général', fait: 'Dirige le **service des enquêtes**. Saisi par la Cour des comptes, le procureur général, les présidents de l’AMF, de l’ACPR, de la H2A, de la CNCC ou d’une CRCC ; **autosaisine** sur signalement ; **pas le garde des Sceaux**. Secret **non opposable**.' },
    { approx: true, n: 2, label: 'Contrôleurs', role: 'agent', debout: true, qui: 'Un contrôleur de la H2A', fait: '**Salarié de la H2A**, il contrôle les CAC d’**EIP** ; les non-EIP sont contrôlés par la **CNCC par délégation**. Un soupçon de blanchiment en contrôle : il informe **lui-même Tracfin**.' },
  ] },
  sanctions: { layout: 'tribunal', groupes: [
    { n: 1, label: 'Président (Cour de cassation)', role: 'magistrat', qui: 'Le président de la commission des sanctions', fait: '**Magistrat de la Cour de cassation**. Seul et **sans débat**, il prononce en **procédure simplifiée** une sanction pécuniaire de **15 000 €** au plus (obligations déclaratives, formation continue) ; **opposition** sous 30 jours.' },
    { n: 1, label: 'Ancien CAC', role: 'ancien_cac', qui: 'La personne ayant exercé la profession de CAC', fait: 'Une des **4 personnes qualifiées**. Membres nommés par **décret** pour **6 ans**, renouvelables une fois. Aucun EC, aucun président de CRCC ni de la CNCC ne siège ici.' },
    { n: 1, label: 'Durabilité', role: 'durabilite', qui: 'La personne qualifiée en durabilité', fait: 'La commission sanctionne aussi les **auditeurs de durabilité**. Audience **publique**, **2 mois au moins** après les griefs ; décision **motivée et publiée** ; recours de **pleine juridiction** devant le **Conseil d’État**.' },
    { n: 2, label: 'Juridique · économique · financier', role: 'qualifie', qui: 'Une personne qualifiée en matière juridique, économique ou financière', fait: 'Échelle : **avertissement, blâme, interdiction temporaire (3 ans au plus), radiation**, retrait de l’honorariat, **sanction pécuniaire** (250 000 € ; société 1 M€ ou la moyenne des honoraires), publication. **Prescription 6 ans.**' },
  ] },
  bercy: { layout: 'bureau', groupes: [
    { n: 1, label: 'Ministre de l’Économie', role: 'ministre', qui: 'Le ministre chargé de l’économie', fait: '**Tutelle** de l’Ordre. **Agrée** par **arrêté** les normes professionnelles ; le code de déontologie des EC est adopté par **décret**. Il désigne les **2 fonctionnaires** de la chambre nationale de discipline.' },
    { n: 1, label: 'Commissaire du gouvernement', role: 'gouvernement', debout: true, qui: 'Le commissaire du gouvernement', fait: 'Il part d’ici assister aux séances du **Conseil national** et de **chaque CROEC**. Recours au **comité national du tableau**, plainte et appel en discipline ; **jamais membre** des chambres.' },
  ] },
  chancellerie: { layout: 'bureau', groupes: [
    { n: 1, label: 'Garde des Sceaux', role: 'ministre', qui: 'Le garde des Sceaux', fait: 'La **CNCC** est placée auprès de lui. Il **homologue par arrêté** les **NEP** adoptées par la H2A ; peut **demander une NEP** ; **ne saisit pas** le rapporteur général ; désigne le président de la **chambre nationale** de discipline des EC.' },
  ] },
  ce: { layout: 'tribunal', groupes: [
    { approx: true, n: 3, label: 'Conseillers d’État', role: 'magistrat', qui: 'Un conseiller d’État', fait: 'Pour l’**EC** : **cassation** contre la chambre nationale de discipline. Pour le **CAC** : **recours de pleine juridiction** contre la commission des sanctions, par la personne sanctionnée ou le président de la H2A après accord du collège.' },
  ] },
  ca: { layout: 'tribunal', groupes: [
    { n: 1, label: 'Premier président', role: 'magistrat', qui: 'Le premier président de la cour d’appel', fait: 'Reçoit le **serment du CAC**, **avant tout exercice**. Désigne le **magistrat qui préside la chambre régionale** de discipline des EC. Les CRCC sont établies dans le **ressort des cours d’appel**.' },
  ] },
  ta: { layout: 'tribunal', groupes: [{ n: 1, label: 'Juge administratif', role: 'magistrat', qui: 'Le juge administratif', fait: 'Recours contre l’**inscription** ou le **refus d’inscription** sur la **liste** des CAC, tenue par la H2A. Chez l’EC : comité national du tableau, saisi par le commissaire du gouvernement contre une inscription, par l’intéressé contre un refus.' }] },
  amf: { layout: 'bureau', groupes: [
    { n: 1, label: 'Président de l’AMF', role: 'fonctionnaire', qui: 'Le président de l’AMF', fait: 'Peut **demander une NEP**, **saisir le rapporteur général** de la H2A, **demander le relèvement** d’un CAC d’une société cotée. Le **secret** du CAC lui est **levé**.' },
    { n: 1, label: 'ACPR', role: 'fonctionnaire', qui: 'Un représentant de l’ACPR', fait: 'Même rôle pour les **banques** et les **assurances**. Des membres de l’AMF et de l’ACPR siègent au **collège** de la H2A.' },
  ] },
  terrain: { layout: 'bureau', groupes: [{ n: 1, label: 'Gardien du terrain', role: 'pro', debout: true, qui: 'Le gardien du terrain vague', fait: 'Personne ne construira ici : chez l’**EC**, **aucune autorité publique indépendante** ne supervise la profession. C’est **l’Ordre** qui contrôle (CROEC) et juge (chambres) ; la tutelle passe par le **commissaire du gouvernement**.' }] },
  tj: { layout: 'tribunal', groupes: [{ n: 1, label: 'Juge civil', role: 'magistrat', qui: 'Le juge du tribunal judiciaire ou de commerce', fait: 'Répare le **préjudice** : faute, préjudice, lien de causalité. **EC** : 5 ans, réductible à 1 an, plafonnement possible. **CAC** : **3 ans** (révélation si dissimulé, 10 ans pour un crime), **ni plafond ni aménagement**.' }] },
  tcorr: { layout: 'tribunal', groupes: [{ n: 1, label: 'Juge correctionnel', role: 'magistrat', qui: 'Le juge correctionnel', fait: 'Punit une **infraction** : texte, acte, intention. CAC : **informations mensongères**, **non-révélation** (5 ans, 75 000 €), incompatibilité, usurpation du titre. EC : secret, blanchiment, faux, complicité de fraude fiscale ou d’ABS.' }] },
  parquet: { layout: 'bureau', groupes: [{ n: 1, label: 'Procureur', role: 'magistrat', qui: 'Le procureur de la République', fait: 'Le **CAC** lui **révèle les faits délictueux**, même régularisés ; omettre sciemment est un **délit**. L’**EC** n’y est **pas tenu** : devoir de conseil, refus, interruption. Le **procureur général** peut saisir le rapporteur général de la H2A.' }] },
  cass: { layout: 'tribunal', groupes: [{ approx: true, n: 2, label: 'Magistrats de la Cour de cassation', role: 'magistrat', qui: 'Un magistrat de la Cour de cassation', fait: 'Deux d’entre eux **président** le **collège** et la **commission des sanctions** de la H2A. La 2e chambre civile définit la faute **dolosive**, exclue de l’assurance RC.' }] },
  ccomptes: { layout: 'tribunal', groupes: [{ n: 1, label: 'Premier président', role: 'magistrat', qui: 'Le premier président de la Cour des comptes', fait: 'Peut **saisir le rapporteur général** de la H2A, comme le président d’une **chambre régionale des comptes**. Des membres de la Cour siègent au **collège** de la H2A.' }] },
  tracfin: { layout: 'bureau', groupes: [{ approx: true, n: 2, label: 'Agents Tracfin', role: 'agent', qui: 'Un agent de Tracfin', fait: 'Reçoit la **déclaration de soupçon** : de l’**EC en charge de la mission** (pas le correspondant Tracfin, pas de copie au CROEC) ou du **CAC signataire** (NEP 9605). En contrôle : l’**Ordre** informe Tracfin chez l’EC ; les **contrôleurs eux-mêmes** chez le CAC.' }] },
  cavec: { layout: 'bureau', groupes: [{ n: 1, label: 'Guichet CAVEC', role: 'fonctionnaire', qui: 'L’agent de la caisse', fait: 'Cotisations impayées **2 ans sur 10** (ordinales ou sociales, **CAVEC comprise**) : **radiation d’office** par le conseil régional, qui n’est **pas** une sanction disciplinaire.' }] },
  anc: { layout: 'bureau', groupes: [{ approx: true, n: 2, label: 'ANC · CNoCP', role: 'fonctionnaire', qui: 'Un normalisateur comptable', fait: 'L’**ANC** et le **CNoCP** peuvent **demander une NEP** à la H2A, avec le garde des Sceaux, l’AMF, l’ACPR et la CNCC. **Pas une CRCC.**' }] },
  ifac: { layout: 'table', groupes: [{ approx: true, n: 2, label: 'CNOEC · CNCC', role: 'pro', qui: 'Un délégué du CNOEC ou de la CNCC', fait: 'Les deux institutions françaises sont **membres** de l’IFAC, fédération mondiale. Aucune norme IFAC ne s’impose directement en France.' }] },
  iesba: { layout: 'bureau', groupes: [{ n: 1, label: 'Rédacteur du Code of Ethics', role: 'pro', qui: 'Un rédacteur de l’IESBA', fait: 'Le **Code of Ethics** et sa typologie des menaces (intérêt personnel, défense, familiarité, intimidation) **ne figurent pas** dans le code ni les normes français.' }] },
  iaasb: { layout: 'bureau', groupes: [{ n: 1, label: 'Rédacteur des ISA', role: 'pro', qui: 'Un rédacteur de l’IAASB', fait: '**ISA**, **ISRE 2400**, **ISAE 3000/3400**, **ISRS 4400/4410** : elles **inspirent** les NP et les NEP, sans s’appliquer directement.' }] },
  iaesb: { layout: 'bureau', groupes: [{ n: 1, label: 'Archiviste', role: 'pro', qui: 'L’archiviste de l’IAESB', fait: 'L’IAESB a **cessé ses activités en 2019**. Ses normes **IES** de formation restent en vigueur sous la responsabilité de l’**IFAC** ; **IES 7** inspire la recommandation de **120 h sur 3 ans** de l’Ordre.' }] },
  aceu: { layout: 'bureau', groupes: [{ n: 1, label: 'Accountancy Europe', role: 'pro', qui: 'Un représentant d’Accountancy Europe', fait: 'Ex-**FEE** : fédération **européenne** de la profession, représentation sans pouvoir normatif en France.' }] },
  ue: { layout: 'table', groupes: [{ approx: true, n: 3, label: 'CEAOB', role: 'fonctionnaire', qui: 'Un superviseur européen du CEAOB', fait: 'La **H2A** coopère ici avec ses homologues. Textes : **directive 2006/43/CE** modifiée par **2014/56/UE**, **règlement 537/2014** (EIP).' }] },
};

// ---------------------------------------------------------------------------------------------------------
// Symboles des façades (tracés 24 × 24 au trait, comme js/icons.js) et leur sens : un repère visuel par bâtiment.
export const ICONES = {
  globe: 'M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  book: 'M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z',
  clipboard: 'M8 2h8v4H8zM16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M8 12h8M8 16h5',
  cap: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v5',
  flag: 'M5 21V3M5 4h12l-2 4 2 4H5',
  stars: 'M12 3.5h.01M16.5 4.7h.01M19.3 7.5h.01M20.5 12h.01M19.3 16.5h.01M16.5 19.3h.01M12 20.5h.01M7.5 19.3h.01M4.7 16.5h.01M3.5 12h.01M4.7 7.5h.01M7.5 4.7h.01',
  euro: 'M18 6.5A7 7 0 1 0 18 17.5M4 10h10M4 14h10',
  seal: 'M12 2a6 6 0 1 1 0 12a6 6 0 1 1 0-12zM8.5 13L7 22l5-3 5 3-1.5-9',
  council: 'M12 4.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5zM5 7a2 2 0 1 1 0 4a2 2 0 1 1 0-4zM19 7a2 2 0 1 1 0 4a2 2 0 1 1 0-4zM7.5 19a4.5 4.5 0 0 1 9 0M1.5 18a3.5 3.5 0 0 1 5.5-2.8M22.5 18a3.5 3.5 0 0 0-5.5-2.8',
  pin: 'M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13zM12 6.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z',
  gavel: 'M13 3l8 8-3 3-8-8zM12 10l-8 8 2 2 8-8M3 22h9',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 1 0 6a3 3 0 1 1 0-6z',
  eyeoff: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 1 0 6a3 3 0 1 1 0-6zM3 3l18 18',
  chart: 'M3 3v18h18M7 15l4-4 3 3 6-6M15 8h5v5',
  files: 'M8 3h7l4 4v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM15 3v4h4M3 8v11a2 2 0 0 0 2 2h9',
  columns: 'M3 21h18M5 18h14M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 3l9 5H3z',
  hand: 'M8 13V5a1.5 1.5 0 0 1 3 0v6M11 10V3.5a1.5 1.5 0 0 1 3 0V10M14 10V5a1.5 1.5 0 0 1 3 0v7M17 9.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-3-5a1.5 1.5 0 0 1 2.5-1.5L8 14',
  crown: 'M3 19h18M4 19L3 7l5 4 4-6 4 6 5-4-1 12',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  calculator: 'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM8 6h8v4H8zM8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01',
  scale: 'M12 3v18M7 21h10M3 7h18M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  search: 'M11 4a7 7 0 1 1 0 14a7 7 0 1 1 0-14zM21 21l-5-5',
  coins: 'M4 6a8 3 0 1 0 16 0a8 3 0 1 0-16 0M4 6v4c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 10v4c0 1.7 3.6 3 8 3s8-1.3 8-3v-4M4 14v4c0 1.7 3.6 3 8 3s8-1.3 8-3v-4',
};
// Bâtiment → [symbole, ce qu'il rappelle].
export const SYMBOLES = {
  ifac: ['globe', 'le globe : la fédération mondiale'],
  iesba: ['book', 'le livre : le Code of Ethics'],
  iaasb: ['clipboard', 'la feuille de travail : les normes ISA'],
  iaesb: ['cap', 'la toque : les normes de formation (organe dissous en 2019)'],
  aceu: ['stars', 'les étoiles : la fédération européenne'],
  ue: ['flag', 'le drapeau : directives, règlement EIP, CEAOB'],
  bercy: ['euro', 'l’euro : le ministre de l’économie, tutelle de l’Ordre'],
  chancellerie: ['seal', 'le sceau : le garde des Sceaux homologue'],
  cnoec: ['council', 'le conseil : les élus nationaux de l’Ordre'],
  cncc: ['council', 'le conseil : les 60 de la Compagnie'],
  croec: ['pin', 'l’épingle : l’échelon régional, le tableau'],
  crcc: ['pin', 'l’épingle : l’échelon régional des CAC'],
  chreg: ['gavel', 'le maillet : la discipline, 1re instance'],
  chnat: ['gavel', 'le maillet : la discipline, en appel'],
  sanctions: ['gavel', 'le maillet : la commission qui juge le CAC'],
  h2a: ['eye', 'l’œil : la supervision publique'],
  terrain: ['eyeoff', 'l’œil barré : pas de superviseur public pour l’EC'],
  amf: ['chart', 'la courbe : les marchés financiers'],
  anc: ['files', 'les feuillets : les normes comptables'],
  ce: ['columns', 'les colonnes : le dernier recours des deux'],
  ca: ['hand', 'la main levée : le serment du CAC'],
  cass: ['crown', 'la couronne : la cour suprême judiciaire'],
  ta: ['list', 'la liste : recours contre l’inscription CAC'],
  ccomptes: ['calculator', 'la calculatrice : les juridictions financières'],
  tj: ['scale', 'la balance : réparer le préjudice (civil)'],
  tcorr: ['lock', 'le cadenas : punir l’infraction (pénal)'],
  parquet: ['bell', 'la cloche : révéler les faits délictueux'],
  tracfin: ['search', 'la loupe : la déclaration de soupçon'],
  cavec: ['coins', 'les pièces : les cotisations de retraite'],
};
export const svgIcon = (id, attrs = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${attrs}><path d="${ICONES[SYMBOLES[id]?.[0]] || ICONES.columns}"/></svg>`;

// Liste rapide : où aller, rangé par profession.
// Composition de chaque institution, en liste claire : membres (avec l'effectif quand les fiches le donnent),
// puis les personnes présentes qui ne sont pas membres (commissaire du gouvernement, rapporteur, contrôleurs…).
const ROLE_CSS = { elu_ec: 'var(--ec, #0e7490)', elu_cac: 'var(--cac, #7c3aed)' };
const roleCss = (r) => ROLE_CSS[r] || ROLE[r] || '#64748b';
const escH = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
export const COMPO_CSS = `
.cp-sec { margin: 0 0 14px; }
.cp-h { font-size: 13px; letter-spacing: .06em; text-transform: uppercase; margin: 14px 0 8px; display: flex; align-items: center; gap: 8px; }
.cp-h::before { content: ''; width: 10px; height: 10px; border-radius: 3px; background: currentColor; }
.cp-h.ec { color: var(--ec, #0e7490); } .cp-h.cac { color: var(--cac, #7c3aed); } .cp-h.commun { color: var(--muted, #64748b); }
.cp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; }
.cp-b { border: 1px solid var(--line, #e2e8f0); border-radius: 12px; padding: 10px 12px; background: var(--card, #fff); cursor: pointer; min-width: 0; }
.cp-t { display: flex; gap: 8px; align-items: center; font-weight: 800; font-size: 14.5px; line-height: 1.2; }
.cp-t svg { width: 20px; height: 20px; flex-shrink: 0; }
.cp-b ul { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 4px; }
.cp-b li { display: flex; gap: 8px; align-items: baseline; font-size: 13.5px; line-height: 1.3; }
.cp-b li i { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; transform: translateY(1px); }
.cp-b li .n { min-width: 2.2em; font-weight: 800; font-variant-numeric: tabular-nums; text-align: right; }
.cp-b li.hors { color: var(--muted, #64748b); }
.cp-sub { font-size: 12px; color: var(--muted, #64748b); margin: 6px 0 0; }
.cp-tot { font-size: 12.5px; font-weight: 700; margin: 6px 0 0; }
`;
export function compositionItems(id) {
  const salle = SALLES[id]; if (!salle) return '';
  const row = (g, hors) => `<li class="${hors ? 'hors' : ''}"><i style="background:${roleCss(g.role)}"></i><span class="n">${g.approx ? '' : g.n}</span><span><b>${escH(g.label)}</b>${hors ? ' · présent, non membre' : ''}</span></li>`;
  const mem = salle.groupes.filter((g) => !g.debout), hors = salle.groupes.filter((g) => g.debout);
  const tot = mem.every((g) => !g.approx) && mem.length > 1 ? `<p class="cp-tot">${mem.reduce((k, g) => k + g.n, 0)} membres</p>` : (mem.some((g) => g.approx) ? '<p class="cp-sub">Effectif total non précisé par les fiches.</p>' : '');
  return `<ul>${mem.map((g) => row(g, false)).join('')}${hors.map((g) => row(g, true)).join('')}</ul>${tot}`;
}
export function compositionHtml() {
  return QUARTIERS_LISTE.map((q) => `<section class="cp-sec"><h3 class="cp-h ${q.rive}">${escH(q.titre)}</h3><div class="cp-grid">${q.ids.map((id) => {
    const b = batiment(id);
    return `<article class="cp-b" data-id="${id}"><div class="cp-t"><span style="color:${b.rive === 'ec' ? 'var(--ec, #0e7490)' : b.rive === 'cac' ? 'var(--cac, #7c3aed)' : 'var(--muted, #64748b)'}">${svgIcon(id)}</span>${escH(b.nom)}</div>${compositionItems(id)}${b.chiffres?.length ? `<p class="cp-sub">${b.chiffres.map(escH).join(' · ')}</p>` : ''}</article>`;
  }).join('')}</div></section>`).join('');
}

export const QUARTIERS_LISTE = [
  { titre: 'Expert-comptable', rive: 'ec', ids: ['bercy', 'cnoec', 'chnat', 'croec', 'chreg', 'terrain', 'cavec'] },
  { titre: 'Commissaire aux comptes', rive: 'cac', ids: ['chancellerie', 'cncc', 'h2a', 'sanctions', 'crcc', 'amf', 'anc'] },
  { titre: 'Juridictions (et Tracfin)', rive: 'commun', ids: ['ce', 'cass', 'ca', 'ta', 'ccomptes', 'tj', 'tcorr', 'parquet', 'tracfin'] },
  { titre: 'International', rive: 'commun', ids: ['ifac', 'iesba', 'iaasb', 'iaesb', 'aceu', 'ue'] },
];

// ---------------------------------------------------------------------------------------------------------
// Plan de la ville : sept rues est-ouest, une par niveau de l'organisation (du monde à la justice), coupées par
// un fleuve nord-sud entre la rive EC (ouest, à gauche en regardant le nord) et la rive CAC (est). Les jumeaux
// se font face de part et d'autre du pont de leur rue ; la chambre de discipline est en face de son conseil.
// Le plan imprimable (js/villeplan.js) reprend exactement cette disposition.
export const STREETS = [
  { id: 'intl', nom: 'Avenue internationale', z: -54 },
  { id: 'tutelle', nom: 'Rue des tutelles', z: -36 },
  { id: 'nat', nom: 'Rue nationale', z: -18 },
  { id: 'sup', nom: 'Rue de la supervision', z: 0 },
  { id: 'reg', nom: 'Rue régionale', z: 18 },
  { id: 'recours', nom: 'Rue des recours', z: 36 },
  { id: 'resp', nom: 'Rue des responsabilités', z: 54 },
];
// Bâtiment → [rue, côté de la rue (n = nord, s = sud), x]. x < 0 : rive EC, x > 0 : rive CAC.
export const PLACES = {
  ifac: ['intl', 'n', -29.5], iesba: ['intl', 'n', -21], iaasb: ['intl', 'n', -12.5], iaesb: ['intl', 'n', 12.5], aceu: ['intl', 'n', 21], ue: ['intl', 'n', 29.5],
  bercy: ['tutelle', 'n', -21], chancellerie: ['tutelle', 'n', 21],
  cnoec: ['nat', 'n', -21], chnat: ['nat', 's', -21], cncc: ['nat', 'n', 21],
  terrain: ['sup', 'n', -21], h2a: ['sup', 'n', 12.5], sanctions: ['sup', 'n', 21], amf: ['sup', 's', 12.5], anc: ['sup', 's', 21],
  croec: ['reg', 'n', -21], chreg: ['reg', 's', -21], crcc: ['reg', 'n', 21],
  ca: ['recours', 'n', -21], cass: ['recours', 'n', -12.5], ce: ['recours', 'n', 12.5], ta: ['recours', 'n', 21], ccomptes: ['recours', 's', 21],
  tj: ['resp', 'n', -21], tcorr: ['resp', 'n', -12.5], parquet: ['resp', 'n', 12.5], tracfin: ['resp', 'n', 21], cavec: ['resp', 's', -21],
};
export const TOUR3D = Object.keys(PLACES);
const RH = 2.4, AVENUES = [-37, -5.4, 5.4, 37], RIVER = { x0: -3, x1: 3, z0: -48, z1: 27 }, BOUNDS = { x0: -39, x1: 39, z0: -57, z1: 57 }, CAR_R = 1.3, TERRAIN = { x: 44, z: 67 }, PARVIS = 1.6;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hyp = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const angDiff = (a, b) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };

export const LOTS = VILLE.batiments.map((b) => {
  const [sid, side, x] = PLACES[b.id]; const si = STREETS.findIndex((s) => s.id === sid); const st = STREETS[si];
  const w = clamp(b.w * 0.075, 6, 8.3), d = clamp(b.d * 0.075, 4, 4.4), h = b.style === 'vide' ? 0.2 : 2.2 + b.h * 0.06;
  const sgn = side === 'n' ? -1 : 1, faceZ = st.z + sgn * (RH + PARVIS), z = faceZ + sgn * d / 2;
  const quartier = st.id === 'intl' ? 'intl' : ['recours', 'resp'].includes(st.id) ? 'justice' : b.rive;
  return { id: b.id, b, st, si, side, sgn, x, z, w, d, h, faceZ, quartier, stop: { x, z: st.z + sgn * 1.1 } };
});
export const lotOf = (id) => LOTS.find((l) => l.id === id);

// Obstacles (bâtiments, fleuve hors des ponts, fontaine, globe) et réseau de rues pour le pilote automatique.
const riverRects = () => {
  const out = []; let z = RIVER.z0;
  for (const s of STREETS.filter((t) => t.z > RIVER.z0 && t.z < RIVER.z1)) { out.push({ x0: RIVER.x0, x1: RIVER.x1, z0: z, z1: s.z - RH }); z = s.z + RH; }
  out.push({ x0: RIVER.x0, x1: RIVER.x1, z0: z, z1: RIVER.z1 }); return out;
};
const OBST = [
  ...LOTS.filter((l) => l.b.style !== 'vide').map((l) => ({ x0: l.x - l.w / 2, x1: l.x + l.w / 2, z0: l.z - l.d / 2, z1: l.z + l.d / 2 })),
  ...riverRects(), { x: 0, z: 45, r: 2.4 }, { x: 0, z: -61, r: 2.2 },
];
function pushOut(p, R) {
  let hit = false;
  for (const o of OBST) {
    if (o.r) { const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), m = o.r + R; if (d < m && d > 1e-6) { p.x = o.x + dx / d * m; p.z = o.z + dz / d * m; hit = true; } continue; }
    const cx = clamp(p.x, o.x0, o.x1), cz = clamp(p.z, o.z0, o.z1), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= R * R) continue;
    hit = true;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + dx / d * R; p.z = cz + dz / d * R; } else {
      const l = p.x - o.x0, r = o.x1 - p.x, t = p.z - o.z0, b = o.z1 - p.z, m = Math.min(l, r, t, b);
      if (m === l) p.x = o.x0 - R; else if (m === r) p.x = o.x1 + R; else if (m === t) p.z = o.z0 - R; else p.z = o.z1 + R;
    }
  }
  p.x = clamp(p.x, BOUNDS.x0, BOUNDS.x1); p.z = clamp(p.z, BOUNDS.z0, BOUNDS.z1);
  return hit;
}
const blocked = (x, z, R) => OBST.some((o) => (o.r ? Math.hypot(x - o.x, z - o.z) < o.r + R : x > o.x0 - R && x < o.x1 + R && z > o.z0 - R && z < o.z1 + R));
const NODES = []; STREETS.forEach((s) => AVENUES.forEach((x) => NODES.push({ x, z: s.z })));
const nid = (si, ai) => si * AVENUES.length + ai;
const EDGES = [];
STREETS.forEach((s, si) => { for (let ai = 0; ai < AVENUES.length - 1; ai++) EDGES.push([nid(si, ai), nid(si, ai + 1)]); });
AVENUES.forEach((x, ai) => { for (let si = 0; si < STREETS.length - 1; si++) EDGES.push([nid(si, ai), nid(si + 1, ai)]); });
const ADJ = NODES.map(() => []);
EDGES.forEach(([a, b]) => { const d = hyp(NODES[a], NODES[b]); ADJ[a].push([b, d]); ADJ[b].push([a, d]); });
for (const l of LOTS) l.edge = EDGES.findIndex(([a, b]) => NODES[a].z === l.st.z && NODES[b].z === l.st.z && Math.min(NODES[a].x, NODES[b].x) <= l.x && Math.max(NODES[a].x, NODES[b].x) >= l.x);
const project = (p, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, t = clamp(((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz), 0, 1); return { x: a.x + dx * t, z: a.z + dz * t }; };
const clearPath = (p, q) => { const n = Math.ceil(hyp(p, q) / 0.8); for (let i = 1; i <= n; i++) { const t = i / n; if (blocked(p.x + (q.x - p.x) * t, p.z + (q.z - p.z) * t, CAR_R * 0.9)) return false; } return true; };
// Itinéraire par les rues, de la position actuelle jusqu'à la porte du bâtiment.
export function route(from, lot) {
  const to = lot.stop; let best = null;
  EDGES.forEach((e, i) => { const q = project(from, NODES[e[0]], NODES[e[1]]); const d = hyp(from, q); if ((!best || d < best.d) && clearPath(from, q)) best = { i, q, d }; });
  if (!best) return [to];
  const pts = best.d > 0.5 ? [best.q] : [];
  if (best.i === lot.edge) return [...pts, to];
  const dist = NODES.map(() => Infinity), prev = NODES.map(() => -1), done = NODES.map(() => false);
  const [a, b] = EDGES[best.i]; dist[a] = hyp(best.q, NODES[a]); dist[b] = hyp(best.q, NODES[b]);
  for (;;) {
    let u = -1; for (let k = 0; k < NODES.length; k++) if (!done[k] && dist[k] < Infinity && (u < 0 || dist[k] < dist[u])) u = k;
    if (u < 0) break; done[u] = true;
    for (const [v, w] of ADJ[u]) if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }
  }
  const [c, d] = EDGES[lot.edge]; const end = dist[c] + hyp(NODES[c], to) <= dist[d] + hyp(NODES[d], to) ? c : d;
  const chain = []; for (let u = end; u >= 0; u = prev[u]) chain.unshift(u);
  return [...pts, ...chain.map((u) => ({ x: NODES[u].x, z: NODES[u].z })), to];
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const cssVar = (name, fb) => { try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb; } catch { return fb; } };
const streetName = (z) => { const s = STREETS.reduce((a, t) => (Math.abs(t.z - z) < Math.abs(a.z - z) ? t : a)); return Math.abs(s.z - z) < 9 ? s.nom : ''; };
const zoneName = (x, z) => (z < RIVER.z0 ? 'Quartier international' : z > RIVER.z1 ? 'Quartier judiciaire' : x < RIVER.x0 ? 'Rive EC' : x > RIVER.x1 ? 'Rive CAC' : 'Sur le pont');

export const VILLE3D_CSS = `
.v3 { --st: env(safe-area-inset-top, 0px); --sb: env(safe-area-inset-bottom, 0px); position: relative; height: min(calc(100dvh - 150px), 760px); min-height: 440px; border-radius: 14px; overflow: hidden; border: 1px solid var(--line); background: var(--card); color: var(--text); touch-action: none; user-select: none; -webkit-user-select: none; outline: none; font-size: 14px; }
.v3 [hidden] { display: none !important; }
.v3.v3-full { position: fixed; inset: 0; height: auto; min-height: 0; z-index: 15; border-radius: 0; border: 0; }
.v3 .v3-gl { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.v3-top { position: absolute; left: max(8px, env(safe-area-inset-left, 0px)); right: max(8px, env(safe-area-inset-right, 0px)); top: calc(8px + var(--st)); display: flex; gap: 6px; align-items: flex-start; z-index: 2; }
.v3-where { flex: 1; min-width: 0; padding: 6px 10px; border-radius: 10px; border: 1px solid var(--line); background: color-mix(in srgb, var(--card) 90%, transparent); font-size: 12.5px; line-height: 1.3; }
.v3-where b { display: block; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v3-where .q { display: block; color: var(--primary); font-weight: 700; margin-top: 2px; }
.v3-where > .v3-sub { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v3-btn { font: 600 13px/1.1 inherit; min-height: 38px; padding: 6px 11px; border-radius: 10px; border: 1px solid var(--line); background: var(--card); color: var(--text); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.v3-btn.primary { background: var(--primary); border-color: var(--primary); color: #fff; }
.v3-btn.on { background: var(--text); border-color: var(--text); color: var(--card); }
.v3-btn svg { width: 18px; height: 18px; flex-shrink: 0; }
.v3-mini { position: absolute; right: max(8px, env(safe-area-inset-right, 0px)); top: calc(56px + var(--st)); width: 84px; height: 124px; border-radius: 10px; border: 1px solid var(--line); cursor: pointer; z-index: 2; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
.v3-card { position: absolute; left: max(8px, env(safe-area-inset-left, 0px)); right: max(8px, env(safe-area-inset-right, 0px)); bottom: calc(8px + var(--sb)); max-height: 40%; overflow: auto; touch-action: pan-y; z-index: 2; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line); background: color-mix(in srgb, var(--card) 95%, transparent); line-height: 1.4; }
.v3.touch .v3-card { bottom: calc(112px + var(--sb)); max-height: 30%; }
.v3-card .t { display: flex; gap: 8px; align-items: center; font-weight: 800; font-size: 15px; }
.v3-card .clamp { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.v3-more { margin-top: 4px; font-size: 12.5px; color: var(--muted); } .v3-more summary { cursor: pointer; font-weight: 600; }
.v3-quit { min-width: 38px; font-size: 16px; }
.v3-card .t svg { width: 24px; height: 24px; flex-shrink: 0; }
.v3 .ec { color: var(--ec); } .v3 .cac { color: var(--cac); } .v3 .commun { color: var(--muted); }
.v3-card p { margin: 4px 0; }
.v3-sub { color: var(--muted); font-size: 12.5px; }
.v3-acts { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.v3-compo { list-style: none; margin: 6px 0 0; padding: 0; display: grid; gap: 3px; }
.v3-compo button { width: 100%; display: flex; gap: 8px; align-items: baseline; text-align: left; font: 600 13px/1.3 inherit; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--line); background: var(--card); color: var(--text); cursor: pointer; }
.v3-compo i { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; transform: translateY(1px); }
.v3-compo .n { min-width: 1.8em; text-align: right; font-weight: 800; font-variant-numeric: tabular-nums; }
.v3-compo em { font-style: normal; font-weight: 400; color: var(--muted); }
.v3-chips { display: flex; gap: 6px; overflow-x: auto; touch-action: pan-x; margin-top: 8px; padding-bottom: 2px; scrollbar-width: none; }
.v3-chips button { flex-shrink: 0; font: 600 12px/1 inherit; padding: 7px 9px; border-radius: 999px; border: 1px solid var(--line); background: var(--card); color: var(--text); cursor: pointer; display: inline-flex; gap: 5px; align-items: center; }
.v3-chips button i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.v3-chips button svg { width: 14px; height: 14px; }
.v3-stick { position: absolute; left: 14px; bottom: calc(10px + var(--sb)); width: 100px; height: 100px; border-radius: 50%; border: 2px solid color-mix(in srgb, var(--text) 25%, transparent); background: color-mix(in srgb, var(--card) 45%, transparent); display: none; z-index: 2; }
.v3-stick i { position: absolute; left: 50%; top: 50%; width: 42px; height: 42px; margin: -21px 0 0 -21px; border-radius: 50%; background: var(--primary); opacity: .85; }
.v3-pad { position: absolute; right: 12px; bottom: calc(22px + var(--sb)); display: none; gap: 8px; z-index: 2; }
.v3-pad .v3-btn { min-height: 58px; min-width: 86px; border-radius: 29px; -webkit-touch-callout: none; }
.v3.touch .v3-stick, .v3.touch .v3-pad { display: flex; }
.v3-keys { position: absolute; left: 10px; bottom: 10px; font-size: 11.5px; color: var(--muted); z-index: 1; pointer-events: none; }
.v3:not(.touch) .v3-card { bottom: calc(30px + var(--sb)); }
.v3.touch .v3-keys { display: none; }
.v3-sheet { position: absolute; inset: 8px; z-index: 4; overflow: auto; touch-action: pan-y; border-radius: 12px; border: 1px solid var(--line); background: var(--card); padding: 0 12px 12px; }
.v3-sheet-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; position: sticky; top: 0; background: var(--card); padding: 10px 0 8px; z-index: 1; flex-wrap: wrap; }
.v3-sheet h4 { margin: 12px 0 6px; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; display: flex; align-items: center; gap: 6px; }
.v3-sheet h4 i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.v3-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; }
.v3-list button { text-align: left; display: flex; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--card); color: var(--text); cursor: pointer; font: 600 13px/1.2 inherit; min-height: 46px; }
.v3-list button span { min-width: 0; }
.v3-list button small { display: block; font-weight: 400; color: var(--muted); font-size: 11px; }
.v3-list button svg { width: 22px; height: 22px; flex-shrink: 0; }
.v3-list button.here { border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }
.v3-opt { display: flex; gap: 6px; flex-wrap: wrap; }
.v3-mapwrap { position: absolute; inset: 54px 0 0 0; overflow: auto; touch-action: pan-x pan-y; }
.v3-mapwrap canvas { display: block; margin: 0 auto; cursor: pointer; }
.v3-map { padding: 0; overflow: hidden; } .v3-map .v3-sheet-head { padding: 8px 10px; }
.v3-flash { position: absolute; left: 50%; top: 40%; transform: translate(-50%, -50%); padding: 12px 18px; border-radius: 14px; font-weight: 800; font-size: 20px; color: #fff; pointer-events: none; opacity: 0; transition: opacity .2s; z-index: 3; text-align: center; }
.v3-flash.ok { background: var(--ok, #15803d); opacity: 1; } .v3-flash.ko { background: var(--ko, #b91c1c); opacity: 1; }
`;

export function startVille3D(root, THREE, opts = {}) {
  root.classList.add('v3'); root.classList.toggle('v3-full', !!opts.full); root.tabIndex = 0;
  const touch = matchMedia('(pointer: coarse)').matches; root.classList.toggle('touch', touch);
  root.innerHTML = `<canvas class="v3-gl"></canvas>
    <div class="v3-top"><div class="v3-where" id="v3-where"></div><button type="button" class="v3-btn primary" data-a="list">Aller à</button><button type="button" class="v3-btn" data-a="opts" aria-label="Options">☰</button>${opts.onQuit ? '<button type="button" class="v3-btn v3-quit" data-a="quit" aria-label="Quitter la visite">✕</button>' : ''}</div>
    <canvas class="v3-mini" id="v3-mini" data-a="map" aria-label="Carte de la ville"></canvas>
    <div class="v3-card" id="v3-card"></div>
    <div class="v3-stick" id="v3-stick"><i></i></div>
    <div class="v3-pad"><button type="button" class="v3-btn" id="v3-turbo" aria-label="Turbo (maintenir)">Turbo</button></div>
    <div class="v3-keys">Flèches : conduire (↓ recul) · Maj : turbo · + / − ou molette : inclinaison · Entrée : entrer · L : aller à · M : carte</div>
    <div class="v3-flash" id="v3-flash"></div>
    <div class="v3-sheet" id="v3-sheet" hidden></div>
    <div class="v3-sheet v3-map" id="v3-map" hidden><div class="v3-sheet-head"><strong>Carte · touchez un bâtiment pour y aller</strong><button type="button" class="v3-btn" data-a="close">Fermer</button></div><div class="v3-mapwrap"><canvas id="v3-bigmap"></canvas></div></div>`;
  const $ = (s) => root.querySelector(s);
  if (!document.getElementById('v3-compo-css')) { const st = document.createElement('style'); st.id = 'v3-compo-css'; st.textContent = COMPO_CSS; document.head.appendChild(st); }
    const canvas = $('.v3-gl'), whereEl = $('#v3-where'), card = $('#v3-card'), flash = $('#v3-flash'), sheet = $('#v3-sheet'), mapSheet = $('#v3-map'), mini = $('#v3-mini'), big = $('#v3-bigmap'), turboBtn = $('#v3-turbo');

  const col = { ec: cssVar('--ec', '#0e7490'), cac: cssVar('--cac', '#7c3aed'), commun: cssVar('--muted', '#64748b'), card: cssVar('--card', '#ffffff'), text: cssVar('--text', '#0f172a'), line: cssVar('--line', '#e2e8f0'), primary: cssVar('--primary', '#1e40af') };
  const th = document.documentElement.dataset.theme;
  const dark = th === 'dark' || (th !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  const ROLEC = { ...ROLE, elu_ec: col.ec, elu_cac: col.cac };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = dark ? 1.05 : 1.15;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const camera = new THREE.PerspectiveCamera(58, 1, 0.8, 420);
  const resize = () => { const w = root.clientWidth || 1, h = root.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  // Décale l'image pour que le centre de la vue (la voiture, le marcheur) tombe au milieu de la zone dégagée.
  const reframe = () => {
    const W = root.clientWidth || 1, H = root.clientHeight || 1, rr0 = root.getBoundingClientRect();
    const top = (root.querySelector('.v3-top')?.getBoundingClientRect().bottom ?? rr0.top) - rr0.top;
    const cardEl = root.querySelector('.v3-card'), cardTop = cardEl && cardEl.offsetHeight ? cardEl.getBoundingClientRect().top - rr0.top : H;
    const dy = clamp(H / 2 - (top + cardTop) / 2, 0, H * 0.32);
    camera.setViewOffset(W, H, 0, dy, W, H); camera.updateProjectionMatrix();
  };
  resize(); const ro = new ResizeObserver(() => { resize(); reframe(); }); ro.observe(root);

  // ---------- Ressources partagées (géométries, matériaux, textures d'étiquettes)
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const matCache = new Map();
  const lam = (c, extra) => { const k = c + (extra ? JSON.stringify(extra) : ''); if (!matCache.has(k)) matCache.set(k, keep(new THREE.MeshLambertMaterial({ color: c, ...extra }))); return matCache.get(k); };
  const BOX = keep(new THREE.BoxGeometry(1, 1, 1));
  const drawIcon = (x, name, X, Y, size, color, lw = 2) => { x.save(); x.translate(X, Y); x.scale(size / 24, size / 24); x.lineWidth = lw; x.strokeStyle = color; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(new Path2D(ICONES[name])); x.restore(); };
  const rr = (x, X, Y, W, H, R) => { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); };
  // Grain : points clairs et sombres semés au hasard, pour que rien ne soit d'un aplat parfait.
  let grainSeed = 11; const grnd = () => ((grainSeed = (grainSeed * 16807) % 2147483647) / 2147483647);
  const grain = (x, W, H, n = 900, a = 0.08) => { for (let i = 0; i < n; i++) { x.fillStyle = grnd() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`; x.fillRect(grnd() * W, grnd() * H, 1 + grnd() * 2, 1 + grnd() * 2); } };
  const canvasTex = (c) => { const t = keep(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const labels = new Map();
  function label(text, o = {}) {
    const { bg = col.card, fg = col.text, border = col.line, size = 40, k = 0.011, icon = null, iconColor = fg } = o;
    const key = [text, bg, fg, border, size, icon, iconColor].join('|');
    let L = labels.get(key);
    if (!L) {
      const c = document.createElement('canvas'), x = c.getContext('2d'), font = `700 ${size}px -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
      x.font = font; const tw = x.measureText(text).width, pad = size * 0.45, iw = icon ? size * 1.15 : 0;
      c.width = Math.ceil(tw + pad * 2 + iw); c.height = Math.round(size * 1.65);
      x.font = font; x.fillStyle = bg; x.strokeStyle = border; x.lineWidth = Math.max(3, size / 9);
      rr(x, 2, 2, c.width - 4, c.height - 4, size * 0.35); x.fill(); x.stroke();
      if (icon) drawIcon(x, icon, pad * 0.85, (c.height - size * 0.9) / 2, size * 0.9, iconColor, 2.4);
      x.fillStyle = fg; x.textBaseline = 'middle'; x.fillText(text, pad + iw, c.height / 2 + 1);
      const tex = canvasTex(c); tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
      L = { mat: keep(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })), w: c.width, h: c.height };
      labels.set(key, L);
    }
    const sp = new THREE.Sprite(L.mat); sp.scale.set(L.w * k, L.h * k, 1); sp.renderOrder = 2; return sp;
  }
  // Sols superposés : décalage de profondeur par couche pour éviter le scintillement à distance.
  const plane = (w, d, c, y = 0) => { const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, d)), lam(c, { polygonOffset: true, polygonOffsetFactor: -Math.round(y * 100), polygonOffsetUnits: -Math.round(y * 100) })); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; return m; };
  const box = (sc, w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(BOX, mat); m.scale.set(w, h, d); m.position.set(x, y, z); sc.add(m); return m; };

  // ---------- La ville
  const city = new THREE.Scene();
  // Ciel en dégradé (dôme peint), brume à l'horizon, soleil bas qui projette les ombres des bâtiments.
  const horizon = dark ? '#1e293b' : '#e6eef7';
  city.background = new THREE.Color(horizon); city.fog = new THREE.Fog(horizon, 80, 260);
  {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, dark ? '#020617' : '#5b8fd6'); gr.addColorStop(0.55, dark ? '#0f1b33' : '#a9c7ec'); gr.addColorStop(1, horizon); x.fillStyle = gr; x.fillRect(0, 0, 4, 256);
    const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(380, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), keep(new THREE.MeshBasicMaterial({ map: canvasTex(c), side: THREE.BackSide, fog: false, depthWrite: false })));
    sky.renderOrder = -1; city.add(sky);
    // Nuages : quelques taches claires sur le dôme.
    const cc = document.createElement('canvas'); cc.width = 128; cc.height = 64; const cx = cc.getContext('2d');
    for (let i = 0; i < 9; i++) { const g2 = cx.createRadialGradient(20 + i * 11, 34 + (i % 3) * 4, 2, 20 + i * 11, 34 + (i % 3) * 4, 22); g2.addColorStop(0, 'rgba(255,255,255,.85)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = g2; cx.fillRect(0, 0, 128, 64); }
    const cm = keep(new THREE.SpriteMaterial({ map: canvasTex(cc), transparent: true, depthWrite: false, fog: false, opacity: dark ? 0.15 : 0.8 }));
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + 0.3, r = 230 + (i % 3) * 40, cl = new THREE.Sprite(cm); cl.scale.set(90 + (i % 4) * 25, 40, 1); cl.position.set(Math.cos(a) * r, 70 + (i % 4) * 18, Math.sin(a) * r); cl.renderOrder = -1; city.add(cl); }
  }
  city.add(new THREE.HemisphereLight(0xffffff, 0x7a8698, dark ? 1 : 1.15));
  const sun = new THREE.DirectionalLight(dark ? 0xc7d2fe : 0xfff1d6, dark ? 0.6 : 1.25); sun.position.set(45, 70, 35); city.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 75, bottom: -75, near: 10, far: 220 }); sun.shadow.camera.updateProjectionMatrix();
  const C = dark
    ? { ground: '#1a2333', north: '#232c3d', south: '#262a33', ecz: '#103a43', cacz: '#291f47', river: '#1e3d73', road: '#3a4354', walk: '#2b3445' }
    : { ground: '#d5dde7', north: '#cdd8e8', south: '#e2d6c1', ecz: '#c3e4ea', cacz: '#e0d6f5', river: '#8fb6e8', road: '#8f98a6', walk: '#e7ecf2' };
  const ACC = { intl: col.primary, ec: col.ec, cac: col.cac, justice: dark ? '#d6a65a' : '#a16207' };
  const zoneKind = (x, z) => (z < RIVER.z0 ? 'intl' : z > RIVER.z1 ? 'justice' : x < 0 ? 'ec' : 'cac');
  const zone = (x0, x1, z0, z1, c, y) => { const m = plane(x1 - x0, z1 - z0, c, y); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); city.add(m); };
  const GX = TERRAIN.x, GZ = TERRAIN.z;
  zone(-GX, GX, -GZ, GZ, C.ground, 0);
  // Campagne autour de la ville : prairie, bosquets et collines lointaines, pour que la ville ne flotte plus dans le vide.
  { const g = new THREE.Mesh(keep(new THREE.PlaneGeometry(900, 900)), lam(dark ? '#14281c' : '#9fc58f', { polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 })); g.rotation.x = -Math.PI / 2; g.position.y = -0.05; g.receiveShadow = true; city.add(g);
    let sd = 3; const r2 = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const hills = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), lam(dark ? '#1c3326' : '#86b07a'), 22);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), Sc = new THREE.Vector3();
    for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2, r = 170 + r2() * 70; M.compose(V.set(Math.cos(a) * r, -1, Math.sin(a) * r * 1.2), Q, Sc.set(40 + r2() * 45, 12 + r2() * 22, 40 + r2() * 45)); hills.setMatrixAt(i, M); }
    city.add(hills);
    const grove = []; for (let i = 0; i < 70; i++) { const a = r2() * Math.PI * 2, r = 80 + r2() * 70; grove.push([Math.cos(a) * r, Math.sin(a) * r * 1.15, 1 + r2() * 1.2]); }
    const gc = new THREE.InstancedMesh(keep(new THREE.ConeGeometry(1.6, 4.5, 7)), lam(dark ? '#14532d' : '#4f8a4a'), grove.length);
    grove.forEach(([x, z, k], i) => { M.compose(V.set(x, 2.2 * k, z), Q, Sc.set(k, k, k)); gc.setMatrixAt(i, M); }); city.add(gc); }
  // Chaque quartier a son pavage : dalles en losange (international), carreaux (rive EC), briques en quinconce
  // (rive CAC), grandes dalles de pierre (justice).
  const paving = (kind, base) => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 128, 128); x.strokeStyle = dark ? 'rgba(255,255,255,.08)' : 'rgba(15,23,42,.10)'; x.lineWidth = 3;
    x.beginPath();
    if (kind === 'intl') { for (let i = -128; i <= 128; i += 32) { x.moveTo(i, 0); x.lineTo(i + 128, 128); x.moveTo(i + 128, 0); x.lineTo(i, 128); } }
    else if (kind === 'ec') { for (let i = 0; i <= 128; i += 32) { x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); } }
    else if (kind === 'cac') { for (let r = 0; r < 8; r++) { const y = r * 16; x.moveTo(0, y); x.lineTo(128, y); for (let i = (r % 2) * 16; i <= 128; i += 32) { x.moveTo(i, y); x.lineTo(i, y + 16); } } }
    else { for (let i = 0; i <= 128; i += 64) { x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); } x.moveTo(32, 64); x.lineTo(32, 128); x.moveTo(96, 0); x.lineTo(96, 64); }
    x.stroke(); grain(x, 128, 128, 700, 0.07);
    const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  };
  const pzone = (x0, x1, z0, z1, kind, base) => {
    const t = paving(kind, base); t.repeat.set((x1 - x0) / 8, (z1 - z0) / 8);
    const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(x1 - x0, z1 - z0)), keep(new THREE.MeshLambertMaterial({ map: t, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.01, (z0 + z1) / 2); m.receiveShadow = true; city.add(m);
  };
  pzone(-GX, GX, -GZ, RIVER.z0, 'intl', C.north); pzone(-GX, GX, RIVER.z1, GZ, 'justice', C.south);
  pzone(-GX, RIVER.x0, RIVER.z0, RIVER.z1, 'ec', C.ecz); pzone(RIVER.x1, GX, RIVER.z0, RIVER.z1, 'cac', C.cacz);
  const riverTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = C.river; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 2; for (let y = 8; y < 128; y += 16) { x.beginPath(); for (let i = 0; i <= 128; i += 8) x.lineTo(i, y + Math.sin((i + y) / 10) * 3); x.stroke(); }
    const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, (RIVER.z1 - RIVER.z0) / 8); return t; })();
  { const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(RIVER.x1 - RIVER.x0, RIVER.z1 - RIVER.z0)), keep(new THREE.MeshLambertMaterial({ map: riverTex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.015, (RIVER.z0 + RIVER.z1) / 2); m.receiveShadow = true; city.add(m); }
  const asphalt = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = C.road; x.fillRect(0, 0, 128, 128); grain(x, 128, 128, 1600, 0.12);
    const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const road = (x0, x1, z0, z1) => { const t = keep(asphalt.clone()); t.needsUpdate = true; t.repeat.set((x1 - x0) / 6, (z1 - z0) / 6);
    const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(x1 - x0, z1 - z0)), keep(new THREE.MeshLambertMaterial({ map: t, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }))); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.03, (z0 + z1) / 2); m.receiveShadow = true; city.add(m); };
  for (const s of STREETS) road(AVENUES[0] - RH, AVENUES[3] + RH, s.z - RH, s.z + RH);
  for (const x of AVENUES) road(x - RH, x + RH, STREETS[0].z - RH, STREETS[6].z + RH);
  const dash = lam(dark ? '#cbd5e1' : '#ffffff');
  for (const s of STREETS) for (let x = -35; x < 35; x += 4) box(city, 1.6, 0.02, 0.18, x, 0.05, s.z, dash);
  for (const s of STREETS.filter((t) => t.z > RIVER.z0 && t.z < RIVER.z1)) { const par = lam(dark ? '#94a3b8' : '#475569'); box(city, 6, 0.6, 0.3, 0, 0.3, s.z - RH, par); box(city, 6, 0.6, 0.3, 0, 0.3, s.z + RH, par); }
  // Repères : globe au nord, fontaine de la justice au sud, panneaux des rives.
  const globe = new THREE.Mesh(keep(new THREE.SphereGeometry(2, 20, 14)), lam(col.primary, { wireframe: true })); globe.position.set(0, 3.2, -61); city.add(globe);
  box(city, 1.8, 1.2, 1.8, 0, 0.6, -61, lam('#94a3b8'));
  const fountain = new THREE.Mesh(keep(new THREE.CylinderGeometry(2.2, 2.4, 0.7, 24)), lam('#cbd5e1')); fountain.position.set(0, 0.35, 45); city.add(fountain);
  const water = new THREE.Mesh(keep(new THREE.CylinderGeometry(1.9, 1.9, 0.2, 24)), lam(C.river)); water.position.set(0, 0.75, 45); city.add(water);
  box(city, 0.5, 2.4, 0.5, 0, 1.2, 45, lam('#cbd5e1'));
  const signs = [];
  const sign = (text, x, y, z, o = {}) => { const s = label(text, { size: 44, k: 0.0085, ...o }); s.position.set(x, y, z); city.add(s); signs.push(s); return s; };
  // Plaques de rue au coin des carrefours (quais et avenues extérieures), sur un poteau, lisibles de près.
  for (const s of STREETS) for (const ax of AVENUES) {
    const cx = ax + Math.sign(ax) * (RH + 0.5), cz = s.z - RH - 0.5;
    box(city, 0.08, 2.4, 0.08, cx, 1.2, cz, lam(dark ? '#94a3b8' : '#475569'));
    const pl = sign(s.nom, cx, 2.75, cz, { bg: col.text, fg: col.card, border: col.text, size: 40, k: 0.0048 }); pl.userData.far = 30;
  }
    // Portes des rives : une arche sur chaque quai, à l'entrée nord et à l'entrée sud du quartier.
  for (const [ax, kind, txt] of [[AVENUES[1], 'ec', 'Rive EC · l’Ordre'], [AVENUES[2], 'cac', 'Rive CAC · l’audit']]) for (const z of [RIVER.z0 + 1.2, RIVER.z1 - 1.2]) {
    const m = lam(ACC[kind]);
    box(city, 0.5, 4.2, 0.5, ax - RH - 0.3, 2.1, z, m); box(city, 0.5, 4.2, 0.5, ax + RH + 0.3, 2.1, z, m); box(city, 2 * RH + 1.6, 0.6, 0.6, ax, 4.4, z, m);
    sign(txt, ax, 5.1, z, { border: ACC[kind], fg: ACC[kind], size: 40, k: 0.0058 }).userData.far = 60;
  }
  sign('Quartier international', 0, 6.2, -61, { size: 40, k: 0.0065 }).userData.far = 70; sign('Quartier judiciaire', 0, 4.4, 45, { size: 40, k: 0.0065 }).userData.far = 70;

  // Bâtiments : petits volumes, façade côté rue avec le symbole, porte, étiquette.
  // Matière des murs selon le quartier : brique (rive EC), mur-rideau de verre (rive CAC), panneaux de béton
  // (international), assises de pierre (justice) ; fenêtres par-dessus.
  const wallPattern = (x, W, H, quartier) => {
    x.strokeStyle = 'rgba(0,0,0,.16)'; x.lineWidth = 1; x.beginPath();
    if (quartier === 'ec') for (let y = 0, r = 0; y < H; y += 6, r++) { x.moveTo(0, y); x.lineTo(W, y); for (let i = (r % 2) * 6; i < W; i += 12) { x.moveTo(i, y); x.lineTo(i, y + 6); } }
    else if (quartier === 'cac') { x.strokeStyle = 'rgba(255,255,255,.22)'; for (let i = 0; i < W; i += 10) { x.moveTo(i, 0); x.lineTo(i, H); } for (let y = 0; y < H; y += 14) { x.moveTo(0, y); x.lineTo(W, y); } }
    else if (quartier === 'intl') for (let i = 0; i < W; i += 32) { x.moveTo(i, 0); x.lineTo(i, H); for (let y = 0; y < H; y += 32) { x.moveTo(0, y); x.lineTo(W, y); } }
    else for (let y = 0; y < H; y += 10) { x.moveTo(0, y); x.lineTo(W, y); }
    x.stroke(); grain(x, W, H, Math.round(W * H / 6), 0.07);
  };
  const sideTex = {};
  const sideTexOf = (rive, quartier) => {
    const k = `${rive}|${quartier}`; if (sideTex[k]) return sideTex[k];
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
    x.fillStyle = col[rive]; x.fillRect(0, 0, 64, 64); wallPattern(x, 64, 64, quartier);
    x.fillStyle = quartier === 'cac' ? 'rgba(220,230,255,.42)' : 'rgba(255,255,255,.3)';
    for (let yy = 10; yy < 64; yy += 22) for (let xx = 8; xx < 64; xx += 22) x.fillRect(xx, yy, quartier === 'cac' ? 14 : 9, 11);
    const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return (sideTex[k] = t);
  };
  const roofTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = dark ? '#0b4f5c' : '#0b5563'; x.fillRect(0, 0, 64, 64);
    x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1.5; for (let y = 0, r = 0; y < 64; y += 8, r++) { x.beginPath(); x.moveTo(0, y); x.lineTo(64, y); x.stroke(); for (let i = (r % 2) * 8; i < 64; i += 16) { x.beginPath(); x.moveTo(i, y); x.lineTo(i, y + 8); x.stroke(); } }
    grain(x, 64, 64, 500, 0.08); const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t; })();
  const gravel = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = dark ? '#334155' : '#e2e8f0'; x.fillRect(0, 0, 64, 64); grain(x, 64, 64, 900, 0.14);
    const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t; })();
  const roofMat = keep(new THREE.MeshLambertMaterial({ map: gravel }));
  const facade = (lot) => {
    const c = document.createElement('canvas'), W = 256, H = clamp(Math.round(256 * lot.h / lot.w), 140, 360); c.width = W; c.height = H; const x = c.getContext('2d');
    x.fillStyle = col[lot.b.rive]; x.fillRect(0, 0, W, H); wallPattern(x, W, H, lot.quartier); x.fillStyle = lot.quartier === 'cac' ? 'rgba(220,230,255,.4)' : 'rgba(255,255,255,.26)';
    for (let yy = 14; yy < H - 70; yy += 30) for (let xx = 16; xx < W - 16; xx += 32) x.fillRect(xx, yy, 14, 18);
    const r = Math.min(W * 0.3, (H - 56) * 0.42), cx = W / 2, cy = Math.max(r + 8, (H - 56) / 2);
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    drawIcon(x, SYMBOLES[lot.id][0], cx - r * 0.62, cy - r * 0.62, r * 1.24, col[lot.b.rive], 2.2);
    return canvasTex(c);
  };
  // Silhouettes de quartier : dôme et drapeau (international), toit à deux pans (rive EC), couronne de verre
  // (rive CAC), colonnade et fronton (justice).
  const PRISM = (() => { const sh = new THREE.Shape(); sh.moveTo(-0.5, 0); sh.lineTo(0.5, 0); sh.lineTo(0, 1); sh.lineTo(-0.5, 0); return keep(new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5)); })();
  const DOME = keep(new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2)), COL = keep(new THREE.CylinderGeometry(0.17, 0.2, 1, 8));
  const FLAGS = ['#dc2626', '#f59e0b', '#16a34a', '#2563eb', '#7c3aed', '#0891b2'];
  let flagI = 0;
  function archi(lot) {
    const { x, z, w, d, h, sgn, faceZ } = lot, top = h + 0.25;
    if (lot.quartier === 'intl') {
      const r = Math.min(w, d) * 0.34, dome = new THREE.Mesh(DOME, lam(dark ? '#cbd5e1' : '#e2e8f0')); dome.scale.set(r, r * 0.9, r); dome.position.set(x, top, z); city.add(dome);
      box(city, 0.08, 2.2, 0.08, x + w / 2 - 0.6, top + 1.1, z, lam('#94a3b8'));
      box(city, 0.05, 0.6, 1, x + w / 2 - 0.6, top + 1.9, z + 0.5, lam(FLAGS[flagI++ % FLAGS.length]));
    } else if (lot.quartier === 'ec') {
      const roof = new THREE.Mesh(PRISM, keep(new THREE.MeshLambertMaterial({ map: roofTex }))); roof.rotation.y = Math.PI / 2; roof.scale.set(d + 0.5, Math.min(2.2, d * 0.45), w + 0.5); roof.position.set(x, top, z); city.add(roof);
      box(city, 0.6, 1, 0.6, x - w * 0.3, top + 0.9, z, lam('#7c5a3a'));
    } else if (lot.quartier === 'cac') {
      const glass = lam(dark ? '#a5b4fc' : '#c4b5fd', { transparent: true, opacity: 0.85 });
      box(city, w * 0.62, h * 0.28, d * 0.62, x, top + h * 0.14, z, glass);
      box(city, 0.06, 1.6, 0.06, x, top + h * 0.28 + 0.8, z, lam('#94a3b8'));
    } else {
      const stone = lam(dark ? '#e7e5e4' : '#f5f0e6'), fz = faceZ - sgn * 0.35;
      for (const k of [-0.4, -0.2, 0.2, 0.4]) { const c = new THREE.Mesh(COL, stone); c.scale.set(1, h, 1); c.position.set(x + k * w, h / 2, fz); city.add(c); }
      box(city, w + 0.4, 0.35, 0.9, x, h + 0.05, faceZ - sgn * 0.3, stone);
      const ped = new THREE.Mesh(PRISM, stone); ped.scale.set(w + 0.4, 1.3, 0.5); ped.position.set(x, h + 0.22, faceZ - sgn * 0.45); city.add(ped);
      box(city, w + 0.6, 0.12, 0.6, x, 0.06, faceZ - sgn * 0.3, stone);
    }
  }
  // Nom peint sur le parvis de chaque bâtiment, entre le trottoir et la façade (le haut des lettres vers la façade).
  function groundName(lot) {
    const c = document.createElement('canvas'), x = c.getContext('2d'), txt = lot.b.court.toUpperCase(), fs = 64;
    x.font = `800 ${fs}px -apple-system, "Segoe UI", Roboto, Arial, sans-serif`; const tw = x.measureText(txt).width;
    c.width = Math.ceil(tw + fs * 1.6); c.height = Math.round(fs * 1.5);
    x.font = `800 ${fs}px -apple-system, "Segoe UI", Roboto, Arial, sans-serif`; x.textBaseline = 'middle';
    drawIcon(x, SYMBOLES[lot.id][0], fs * 0.2, fs * 0.28, fs * 0.95, '#ffffff', 2.6);
    x.lineWidth = 8; x.strokeStyle = 'rgba(15,23,42,.45)'; x.strokeText(txt, fs * 1.35, c.height / 2 + 2); x.fillStyle = 'rgba(255,255,255,.92)'; x.fillText(txt, fs * 1.35, c.height / 2 + 2);
    x.fillStyle = col[lot.b.rive]; x.fillRect(fs * 1.35, c.height - 10, tw, 7);
    const t = canvasTex(c); t.anisotropy = 4;
    let wpl = Math.min(lot.w + 1.2, 8), hpl = wpl * c.height / c.width; if (hpl > PARVIS - 0.35) { wpl *= (PARVIS - 0.35) / hpl; hpl = PARVIS - 0.35; }
    const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(wpl, hpl)), keep(new THREE.MeshLambertMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 })));
    m.rotation.x = -Math.PI / 2; if (lot.sgn > 0) m.rotation.z = Math.PI;
    m.position.set(lot.x, 0.06, lot.st.z + lot.sgn * (RH + PARVIS / 2)); m.renderOrder = 1; city.add(m);
  }
  const pick = [], blabels = [];
  for (const lot of LOTS) {
    const { b } = lot;
    const plot = plane(lot.w + 1.6, lot.d + 1.6 + PARVIS, C.walk, 0.02); plot.position.set(lot.x, 0.02, lot.z - lot.sgn * PARVIS / 2); city.add(plot);
    if (b.style === 'vide') {
      const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([a, c]) => new THREE.Vector3(lot.x + a * lot.w / 2, 0.1, lot.z + c * lot.d / 2));
      const line = new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints(pts)), keep(new THREE.LineDashedMaterial({ color: col.ec, dashSize: 1, gapSize: 0.6 }))); line.computeLineDistances(); city.add(line);
      const post = box(city, 0.25, 2.2, 0.25, lot.x, 1.1, lot.faceZ - lot.sgn * 0.4, lam('#64748b')); post.userData.id = lot.id; pick.push(post);
      const board = new THREE.Mesh(BOX, [lam('#ffffff'), lam('#ffffff'), lam('#ffffff'), lam('#ffffff'), new THREE.MeshLambertMaterial({ map: facade({ ...lot, h: 3, w: 3.5 }) }), new THREE.MeshLambertMaterial({ map: facade({ ...lot, h: 3, w: 3.5 }) })]);
      board.scale.set(3.5, 2.4, 0.2); board.position.set(lot.x, 2.6, lot.faceZ - lot.sgn * 0.4); board.userData.id = lot.id; city.add(board); pick.push(board);
    } else {
      const st = sideTexOf(b.rive, lot.quartier).clone(); st.repeat.set(Math.max(1, lot.w / 2.6), Math.max(1, lot.h / 2.6)); st.needsUpdate = true; keep(st);
      const side = keep(new THREE.MeshLambertMaterial({ map: st })), front = keep(new THREE.MeshLambertMaterial({ map: facade(lot) })), roof = roofMat;
      const m = new THREE.Mesh(BOX, [side, side, roof, roof, lot.sgn < 0 ? front : side, lot.sgn < 0 ? side : front]);
      m.scale.set(lot.w, lot.h, lot.d); m.position.set(lot.x, lot.h / 2, lot.z); m.userData.id = lot.id; m.castShadow = true; m.receiveShadow = true; city.add(m); pick.push(m);
      box(city, lot.w + 0.3, 0.25, lot.d + 0.3, lot.x, lot.h + 0.12, lot.z, lam(col[b.rive]));
      archi(lot);
      box(city, 1.6, 2, 0.2, lot.x, 1, lot.faceZ - lot.sgn * 0.11, lam(dark ? '#e2e8f0' : '#1e293b'));
    }
    groundName(lot);
    const lb = label(b.court, { border: col[b.rive], icon: SYMBOLES[lot.id][0], iconColor: col[b.rive], k: 0.0095 }); lb.position.set(lot.x, Math.max(lot.h, 2.6) + 1.5, lot.z); lb.userData.id = lot.id; city.add(lb); pick.push(lb); blabels.push(lb);
  }

  // Végétation par quartier (un appel de dessin par espèce) : massifs fleuris (international), arbres ronds
  // (rive EC), conifères (rive CAC), cyprès (justice). Puis réverbères aux couleurs du quartier.
  const M4 = new THREE.Matrix4(), Q0 = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3();
  const instanced = (geo, mat, items) => { if (!items.length) return; const im = new THREE.InstancedMesh(geo, mat, items.length); im.castShadow = true; items.forEach(([x, y, z, sx, sy, sz], i) => { M4.compose(V3.set(x, y, z), Q0, S3.set(sx, sy ?? sx, sz ?? sx)); im.setMatrixAt(i, M4); }); city.add(im); };
  {
    const spots = []; let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let x = AVENUES[0] + 3.5; x <= AVENUES[3] - 3.5; x += 3) for (let z = STREETS[0].z - 6; z <= STREETS[6].z + 6; z += 3) {
      const px = x + (rnd() - 0.5) * 1.4, pz = z + (rnd() - 0.5) * 1.4;
      if (STREETS.some((t) => Math.abs(pz - t.z) < RH + 1.4) || AVENUES.some((ax) => Math.abs(px - ax) < RH + 1)) continue;
      if (px > RIVER.x0 - 1 && px < RIVER.x1 + 1 && pz > RIVER.z0 - 1 && pz < RIVER.z1 + 1) continue;
      if (blocked(px, pz, 1.4) || LOTS.some((l) => Math.abs(px - l.x) < l.w / 2 + 1.4 && Math.abs(pz - l.z) < l.d / 2 + 1.4)) continue;
      if (rnd() < 0.45) continue;
      spots.push([px, pz, 0.75 + rnd() * 0.35, zoneKind(px, pz)]);
    }
    const trunks = spots.filter((p) => p[3] !== 'intl').map(([x, z, k]) => [x, 0.4 * k, z, k]);
    instanced(keep(new THREE.CylinderGeometry(0.13, 0.17, 0.8, 5)), lam('#7c5a3a'), trunks);
    instanced(keep(new THREE.SphereGeometry(0.75, 10, 8)), lam(dark ? '#15803d' : '#5aa55f'), spots.filter((p) => p[3] === 'ec').map(([x, z, k]) => [x, 1.3 * k, z, k]));
    instanced(keep(new THREE.ConeGeometry(0.6, 1.6, 7)), lam(dark ? '#166534' : '#3f8a52'), spots.filter((p) => p[3] === 'cac').map(([x, z, k]) => [x, 1.5 * k, z, k]));
    instanced(keep(new THREE.ConeGeometry(0.32, 2.4, 7)), lam(dark ? '#14532d' : '#2f6b3f'), spots.filter((p) => p[3] === 'justice').map(([x, z, k]) => [x, 1.6 * k, z, k]));
    const beds = spots.filter((p) => p[3] === 'intl');
    instanced(keep(new THREE.CylinderGeometry(0.9, 0.9, 0.35, 10)), lam(dark ? '#334155' : '#94a3b8'), beds.map(([x, z]) => [x, 0.17, z, 1]));
    instanced(keep(new THREE.SphereGeometry(0.75, 8, 6)), lam('#f472b6'), beds.map(([x, z, k]) => [x, 0.45, z, k, 0.5 * k, k]));
  }
  {
    const lamps = { intl: [], ec: [], cac: [], justice: [] }, posts = [];
    for (const st of STREETS) for (const side of [-1, 1]) for (let x = AVENUES[0] + 4; x <= AVENUES[3] - 4; x += 6) {
      const z = st.z + side * (RH + 0.25);
      if (Math.abs(x) < RIVER.x1 + 1 && st.z > RIVER.z0 && st.z < RIVER.z1) continue;
      if (LOTS.some((l) => l.st === st && l.sgn === side && Math.abs(x - l.x) < 1.6)) continue;
      posts.push([x, 1.3, z, 1, 2.6, 1]); lamps[zoneKind(x, z)].push([x, 2.7, z, 1]);
    }
    instanced(keep(new THREE.CylinderGeometry(0.06, 0.08, 1, 6)), lam(dark ? '#94a3b8' : '#475569'), posts);
    const head = keep(new THREE.SphereGeometry(0.24, 10, 8));
    for (const k of Object.keys(lamps)) instanced(head, lam(ACC[k], { emissive: ACC[k], emissiveIntensity: dark ? 0.7 : 0.25 }), lamps[k]);
    // Place du globe : mâts et drapeaux ; place de la justice : quatre colonnes autour de la fontaine.
    FLAGS.forEach((c, i) => { const a = (i / FLAGS.length) * Math.PI * 2, x = Math.cos(a) * 4.2, z = -61 + Math.sin(a) * 3.2; box(city, 0.07, 3, 0.07, x, 1.5, z, lam('#94a3b8')); box(city, 0.05, 0.55, 0.9, x, 2.7, z + 0.45, lam(c)); });
    for (const [dx, dz] of [[-3.6, -2.2], [3.6, -2.2], [-3.6, 2.2], [3.6, 2.2]]) { const c = new THREE.Mesh(COL, lam(dark ? '#e7e5e4' : '#f5f0e6')); c.scale.set(1.3, 3, 1.3); c.position.set(dx, 1.5, 45 + dz); city.add(c); }
  }

  // Véhicule
  const car = new THREE.Group();
  box(car, 1.9, 0.75, 3.6, 0, 0.75, 0, lam(col.primary));
  box(car, 1.6, 0.65, 1.7, 0, 1.45, -0.25, lam(dark ? '#cbd5e1' : '#1e293b'));
  const wheelG = keep(new THREE.CylinderGeometry(0.38, 0.38, 0.32, 12));
  for (const [sx, sz] of [[-0.95, 1.15], [0.95, 1.15], [-0.95, -1.15], [0.95, -1.15]]) { const w = new THREE.Mesh(wheelG, lam('#111827')); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.38, sz); car.add(w); }
  box(car, 1.5, 0.2, 0.1, 0, 0.9, 1.82, lam('#fde68a'));
  car.scale.setScalar(0.75); city.add(car);
  // Tout ce qui a du volume projette une ombre (les sols la reçoivent).
  city.traverse((o) => { if (o.isMesh && o.geometry?.type !== 'PlaneGeometry' && o.material?.fog !== false && !o.material?.transparent) o.castShadow = true; });

  // Personnages (géométries partagées)
  const DISC = keep(new THREE.CircleGeometry(0.62, 18).rotateX(-Math.PI / 2));
  const ROBE = keep(new THREE.CylinderGeometry(0.36, 0.48, 1.35, 10)), HEAD = keep(new THREE.SphereGeometry(0.28, 12, 10)), HAT = keep(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10));
  const figure = (c, hat = false) => {
    const g = new THREE.Group();
    const r = new THREE.Mesh(ROBE, lam(c)); r.position.y = 0.68; g.add(r);
    const h = new THREE.Mesh(HEAD, lam('#f1c7a3')); h.position.y = 1.62; g.add(h);
    if (hat) { const t = new THREE.Mesh(HAT, lam('#1f2937')); t.position.y = 1.92; g.add(t); }
    return g;
  };
  const walker = figure(col.primary, true);

  // ---------- Intérieurs (construits à la première visite, gardés ensuite)
  const rooms = new Map();
  function buildRoom(lot) {
    if (rooms.has(lot.id)) return rooms.get(lot.id);
    const { b } = lot, hex = col[b.rive], W = 24, D = 18;
    const sc = new THREE.Scene(); sc.background = new THREE.Color(dark ? '#111827' : '#eef2f7');
    sc.add(new THREE.HemisphereLight(0xffffff, 0x8892a0, 1.25)); const l = new THREE.DirectionalLight(0xffffff, 0.45); l.position.set(8, 30, 12); sc.add(l);
    // Sol selon le quartier : parquet (EC), moquette (CAC), carrelage (international), damier de marbre (justice).
    { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), q = lot.quartier;
      x.fillStyle = q === 'ec' ? (dark ? '#5b4636' : '#c9a27a') : q === 'cac' ? (dark ? '#3b2f5c' : '#cfc3ea') : q === 'intl' ? (dark ? '#334155' : '#e2e8f0') : (dark ? '#44403c' : '#f1ede4'); x.fillRect(0, 0, 128, 128);
      x.strokeStyle = 'rgba(0,0,0,.16)'; x.lineWidth = 2;
      if (q === 'ec') for (let y = 0, r = 0; y < 128; y += 16, r++) { x.beginPath(); x.moveTo(0, y); x.lineTo(128, y); x.stroke(); for (let i = (r % 3) * 21; i < 128; i += 64) { x.beginPath(); x.moveTo(i, y); x.lineTo(i, y + 16); x.stroke(); } }
      else if (q === 'justice') { x.fillStyle = dark ? 'rgba(0,0,0,.25)' : 'rgba(0,0,0,.09)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) x.fillRect(i * 32, j * 32, 32, 32); }
      else if (q === 'intl') for (let i = 0; i <= 128; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); }
      grain(x, 128, 128, q === 'cac' ? 2600 : 900, q === 'cac' ? 0.1 : 0.06);
      const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(W / 5, D / 5);
      const fl = new THREE.Mesh(keep(new THREE.PlaneGeometry(W, D)), keep(new THREE.MeshLambertMaterial({ map: t }))); fl.rotation.x = -Math.PI / 2; sc.add(fl); }
    const wall = lam(hex, { transparent: true, opacity: 0.55 });
    box(sc, W, 2.4, 0.4, 0, 1.2, -D / 2, wall); box(sc, 0.4, 2.4, D, -W / 2, 1.2, 0, wall); box(sc, 0.4, 2.4, D, W / 2, 1.2, 0, wall);
    box(sc, W / 2 - 2, 2.4, 0.4, -(W / 4 + 1), 1.2, D / 2, wall); box(sc, W / 2 - 2, 2.4, 0.4, W / 4 + 1, 1.2, D / 2, wall);
    box(sc, 4, 0.03, 1.6, 0, 0.02, D / 2 - 0.7, lam(dark ? '#e2e8f0' : '#1e293b'));
    const plinth = lam('#7c5a3a'); box(sc, W, 0.5, 0.45, 0, 0.25, -D / 2 + 0.05, plinth); box(sc, 0.45, 0.5, D, -W / 2 + 0.05, 0.25, 0, plinth); box(sc, 0.45, 0.5, D, W / 2 - 0.05, 0.25, 0, plinth);
    const ex = label('Sortie', { size: 34, k: 0.009 }); ex.position.set(0, 2.2, D / 2 - 0.5); sc.add(ex);
    const title = label(b.nom, { border: hex, size: 50, k: 0.011, icon: SYMBOLES[lot.id][0], iconColor: hex }); title.position.set(0, 3.8, -D / 2 + 0.6); sc.add(title);
    const people = [], groups = [];
    const wood = lam('#8b5e3c');
    const put = (g, x, z, face) => {
      const f = figure(ROLEC[g.role] || col.commun, g.role === 'magistrat'); f.position.set(x, 0, z); f.lookAt(face[0], 0, face[1]); sc.add(f);
      const first = !groups.includes(g);
      const c = ROLEC[g.role] || col.commun;
      // Pastille au sol de la couleur du rôle, et une étiquette pour chacun (la première du groupe porte l'effectif).
      const disc = new THREE.Mesh(DISC, lam(c, { transparent: true, opacity: 0.35 })); disc.position.set(x, 0.03, z); sc.add(disc);
      let lb;
      if (first) { groups.push(g); lb = label(groupLabel(g), { border: c, size: 34, k: 0.0072 }); lb.position.set(x, 2.55, z); }
      else { lb = label(g.label.length > 24 ? `${g.label.slice(0, 22)}…` : g.label, { border: c, size: 28, k: 0.0052 }); lb.position.set(x, 2.3, z); lb.userData.near = true; }
      sc.add(lb);
      people.push({ mesh: f, x, z, qui: g.qui, fait: g.fait, label: g.label, g, first, color: c, lb });
    };
    const salle = SALLES[lot.id] || { layout: 'bureau', groupes: [] };
    const seated = salle.groupes.filter((g) => !g.debout).flatMap((g) => Array.from({ length: g.n }, () => g));
    const standing = salle.groupes.filter((g) => g.debout);
    if (salle.layout === 'rangs') {
      box(sc, 7, 0.5, 2, 0, 0.25, -D / 2 + 2.4, wood);
      seated.forEach((g, i) => {
        if (i === 0) return put(g, 0, -D / 2 + 2.4, [0, 0]);
        const k = i - 1, cols = 12, r = Math.floor(k / cols), c = k % cols; put(g, (c - (cols - 1) / 2) * 1.75, -3.6 + r * 1.75, [(c - (cols - 1) / 2) * 1.75, -D]);
      });
    } else if (salle.layout === 'tribunal') {
      box(sc, Math.max(6, seated.length * 2.3), 1.1, 1.5, 0, 0.55, -4.8, wood);
      seated.forEach((g, i) => put(g, (i - (seated.length - 1) / 2) * 2.3, -6.1, [(i - (seated.length - 1) / 2) * 2.3, 10]));
    } else if (salle.layout === 'table') {
      const n = seated.length, rx = clamp(n * 0.48, 3.4, 10), rz = clamp(n * 0.3, 2.4, 5.8);
      const tb = new THREE.Mesh(keep(new THREE.CylinderGeometry(1, 1, 0.25, 32)), wood); tb.scale.set(Math.max(2, rx - 1.6), 1, Math.max(1.5, rz - 1.6)); tb.position.set(0, 1, -1); sc.add(tb);
      seated.forEach((g, i) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; put(g, Math.cos(a) * rx, Math.sin(a) * rz - 1, [0, -1]); });
    } else {
      box(sc, Math.max(5, seated.length * 2.7), 1, 1.6, 0, 0.5, -4.4, wood);
      seated.forEach((g, i) => put(g, (i - (seated.length - 1) / 2) * 2.7, -5.7, [(i - (seated.length - 1) / 2) * 2.7, 10]));
    }
    standing.forEach((g, i) => { for (let k = 0; k < g.n; k++) put(g, W / 2 - 2.2 - k * 1.6, -2.4 + i * 3.2, [0, 0]); });
    // Panneaux des pancartes, le long du mur ouest.
    const gap = Math.min(2.8, (D - 5) / Math.max(1, b.pancartes.length));
    b.pancartes.forEach((p, i) => {
      const z = -D / 2 + 2.8 + i * gap;
      box(sc, 0.2, 1.5, gap * 0.8, -W / 2 + 0.35, 1.5, z, lam(dark ? '#f8fafc' : '#ffffff'));
      const lb = label(p.qui.length > 30 ? `${p.qui.slice(0, 28)}…` : p.qui, { size: 30, k: 0.0062, border: hex }); lb.position.set(-W / 2 + 1.4, 2.6, z); sc.add(lb);
      people.push({ x: -W / 2 + 1.8, z, qui: p.qui, fait: p.fait, label: p.qui, panneau: true, first: true });
    });
    sc.add(walker);
    // Tableau des présents, au mur du fond : qui est qui, à quelle couleur.
    if (groups.length) {
      const c = document.createElement('canvas'), x = c.getContext('2d'), lh = 46; c.width = 720; c.height = 70 + groups.length * lh;
      x.fillStyle = dark ? '#0f172a' : '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.strokeStyle = hex; x.lineWidth = 8; x.strokeRect(4, 4, c.width - 8, c.height - 8);
      x.font = '800 32px -apple-system, "Segoe UI", Roboto, Arial, sans-serif'; x.fillStyle = dark ? '#e2e8f0' : '#0f172a'; x.textBaseline = 'middle'; x.fillText('Qui siège ici', 28, 38);
      x.font = '600 28px -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
      groups.forEach((g, i) => { const y = 70 + i * lh + lh / 2 - 6; x.fillStyle = ROLEC[g.role] || col.commun; x.beginPath(); x.arc(44, y, 13, 0, Math.PI * 2); x.fill(); x.fillStyle = dark ? '#e2e8f0' : '#0f172a'; const t = groupLabel(g); x.fillText(t.length > 40 ? `${t.slice(0, 38)}…` : t, 72, y); });
      const t = canvasTex(c), bw = 6.2, bh = bw * c.height / c.width;
      const bd = new THREE.Mesh(keep(new THREE.PlaneGeometry(bw, bh)), keep(new THREE.MeshLambertMaterial({ map: t }))); bd.position.set(W / 2 - bw / 2 - 0.6, Math.max(1.3, 2.3 - bh / 4), -D / 2 + 0.22); sc.add(bd);
    }
    const room = { scene: sc, people, groups, W, D, labels: sc.children.filter((o) => o.isSprite && !o.userData.near) };
    rooms.set(lot.id, room); return room;
  }

  // ---------- Carte (minicarte et grande carte, même dessin)
  const MAP = { w: TERRAIN.x * 2, h: TERRAIN.z * 2 };
  const GXm = TERRAIN.x - 1, GZm = TERRAIN.z - 1;
  function drawMap(ctx, Wp, Hp, scale, withNames) {
    const X = (x) => Wp / 2 + x * scale, Z = (z) => Hp / 2 + z * scale;
    ctx.fillStyle = C.ground; ctx.fillRect(0, 0, Wp, Hp);
    const R = (x0, z0, x1, z1, c) => { ctx.fillStyle = c; ctx.fillRect(X(x0), Z(z0), (x1 - x0) * scale, (z1 - z0) * scale); };
    const GX = TERRAIN.x, GZ = TERRAIN.z;
    R(-GX, -GZ, GX, RIVER.z0, C.north); R(-GX, RIVER.z1, GX, GZ, C.south);
    R(-GX, RIVER.z0, RIVER.x0, RIVER.z1, C.ecz); R(RIVER.x1, RIVER.z0, GX, RIVER.z1, C.cacz); R(RIVER.x0, RIVER.z0, RIVER.x1, RIVER.z1, C.river);
    for (const s of STREETS) R(AVENUES[0] - RH, s.z - RH, AVENUES[3] + RH, s.z + RH, C.road);
    for (const x of AVENUES) R(x - RH, STREETS[0].z - RH, x + RH, STREETS[6].z + RH, C.road);
    for (const l of LOTS) {
      if (l.b.style === 'vide') { ctx.setLineDash([3, 2]); ctx.strokeStyle = col.ec; ctx.lineWidth = 1.2; ctx.strokeRect(X(l.x - l.w / 2), Z(l.z - l.d / 2), l.w * scale, l.d * scale); ctx.setLineDash([]); }
      else R(l.x - l.w / 2, l.z - l.d / 2, l.x + l.w / 2, l.z + l.d / 2, col[l.b.rive]);
    }
    if (!withNames) return;
    ctx.save(); ctx.globalAlpha = 0.55; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = `800 ${Math.round(scale * 2.6)}px -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
    for (const [t, x, z, c] of [['QUARTIER INTERNATIONAL', -GXm, -GZm, col.primary], ['RIVE EC · L’ORDRE', -GXm, RIVER.z0 + 0.6, col.ec], ['RIVE CAC · L’AUDIT', RIVER.x1 + 0.6, RIVER.z0 + 0.6, col.cac], ['QUARTIER JUDICIAIRE', -GXm, RIVER.z1 + 0.6, '#a16207']]) { ctx.fillStyle = c; ctx.fillText(t, X(x) + 4, Z(z) + 3); }
    ctx.restore();
    const fs = Math.round(scale * 1.9);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const s of STREETS) {
      ctx.font = `700 ${fs}px -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
      const tw = ctx.measureText(s.nom).width + fs; ctx.fillStyle = col.text; rr(ctx, X(0) - tw / 2, Z(s.z) - fs * 0.75, tw, fs * 1.5, fs * 0.4); ctx.fill();
      ctx.fillStyle = col.card; ctx.fillText(s.nom, X(0), Z(s.z) + 1);
    }
    ctx.font = `600 ${fs}px -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
    for (const l of LOTS) {
      const words = l.b.court.split(' '), lines = []; let cur = '';
      for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (ctx.measureText(t).width > l.w * scale * 1.35 && cur) { lines.push(cur); cur = w; } else cur = t; }
      lines.push(cur);
      const cx = X(l.x), cy = Z(l.z), lh = fs * 1.1;
      lines.forEach((t, i) => {
        const y = cy + (i - (lines.length - 1) / 2) * lh;
        ctx.lineWidth = 3; ctx.strokeStyle = l.b.style === 'vide' ? C.ground : col[l.b.rive]; ctx.strokeText(t, cx, y); ctx.fillStyle = l.b.style === 'vide' ? col.ec : '#ffffff'; ctx.fillText(t, cx, y);
      });
    }
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const miniBg = document.createElement('canvas');
  const setupMini = () => {
    const w = mini.clientWidth || 84, h = mini.clientHeight || 124; mini.width = w * dpr; mini.height = h * dpr;
    miniBg.width = mini.width; miniBg.height = mini.height;
    drawMap(miniBg.getContext('2d'), miniBg.width, miniBg.height, Math.min(miniBg.width / MAP.w, miniBg.height / MAP.h), false);
  };
  setupMini();
  const drawCar = (ctx, X, Z, scale, s) => {
    if (S.route) { ctx.strokeStyle = col.primary; ctx.lineWidth = Math.max(1.5, scale * 0.9); ctx.setLineDash([scale * 2, scale * 1.4]); ctx.beginPath(); ctx.moveTo(X(S.pos.x), Z(S.pos.z)); for (const p of S.route.pts.slice(S.route.i)) ctx.lineTo(X(p.x), Z(p.z)); ctx.stroke(); ctx.setLineDash([]); }
    const x = X(S.inside ? S.inside.stop.x : S.pos.x), z = Z(S.inside ? S.inside.stop.z : S.pos.z), hd = S.inside ? Math.PI : S.heading;
    ctx.save(); ctx.translate(x, z); ctx.rotate(-hd + Math.PI);
    ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#111827'; ctx.lineWidth = Math.max(1, s * 0.12);
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, s * 0.8); ctx.lineTo(0, s * 0.4); ctx.lineTo(-s * 0.7, s * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  };
  const drawMini = () => {
    const ctx = mini.getContext('2d'), sc = Math.min(mini.width / MAP.w, mini.height / MAP.h);
    ctx.drawImage(miniBg, 0, 0); drawCar(ctx, (x) => mini.width / 2 + x * sc, (z) => mini.height / 2 + z * sc, sc, 7 * dpr);
  };
  let bigScale = 0;
  const drawBig = () => {
    const wrap = big.parentElement, avail = wrap.clientWidth || 360;
    bigScale = Math.max(5, Math.min(8, (avail - 8) / MAP.w));
    big.style.width = `${MAP.w * bigScale}px`; big.style.height = `${MAP.h * bigScale}px`; big.width = MAP.w * bigScale * dpr; big.height = MAP.h * bigScale * dpr;
    const ctx = big.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const Wp = MAP.w * bigScale, Hp = MAP.h * bigScale;
    drawMap(ctx, Wp, Hp, bigScale, true); drawCar(ctx, (x) => Wp / 2 + x * bigScale, (z) => Hp / 2 + z * bigScale, bigScale, 9);
    const cz = Hp / 2 + (S.inside ? S.inside.stop.z : S.pos.z) * bigScale, cx = Wp / 2 + (S.inside ? S.inside.stop.x : S.pos.x) * bigScale;
    wrap.scrollTop = Math.max(0, cz - wrap.clientHeight / 2); wrap.scrollLeft = Math.max(0, cx - wrap.clientWidth / 2);
  };

  // ---------- État
  const S = {
    pos: new THREE.Vector3(0, 0, 31), heading: Math.PI, v: 0, camYaw: Math.PI, view: 'chase', look: new THREE.Vector3(0, 1, 40),
    tilt: 0.45, enterCd: { id: null, until: 0 }, inside: null, room: null, wv: { x: 0, z: 0 }, walkTo: null, focus: null, near: null, route: null, tour: null, quiz: null, wantHeading: null, instant: false,
  };
  let lastWhere = '';

  // ---------- Fiches d'information (mises à jour seulement quand l'état change)
  const pill = (b) => `<span class="v3-sub"><span class="${b.rive}">●</span> ${VILLE.rives[b.rive]} · ${esc(b.type)}</span>`;
  const streetChips = (st, cur) => `<div class="v3-chips">${LOTS.filter((l) => l.st === st).sort((a, b) => a.x - b.x).map((l) => `<button type="button" data-a="go" data-id="${l.id}" class="${l.b.rive}"${l === cur ? ' disabled' : ''}>${svgIcon(l.id)}<span style="color:var(--text)">${esc(l.b.court)}</span></button>`).join('')}</div>`;
  const tourBar = () => (S.tour ? `<div class="v3-sub" style="margin-top:6px">Parcours du palais · étape ${S.tour.i + 1} / ${TOUR3D.length}</div>` : '');
  function setCard() {
    let h;
    if (S.inside) {
      const r = S.room, b = S.inside.b, f = S.focus;
      const firsts = r.people.filter((p) => p.first && !p.panneau), boards = r.people.filter((p) => p.panneau);
      const compo = `<ul class="v3-compo">${firsts.map((p) => `<li><button type="button" data-a="to" data-i="${r.people.indexOf(p)}"><i style="background:${p.color}"></i><span class="n">${p.g.approx ? '' : p.g.n}</span><span>${esc(p.g.label)}${p.g.debout ? ' <em>· présent, non membre</em>' : ''}</span></button></li>`).join('')}</ul>`;
      const chips = `${f ? '' : compo}<div class="v3-chips">${boards.map((p) => `<button type="button" data-a="to" data-i="${r.people.indexOf(p)}">▤ ${esc(p.qui.slice(0, 26))}</button>`).join('')}${f ? `<button type="button" data-a="unfocus">Composition</button>` : ''}</div>`;
      h = f ? `<div class="t"><span class="${b.rive}">${svgIcon(S.inside.id)}</span>${esc(f.qui)}</div><p>${md(f.fait)}</p>${chips}`
        : `<div class="t"><span class="${b.rive}">${svgIcon(S.inside.id)}</span>${esc(b.nom)}</div><p class="v3-sub">Composition (touchez une ligne pour aller vers la personne) :</p>${chips}`;
      h += `<div class="v3-acts"><button type="button" class="v3-btn" data-a="exit">Sortir</button>${opts.onFiche ? `<button type="button" class="v3-btn" data-a="fiche" data-f="${esc(b.fiche)}">Lire la fiche${opts.fiches?.[b.fiche] ? ` : ${esc(opts.fiches[b.fiche])}` : ''}</button>` : ''}${S.tour ? '<button type="button" class="v3-btn primary" data-a="tour-next">Bâtiment suivant ›</button>' : ''}</div>${tourBar()}`;
    } else if (S.route) {
      const b = S.route.lot.b;
      h = `<div class="t"><span class="${b.rive}">${svgIcon(b.id)}</span>En route : ${esc(b.court)}</div><div class="v3-acts"><button type="button" class="v3-btn" data-a="stop">Arrêter</button></div>${tourBar()}`;
    } else if (S.near) {
      const l = S.near, b = l.b, twin = b.jumeau && lotOf(b.jumeau);
      h = `<div class="t"><span class="${b.rive}">${svgIcon(l.id)}</span>${esc(b.nom)}</div><p class="clamp">${md(b.role)}</p><details class="v3-more"><summary>Détails</summary>${pill(b)}${b.chiffres?.length ? `<br>${b.chiffres.map(esc).join(' · ')}` : ''}<br>Symbole : ${esc(SYMBOLES[l.id][1])}.</details>
        <div class="v3-acts"><button type="button" class="v3-btn primary" data-a="enter">Entrer</button>${opts.onFiche ? `<button type="button" class="v3-btn" data-a="fiche" data-f="${esc(b.fiche)}">Fiche</button>` : ''}${twin ? `<button type="button" class="v3-btn" data-a="go" data-id="${twin.id}">Jumeau : ${esc(twin.b.court)}</button>` : ''}${S.tour ? '<button type="button" class="v3-btn" data-a="tour-next">Suivant ›</button><button type="button" class="v3-btn" data-a="tour-stop">Fin du parcours</button>' : ''}</div>${tourBar()}`;
    } else {
      const st = STREETS.reduce((a, t) => (Math.abs(t.z - S.pos.z) < Math.abs(a.z - S.pos.z) ? t : a));
      h = `${S.quiz ? '<div class="t">Trouvez le bon bâtiment</div>' : ''}<p class="v3-sub" style="margin:0 0 6px">Arrêtez-vous devant un bâtiment puis touchez « Entrer ». Glissez le doigt sur la scène, de haut en bas, pour voir plus loin ou de plus haut.</p><div class="v3-acts" style="margin-top:0"><button type="button" class="v3-btn primary" data-a="list">Aller à…</button>${S.quiz ? '<button type="button" class="v3-btn" data-a="quiz-stop">Arrêter le jeu</button>' : '<button type="button" class="v3-btn" data-a="tour">Parcours du palais</button><button type="button" class="v3-btn" data-a="quiz">Qui fait quoi ?</button>'}</div>
        <div class="v3-sub" style="margin-top:8px">${esc(st.nom)} :</div>${streetChips(st, null)}`;
    }
    card.innerHTML = h; card.scrollTop = 0; reframe();
  }
  function setWhere(force) {
    const x = S.inside ? S.inside.x : S.pos.x, z = S.inside ? S.inside.z : S.pos.z;
    const head = S.inside ? `Dans : ${S.inside.b.court}` : `${zoneName(x, z)}${streetName(z) ? ` · ${streetName(z)}` : ''}`;
    const q = S.quiz ? `<span class="q">Q${S.quiz.i + 1}/${S.quiz.order.length} · ${md(S.quiz.order[S.quiz.i].q)}</span>` : '';
    const html = `<b>${esc(head)}</b>${q || `<span class="v3-sub">${S.inside ? esc(S.inside.st.nom) : 'EC ◀ fleuve ▶ CAC · ▲ monde · ▼ justice'}</span>`}`;
    if (force || html !== lastWhere) { whereEl.innerHTML = html; lastWhere = html; }
  }
  const flashMsg = (txt, ok) => { flash.textContent = txt; flash.className = `v3-flash ${ok ? 'ok' : 'ko'}`; clearTimeout(flashMsg.t); flashMsg.t = setTimeout(() => { flash.className = 'v3-flash'; }, 1500); };

  // ---------- Listes (Aller à, options)
  function openList() {
    const cur = S.inside || S.near;
    sheet.innerHTML = `<div class="v3-sheet-head"><strong>Aller à</strong><div class="v3-opt"><button type="button" class="v3-btn ${S.instant ? '' : 'on'}" data-a="mode" data-v="drive">En voiture</button><button type="button" class="v3-btn ${S.instant ? 'on' : ''}" data-a="mode" data-v="instant">Instantané</button><button type="button" class="v3-btn" data-a="close">Fermer</button></div></div>
      ${QUARTIERS_LISTE.map((q) => `<h4><i style="background:${col[q.rive]}"></i>${esc(q.titre)}</h4><div class="v3-list">${q.ids.map((id) => { const l = lotOf(id); return `<button type="button" data-a="go" data-id="${id}" class="${l === cur ? 'here' : ''}"><span class="${l.b.rive}">${svgIcon(id)}</span><span>${esc(l.b.court)}<small>${esc(l.st.nom)} · ${zoneName(l.x, l.z)}</small></span></button>`; }).join('')}</div>`).join('')}`;
    sheet.hidden = false; sheet.scrollTop = 0;
  }
  function openCompo() {
    sheet.innerHTML = `<div class="v3-sheet-head"><strong>Qui compose chaque institution</strong><button type="button" class="v3-btn" data-a="close">Fermer</button></div><p class="v3-sub" style="margin:0 0 4px">Touchez une institution pour y aller.</p>${compositionHtml()}`;
    sheet.hidden = false; sheet.scrollTop = 0;
  }
  function openOpts() {
    sheet.innerHTML = `<div class="v3-sheet-head"><strong>Options</strong><button type="button" class="v3-btn" data-a="close">Fermer</button></div>
      <div class="v3-acts" style="flex-direction:column;align-items:stretch">
      <button type="button" class="v3-btn primary" data-a="tour">Parcours du palais (29 bâtiments, dans l’ordre des rues)</button>
      <button type="button" class="v3-btn" data-a="quiz">Qui fait quoi ? (12 questions)</button>
      <button type="button" class="v3-btn" data-a="compo">Composition de chaque institution</button>
      <button type="button" class="v3-btn" data-a="map">Carte de la ville</button>
      <button type="button" class="v3-btn" data-a="view">Caméra : ${S.view === 'top' ? 'vue du dessus' : 'derrière la voiture'} (changer)</button></div>
      <h4>Les symboles des façades</h4><div class="v3-list">${TOUR3D.map((id) => `<button type="button" data-a="go" data-id="${id}"><span class="${lotOf(id).b.rive}">${svgIcon(id)}</span><span>${esc(lotOf(id).b.court)}<small>${esc(SYMBOLES[id][1])}</small></span></button>`).join('')}</div>`;
    sheet.hidden = false; sheet.scrollTop = 0;
  }
  const closeSheets = () => { sheet.hidden = true; mapSheet.hidden = true; };
  const openMap = () => { sheet.hidden = true; mapSheet.hidden = false; requestAnimationFrame(drawBig); };

  // ---------- Déplacements
  function snapCamera() {
    const f = { x: Math.sin(S.camYaw), z: Math.cos(S.camYaw) };
    if (S.inside) { camera.position.set(S.pos.x, 14, S.pos.z + 11); S.look.set(S.pos.x, 0, S.pos.z - 3); }
    else if (S.view === 'top') { camera.position.set(S.pos.x, 52, S.pos.z + 16); S.look.set(S.pos.x, 0, S.pos.z); }
    else { camera.position.set(S.pos.x - f.x * 10, 6.2, S.pos.z - f.z * 10); S.look.set(S.pos.x + f.x * 5, 1.2, S.pos.z + f.z * 5); }
    camera.lookAt(S.look);
  }
  function placeAt(lot) { S.pos.set(lot.stop.x, 0, lot.stop.z); S.heading = lot.sgn < 0 ? Math.PI : 0; S.camYaw = S.heading; S.v = 0; S.near = lot; S.route = null; snapCamera(); }
  function goTo(lot, then = null) {
    closeSheets();
    if (S.inside) exit(true);
    if (S.instant) { placeAt(lot); setCard(); setWhere(); if (then === 'enter') enter(lot); return; }
    S.route = { pts: route(S.pos, lot), i: 0, lot, then }; S.near = null; S.wantHeading = null; setCard();
  }
  function arrive() {
    const { lot, then } = S.route; S.route = null; S.v = 0; S.near = lot; S.wantHeading = lot.sgn < 0 ? Math.PI : 0; setCard(); setWhere();
    if (then === 'enter') enter(lot);
  }
  function enter(lot) {
    if (S.quiz) {
      const item = S.quiz.order[S.quiz.i], ok = lot.id === item.r; if (ok) S.quiz.score++;
      const good = lotOf(item.r);
      flashMsg(ok ? 'Oui !' : `Non : ${good.b.court}`, ok);
      S.quiz.i++;
      if (S.quiz.i >= S.quiz.order.length) {
        const { score, order } = S.quiz; S.quiz = null; setWhere(true);
        opts.onQuizEnd?.(score, order.length);
        card.innerHTML = `<div class="t">${score} / ${order.length}</div><p>${score === order.length ? 'Tout est à sa place.' : 'Entrez dans les bâtiments manqués et écoutez ceux qui y siègent.'}</p><div class="v3-acts"><button type="button" class="v3-btn primary" data-a="quiz">Rejouer</button><button type="button" class="v3-btn" data-a="tour">Parcours du palais</button></div>`;
        if (!ok) return;
      } else { setWhere(true); if (!ok) { card.innerHTML = `<div class="t">Ce n’était pas ${esc(lot.b.court)}</div><p>La bonne réponse : <strong>${esc(good.b.nom)}</strong>, ${esc(good.st.nom)}.</p><div class="v3-acts"><button type="button" class="v3-btn primary" data-a="go" data-id="${good.id}">Y aller</button></div>`; return; } }
    }
    S.inside = lot; S.room = buildRoom(lot); S.room.scene.add(walker); S.focus = null; S.walkTo = null; S.wv = { x: 0, z: 0 }; S.route = null;
    S.pos.set(0, 0, S.room.D / 2 - 2); walker.position.copy(S.pos); walker.rotation.y = Math.PI;
    snapCamera(); setCard(); setWhere(); closeSheets();
  }
  function exit(silent) {
    const lot = S.inside; if (!lot) return;
    S.inside = null; S.room = null; S.focus = null; S.walkTo = null; S.enterCd = { id: lot.id, until: performance.now() + 1500 };
    S.pos.set(lot.stop.x, 0, lot.stop.z); S.heading = lot.sgn < 0 ? 0 : Math.PI; S.camYaw = S.heading; S.v = 0; S.near = lot; snapCamera();
    if (!silent) { setCard(); setWhere(); }
  }
  const startTour = () => { S.quiz = null; S.tour = { i: 0 }; setWhere(true); goTo(lotOf(TOUR3D[0])); };
  const nextTour = () => { if (!S.tour) return; S.tour.i++; if (S.tour.i >= TOUR3D.length) { S.tour = null; if (S.inside) exit(true); setCard(); card.insertAdjacentHTML('afterbegin', '<p><strong>Parcours terminé.</strong> Refaites-le de mémoire : nommez chaque bâtiment avant d’y arriver.</p>'); return; } goTo(lotOf(TOUR3D[S.tour.i])); };
  const startQuiz = () => {
    S.tour = null; closeSheets(); if (S.inside) exit(true);
    const order = VILLE.quiz.map((q, i) => ({ q, k: Math.random() + i / 1e6 })).sort((a, b) => a.k - b.k).map((x) => x.q).slice(0, 12);
    S.quiz = { order, i: 0, score: 0 }; S.near = null; setWhere(true); setCard();
  };

  // ---------- Commandes
  const keys = {};
  let turboOn = false, stick = null, visible = true;
  const onDown = (e) => {
    if (!visible || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (e.repeat) { keys[k] = true; return; }
    keys[k] = true;
    if (k === 'enter' || k === 'e') { e.preventDefault(); if (!sheet.hidden || !mapSheet.hidden) return; if (S.inside) exit(); else if (S.near) enter(S.near); }
    else if (k === 'escape') { if (!sheet.hidden || !mapSheet.hidden) closeSheets(); else if (S.inside) exit(); }
    else if (k === 'l') { if (sheet.hidden) openList(); else closeSheets(); }
    else if (k === 'm') { if (mapSheet.hidden) openMap(); else closeSheets(); }
    else if (k === 'v') { S.view = S.view === 'top' ? 'chase' : 'top'; }
    else if (k === 'pageup' || k === '+') S.tilt = clamp(S.tilt - 0.15, 0, 1);
    else if (k === 'pagedown' || k === '-') S.tilt = clamp(S.tilt + 0.15, 0, 1);
  };
  const onUp = (e) => { keys[e.key.toLowerCase()] = false; };
  window.addEventListener('keydown', onDown); window.addEventListener('keyup', onUp);
  const stickEl = $('#v3-stick'), knob = stickEl.querySelector('i');
  stickEl.addEventListener('pointerdown', (e) => { stick = { id: e.pointerId, x0: e.clientX, y0: e.clientY, jx: 0, jy: 0 }; stickEl.setPointerCapture(e.pointerId); });
  stickEl.addEventListener('pointermove', (e) => {
    if (!stick || e.pointerId !== stick.id) return;
    let dx = e.clientX - stick.x0, dy = e.clientY - stick.y0; const m = Math.hypot(dx, dy); if (m > 40) { dx *= 40 / m; dy *= 40 / m; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; stick.jx = dx / 40; stick.jy = dy / 40;
  });
  const stickEnd = (e) => { if (!stick || e.pointerId !== stick.id) return; stick = null; knob.style.transform = ''; };
  stickEl.addEventListener('pointerup', stickEnd); stickEl.addEventListener('pointercancel', stickEnd);
  // Turbo tant que le doigt reste dessus (pointerdown, et non click : réagit même quand un autre doigt tient le joystick).
  const setTurbo = (on) => { turboOn = on; turboBtn.classList.toggle('on', on); };
  turboBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); setTurbo(true); try { turboBtn.setPointerCapture(e.pointerId); } catch { /* ignore */ } });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) turboBtn.addEventListener(ev, () => setTurbo(false));
  turboBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  root.addEventListener('click', (e) => {
    const cpb = e.target.closest('#v3-sheet .cp-b[data-id]'); if (cpb) return goTo(lotOf(cpb.dataset.id));
    const t = e.target.closest('[data-a]'); if (!t || !root.contains(t)) return;
    const a = t.dataset.a;
    if (a === 'list') openList(); else if (a === 'opts') openOpts(); else if (a === 'map') openMap(); else if (a === 'close') closeSheets();
    else if (a === 'go') goTo(lotOf(t.dataset.id));
    else if (a === 'enter' && S.near) enter(S.near); else if (a === 'exit') exit();
    else if (a === 'to' && S.room) { const p = S.room.people[Number(t.dataset.i)]; const dx = S.pos.x - p.x, dz = S.pos.z - p.z, d = Math.hypot(dx, dz) || 1; S.walkTo = { x: p.x + dx / d * 1.4, z: p.z + dz / d * 1.4 }; }
    else if (a === 'stop') { S.route = null; setCard(); }
    else if (a === 'tour') startTour(); else if (a === 'tour-next') nextTour(); else if (a === 'tour-stop') { S.tour = null; setCard(); }
    else if (a === 'quiz') startQuiz(); else if (a === 'quiz-stop') { S.quiz = null; setWhere(true); setCard(); }
    else if (a === 'view') { S.view = S.view === 'top' ? 'chase' : 'top'; closeSheets(); }
    else if (a === 'mode') { S.instant = t.dataset.v === 'instant'; openList(); }
    else if (a === 'fiche') opts.onFiche?.(t.dataset.f);
    else if (a === 'quit') opts.onQuit?.();
    else if (a === 'unfocus') { S.focus = null; S.walkTo = null; setCard(); }
    else if (a === 'compo') openCompo();
    else if (e.target.closest('#v3-sheet .cp-b[data-id]')) goTo(lotOf(e.target.closest('.cp-b').dataset.id));
  });
  big.addEventListener('click', (e) => {
    const r = big.getBoundingClientRect(), x = (e.clientX - r.left - r.width / 2) / bigScale, z = (e.clientY - r.top - r.height / 2) / bigScale;
    let best = null, bd = 12; for (const l of LOTS) { const d = Math.hypot(l.x - x, l.z - z); if (d < bd) { bd = d; best = l; } }
    if (best) goTo(best);
  });
  // Toucher un bâtiment (ville) ou une personne (intérieur) dans la scène.
  const ray = new THREE.Raycaster(); let downAt = null, drag = null;
  canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; drag = { id: e.pointerId, y: e.clientY, t: S.tilt }; });
  canvas.addEventListener('pointermove', (e) => { if (drag && e.pointerId === drag.id && Math.abs(e.clientY - drag.y) > 8) S.tilt = clamp(drag.t + (e.clientY - drag.y) / 260, 0, 1); });
  const endDrag = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
  canvas.addEventListener('pointercancel', endDrag); canvas.addEventListener('pointerleave', endDrag);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); S.tilt = clamp(S.tilt + Math.sign(e.deltaY) * 0.08, 0, 1); }, { passive: false });
  canvas.addEventListener('pointerup', (e) => {
    endDrag(e);
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return; downAt = null;
    const r = canvas.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    if (S.inside) {
      const ms = S.room.people.filter((p) => p.mesh).map((p) => p.mesh); const hit = ray.intersectObjects(ms, true)[0]; if (!hit) return;
      let o = hit.object; while (o.parent && !ms.includes(o)) o = o.parent; const p = S.room.people.find((q) => q.mesh === o);
      if (p) { const dx = S.pos.x - p.x, dz = S.pos.z - p.z, d = Math.hypot(dx, dz) || 1; S.walkTo = { x: p.x + dx / d * 1.8, z: p.z + dz / d * 1.8 }; }
      return;
    }
    const hit = ray.intersectObjects(pick, false)[0]; if (hit) { const l = lotOf(hit.object.userData.id); if (l === S.near) enter(l); else goTo(l); }
  });
  const io = new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; }); io.observe(root); // plusieurs entrées possibles (détaché puis remis) : la dernière fait foi

  // ---------- Boucle
  function input() {
    const kf = (keys.arrowup || keys.z || keys.w ? 1 : 0) - (keys.arrowdown || keys.s ? 1 : 0);
    const kt = (keys.arrowleft || keys.q || keys.a ? 1 : 0) - (keys.arrowright || keys.d ? 1 : 0);
    const jm = stick ? Math.hypot(stick.jx, stick.jy) : 0;
    return { kf, kt, jx: stick?.jx || 0, jy: stick?.jy || 0, jm, turbo: !!keys.shift || turboOn, any: kf !== 0 || kt !== 0 || jm > 0.15 };
  }
  function stepCity(dt, I) {
    if (I.any && S.route) { S.route = null; setCard(); }
    if (I.any) S.wantHeading = null;
    const vmax = I.turbo ? 48 : 20; let vt = 0;
    if (S.route) {
      const R = S.route, p = S.pos;
      while (R.i < R.pts.length - 1 && hyp(R.pts[R.i], p) < Math.max(1.6, Math.abs(S.v) * 0.16)) R.i++;
      const w = R.pts[R.i], dw = hyp(w, p), last = R.i === R.pts.length - 1;
      if (last && dw < 0.9) { arrive(); vt = 0; } else {
        let rem = dw; for (let k = R.i; k < R.pts.length - 1; k++) rem += hyp(R.pts[k], R.pts[k + 1]);
        const want = Math.atan2(w.x - p.x, w.z - p.z), diff = angDiff(S.heading, want);
        S.heading += clamp(diff, -3.6 * dt, 3.6 * dt);
        vt = (rem > 40 ? (I.turbo ? 75 : 48) : (I.turbo ? 34 : 24)) * clamp(Math.cos(diff), 0.15, 1);
        if (!last) { const n = R.pts[R.i + 1], turn = Math.abs(angDiff(want, Math.atan2(n.x - w.x, n.z - w.z))); if (turn > 0.6) vt = Math.min(vt, 8 + dw * 1.3); }
        vt = Math.min(vt, Math.sqrt(2 * 22 * rem) + 0.8);
      }
    } else if (I.jm > 0.15 && I.jy > 0.45 && Math.abs(I.jx) < I.jy) {
      // Marche arrière : joystick tiré vers le bas ; incliné à gauche ou à droite, il braque.
      vt = -vmax * 0.45 * Math.min(1, I.jm);
      S.heading += I.jx * 2.4 * clamp(0.4 + Math.abs(S.v) / 8, 0.4, 1) * dt;
    } else if (I.jm > 0.15) {
      const a = S.camYaw, fx = Math.sin(a), fz = Math.cos(a), rx = -Math.cos(a), rz = Math.sin(a);
      const want = Math.atan2(fx * -I.jy + rx * I.jx, fz * -I.jy + rz * I.jx), diff = angDiff(S.heading, want);
      S.heading += clamp(diff, -3.2 * dt, 3.2 * dt); vt = Math.min(1, I.jm) * vmax * clamp(Math.cos(diff), 0.1, 1);
    } else {
      vt = I.kf * vmax * (I.kf < 0 ? 0.4 : 1);
      S.heading += I.kt * 2.5 * clamp(0.45 + Math.abs(S.v) / 12, 0.45, 1) * (S.v < -0.5 ? -1 : 1) * dt;
      if (S.wantHeading != null) { const d = angDiff(S.heading, S.wantHeading); S.heading += clamp(d, -2.5 * dt, 2.5 * dt); if (Math.abs(d) < 0.01) S.wantHeading = null; }
    }
    S.v += (vt - S.v) * Math.min(1, dt * (Math.abs(vt) < Math.abs(S.v) ? 4 : 2.2));
    if (Math.abs(S.v) < 0.03 && !vt) S.v = 0;
    S.pos.x += Math.sin(S.heading) * S.v * dt; S.pos.z += Math.cos(S.heading) * S.v * dt;
    if (pushOut(S.pos, CAR_R)) S.v *= Math.pow(0.15, dt);
    car.position.set(S.pos.x, 0, S.pos.z); car.rotation.y = S.heading;
    if (!S.route) {
      let best = null, bd = 4.5; for (const l of LOTS) { const d = hyp(l.stop, S.pos); if (d < bd) { bd = d; best = l; } }
      if (best !== S.near) { S.near = best; setCard(); }
      else if (!best) { const st = STREETS.reduce((a2, t) => (Math.abs(t.z - S.pos.z) < Math.abs(a2.z - S.pos.z) ? t : a2)); if (st !== S.cardStreet) { S.cardStreet = st; setCard(); } }
    }
  }
  function stepInside(dt, I) {
    if (I.any) S.walkTo = null;
    const sp = I.turbo ? 8 : 4.8, r = S.room; let tx = 0, tz = 0;
    if (S.walkTo) { const dx = S.walkTo.x - S.pos.x, dz = S.walkTo.z - S.pos.z, d = Math.hypot(dx, dz); if (d < 0.25) S.walkTo = null; else { const s = Math.min(sp, d * 3); tx = dx / d * s; tz = dz / d * s; } }
    else if (I.jm > 0.15) { const m = Math.min(1, I.jm) / I.jm; tx = I.jx * m * sp; tz = I.jy * m * sp; }
    else { const kx = -I.kt, kz = -I.kf, m = Math.hypot(kx, kz); if (m) { tx = kx / m * sp; tz = kz / m * sp; } }
    const k = Math.min(1, dt * 9); S.wv.x += (tx - S.wv.x) * k; S.wv.z += (tz - S.wv.z) * k;
    S.pos.x += S.wv.x * dt; S.pos.z += S.wv.z * dt;
    if (S.pos.z > r.D / 2 - 0.6 && Math.abs(S.pos.x) < 1.9 && S.wv.z > 0.5) { exit(); return; }
    S.pos.x = clamp(S.pos.x, -r.W / 2 + 0.8, r.W / 2 - 0.8); S.pos.z = clamp(S.pos.z, -r.D / 2 + 0.8, Math.abs(S.pos.x) < 1.9 ? r.D / 2 : r.D / 2 - 0.8);
    walker.position.set(S.pos.x, 0, S.pos.z);
    if (Math.hypot(S.wv.x, S.wv.z) > 0.4) walker.rotation.y += angDiff(walker.rotation.y, Math.atan2(S.wv.x, S.wv.z)) * Math.min(1, dt * 10);
    let best = null, bd = 2.2; for (const p of r.people) { const d = Math.hypot(p.x - S.pos.x, p.z - S.pos.z); if (d < bd) { bd = d; best = p; } }
    if (best !== S.focus) { S.focus = best; setCard(); }
  }
  const camTarget = new THREE.Vector3(), lookTarget = new THREE.Vector3();
  function stepCamera(dt) {
    const T = S.tilt, mix = (a, b) => a + (b - a) * T; // 0 : au ras du sol, voit loin ; 1 : vue plongeante
    if (S.inside) { camTarget.set(S.pos.x, mix(4, 14), S.pos.z + mix(6.5, 8)); lookTarget.set(S.pos.x, mix(1.4, 0), S.pos.z - mix(9, 2)); }
    else if (S.view === 'top') { S.camYaw = Math.PI; camTarget.set(S.pos.x, 52, S.pos.z + 16); lookTarget.set(S.pos.x, 0, S.pos.z); }
    else {
      S.camYaw += angDiff(S.camYaw, S.heading) * (1 - Math.exp(-dt * 2.6));
      const f = { x: Math.sin(S.camYaw), z: Math.cos(S.camYaw) }, sp = Math.abs(S.v), dist = mix(9, 13) + sp * 0.12, h = mix(3, 16) + sp * 0.1, ahead = mix(30, 5);
      camTarget.set(S.pos.x - f.x * dist, h, S.pos.z - f.z * dist); lookTarget.set(S.pos.x + f.x * ahead, mix(2.2, 0.6), S.pos.z + f.z * ahead);
      // À l'arrêt devant un bâtiment : vue plongeante sur sa façade, au-dessus des toits d'en face.
      if (S.near && !S.route && sp < 2) { const l = S.near; camTarget.set(S.pos.x - f.x * 9, mix(9, 18), S.pos.z - f.z * 9); lookTarget.set(l.x, l.h * mix(0.55, 0.3), l.faceZ); }
      // La caméra passe au-dessus d'un bâtiment plutôt qu'au travers.
      for (const l of LOTS) if (Math.abs(camTarget.x - l.x) < l.w / 2 + 2 && Math.abs(camTarget.z - l.z) < l.d / 2 + 2) camTarget.y = Math.max(camTarget.y, l.h + 3);
    }
    const fov = 58 + clamp((Math.abs(S.v) - 22) / 30, 0, 1) * 10; if (!S.inside && Math.abs(camera.fov - fov) > 0.2) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
    camera.position.lerp(camTarget, 1 - Math.exp(-dt * 6)); S.look.lerp(lookTarget, 1 - Math.exp(-dt * 9)); camera.lookAt(S.look);
  }
  let alive = true, last = performance.now(), frame = 0, whereT = 0;
  function loop(now) {
    if (!alive) return; requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!visible || document.hidden) return;
    const I = input();
    if (S.inside) stepInside(dt, I); else stepCity(dt, I);
    stepCamera(dt);
    globe.rotation.y += dt * 0.4; riverTex.offset.y -= dt * 0.08;
    if (!S.inside) { for (const sg of signs) { const d = camera.position.distanceTo(sg.position); sg.visible = d > 6 && d < (sg.userData.far || 60); } for (const lb of blabels) { const d = camera.position.distanceTo(lb.position); lb.visible = d > 16 && d < 48; } }
    else { for (const lb of S.room.labels) lb.visible = camera.position.distanceTo(lb.position) > 4.5; for (const p of S.room.people) if (p.lb?.userData.near) p.lb.visible = Math.hypot(p.x - S.pos.x, p.z - S.pos.z) < 4.2; } // trop proches, ils masqueraient la route
    renderer.render(S.inside ? S.room.scene : city, camera);
    if (++frame % 3 === 0) drawMini();
    whereT += dt; if (whereT > 0.3) { whereT = 0; setWhere(); }
  }
  snapCamera(); setWhere(true); setCard(); drawMini();
  ro.observe(card); card.addEventListener('toggle', reframe, true);
  requestAnimationFrame(loop);

  return {
    stop() {
      alive = false; ro.disconnect(); io.disconnect(); window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp);
      for (const r of rooms.values()) r.scene.clear(); city.clear();
      for (const d of disposables) { try { d.dispose(); } catch { /* ignore */ } }
      renderer.dispose();
    },
    goto(id, then) { const l = lotOf(id); if (l) goTo(l, then); },
    place(id) { const l = lotOf(id); if (l) { if (S.inside) exit(true); placeAt(l); setCard(); setWhere(); } },
    enter(id) { const l = lotOf(id); if (l) { if (S.inside) exit(true); placeAt(l); enter(l); } },
    state: S,
  };
}
