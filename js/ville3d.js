// La ville des institutions, version « palais mental » : deux boulevards le long d'un fleuve (rive EC à l'ouest,
// rive CAC à l'est), sept bandes de terrain = sept niveaux lus du sud au nord (régional, national, supervision,
// tutelle, discipline et recours, responsabilités, international), un pont par bande, les jumeaux face à face.
// De petits bâtiments marqués d'un symbole, un véhicule que l'on conduit (ou qu'un pilote mène), une vue drone
// par profession, et dans chaque bâtiment un hémicycle de ceux qui y siègent, que l'on regarde en tournant autour.
// Les étiquettes sont en HTML projeté (nettes à toute distance).
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
  { titre: 'Expert-comptable', rive: 'ec', ids: ['croec', 'chreg', 'cavec', 'cnoec', 'chnat', 'terrain', 'bercy'] },
  { titre: 'Commissaire aux comptes', rive: 'cac', ids: ['crcc', 'cncc', 'h2a', 'sanctions', 'amf', 'chancellerie', 'anc'] },
  { titre: 'Juridictions (et Tracfin)', rive: 'commun', ids: ['ce', 'ca', 'cass', 'ta', 'ccomptes', 'tj', 'tcorr', 'parquet', 'tracfin'] },
  { titre: 'International', rive: 'commun', ids: ['ifac', 'iesba', 'iaasb', 'iaesb', 'aceu', 'ue'] },
];

// ---------------------------------------------------------------------------------------------------------
// Plan de la ville, survolée en drone. Au sud, les quatre bandes des professions : un fleuve entre la rive EC
// (ouest) et la rive CAC (est), un boulevard et un pont par bande, les jumeaux face à face. Au nord, le fleuve
// s'arrête : l'esplanade des juridictions (deux bandes) et l'esplanade internationale accueillent, au centre, ce qui
// est commun aux deux professions ; ce qui n'est propre qu'au CAC reste sur sa rive. Les bandes se lisent du sud
// (régional) au nord (international) ; la couleur d'une bande est celle de sa fonction, la même sur les deux rives.
export const STREETS = [
  { id: 'intl', nom: 'International', z: -54, c: '#4f46e5' },
  { id: 'resp', nom: 'Responsabilités', z: -36, c: '#b45309' },
  { id: 'recours', nom: 'Discipline et recours', z: -18, c: '#b91c1c' },
  { id: 'tutelle', nom: 'Tutelle', z: 0, c: '#475569' },
  { id: 'sup', nom: 'Supervision', z: 18, c: '#c2410c' },
  { id: 'nat', nom: 'Échelon national', z: 36, c: '#0f766e' },
  { id: 'reg', nom: 'Échelon régional', z: 54, c: '#15803d' },
];
// Bâtiment → [bande, colonne (w = rive EC, e = rive CAC, cw / ce = de part et d'autre de l'allée centrale des esplanades), rang (-1 nord, 0, 1 sud)].
export const PLACES = {
  croec: ['reg', 'w', 0], chreg: ['reg', 'w', 1], cavec: ['reg', 'w', -1], crcc: ['reg', 'e', 0],
  cnoec: ['nat', 'w', 0], chnat: ['nat', 'w', 1], cncc: ['nat', 'e', 0],
  terrain: ['sup', 'w', 0], h2a: ['sup', 'e', 0], sanctions: ['sup', 'e', 1], amf: ['sup', 'e', -1],
  bercy: ['tutelle', 'w', 0], chancellerie: ['tutelle', 'e', 0], anc: ['tutelle', 'e', -1],
  ce: ['recours', 'cw', 0], ca: ['recours', 'cw', 1], cass: ['recours', 'ce', 0], ta: ['recours', 'e', 0], ccomptes: ['recours', 'e', -1],
  tj: ['resp', 'cw', 0], tcorr: ['resp', 'cw', 1], parquet: ['resp', 'ce', 0], tracfin: ['resp', 'ce', 1],
  ifac: ['intl', 'cw', 0], iesba: ['intl', 'cw', 1], iaasb: ['intl', 'cw', -1], iaesb: ['intl', 'ce', 0], aceu: ['intl', 'ce', -1], ue: ['intl', 'e', 0],
};
const COLS = { w: { x: -13, nx: 1, nz: 0 }, e: { x: 13, nx: -1, nz: 0 }, cw: { x: -3.9, nx: 1, nz: 0 }, ce: { x: 3.9, nx: -1, nz: 0 } };
const colOrder = { w: 0, cw: 1, ce: 2, e: 3 };
export const TOUR3D = [...STREETS].reverse().flatMap((st) => Object.keys(PLACES).filter((id) => PLACES[id][0] === st.id).sort((a, b) => colOrder[PLACES[a][1]] - colOrder[PLACES[b][1]] || PLACES[a][2] - PLACES[b][2]));
const RH = 2.4, BX = 9, RIVER = { x0: -3.5, x1: 3.5, zn: -9 }, SLOT = 6, FAC = 5, BAND = 18, ZEND = 66, BOUNDS = { x0: -34, x1: 34, z0: -74, z1: 74 }, TERRAIN = { x: 32, z: 74 }, PARVIS = 1.6, ALT = { min: 1.2, max: 40 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hyp = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const angDiff = (a, b) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };

export const LOTS = VILLE.batiments.map((b) => {
  const [sid, cid, slot] = PLACES[b.id]; const si = STREETS.findIndex((s) => s.id === sid); const st = STREETS[si], c = COLS[cid];
  const h = b.style === 'vide' ? 0.2 : 2.2 + b.h * 0.06, axis = c.nx ? 'x' : 'z';
  const w = axis === 'x' ? clamp(b.d * 0.075, 4.2, 6.6) : 4.6, d = axis === 'x' ? FAC : clamp(b.d * 0.075, 4.2, 5);
  const zc = st.z + slot * SLOT, x = axis === 'x' ? c.x - c.nx * w / 2 : c.x, z = zc;
  const faceX = x + c.nx * w / 2, faceZ = z + c.nz * d / 2;
  const quartier = b.rive === 'commun' ? (st.id === 'intl' ? 'intl' : 'justice') : b.rive;
  const sgn = cid === 'w' ? -1 : cid === 'e' ? 1 : 0;
  return { id: b.id, b, st, si, col: cid, side: slot < 0 ? 'n' : 's', slot, sgn, nx: c.nx, nz: c.nz, axis, x, z, w, d, h, faceX, faceZ, quartier, stop: { x: faceX + c.nx * 2.8, z: faceZ + c.nz * 2.8 } };
});
export const lotOf = (id) => LOTS.find((l) => l.id === id);
// Obstacles : les bâtiments seulement (le drone passe au-dessus de tout, mais pas au travers d'un mur).
const OBST = LOTS.filter((l) => l.b.style !== 'vide').map((l) => ({ x0: l.x - l.w / 2, x1: l.x + l.w / 2, z0: l.z - l.d / 2, z1: l.z + l.d / 2, h: l.h }));
function pushOut(p, R, alt) {
  let hit = false;
  for (const o of OBST) {
    if (alt > o.h + 0.5) continue;
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
// Itinéraire du drone : tout droit, au-dessus des toits, jusqu'à la porte du bâtiment.
export function route(from, lot) { return [{ x: from.x, z: from.z }, lot.stop]; }

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const cssVar = (name, fb) => { try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb; } catch { return fb; } };
const bandOf = (z) => STREETS.reduce((a, t) => (Math.abs(t.z - z) < Math.abs(a.z - z) ? t : a));
const zoneName = (x, z) => (z < RIVER.zn ? (z < -45 ? 'Esplanade internationale' : 'Esplanade des juridictions') : x < RIVER.x0 ? 'Rive EC' : x > RIVER.x1 ? 'Rive CAC' : 'Au-dessus du fleuve');
const twinKey = (a, b) => [a, b].sort().join('|');

export const VILLE3D_CSS = `
.v3 { --st: env(safe-area-inset-top, 0px); --sb: env(safe-area-inset-bottom, 0px); position: relative; height: min(calc(100dvh - 150px), 760px); min-height: 440px; border-radius: 14px; overflow: hidden; border: 1px solid var(--line); background: var(--card); color: var(--text); touch-action: none; user-select: none; -webkit-user-select: none; outline: none; font-size: 14px; overscroll-behavior: none; }
.v3 [hidden] { display: none !important; }
.v3.v3-full { position: fixed; inset: 0; height: auto; min-height: 0; z-index: 15; border-radius: 0; border: 0; }
.v3 .v3-gl { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.v3-labels { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 1; }
.v3-lb { position: absolute; left: 0; top: 0; will-change: transform; white-space: nowrap; font: 700 13px/1 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; padding: 5px 8px; border-radius: 8px; background: var(--card); color: var(--text); border: 1.5px solid var(--line); box-shadow: 0 1px 4px rgba(0,0,0,.18); display: flex; gap: 5px; align-items: center; }
.v3-lb svg { width: 14px; height: 14px; flex-shrink: 0; }
.v3-lb.band { background: var(--bc); color: #fff; border-color: var(--bc); text-transform: uppercase; letter-spacing: .05em; font-size: 11.5px; }
.v3-lb.small { font-size: 11.5px; padding: 3px 6px; font-weight: 600; }
.v3-lb.sel { background: var(--text); color: var(--card); border-color: var(--text); }
.v3-lb i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.v3-ui { position: absolute; left: max(10px, env(safe-area-inset-left, 0px)); right: max(10px, env(safe-area-inset-right, 0px)); top: calc(8px + var(--st)); z-index: 3; display: flex; flex-direction: column; gap: 6px; max-height: calc(100% - 24px - var(--st)); }
.v3-top { display: flex; gap: 6px; align-items: stretch; flex-shrink: 0; }
.v3-where { flex: 1; min-width: 0; padding: 5px 6px 5px 10px; min-height: 44px; border-radius: 10px; border: 1px solid var(--line); background: var(--card); display: flex; gap: 8px; align-items: center; }
.v3-where > svg { width: 20px; height: 20px; flex-shrink: 0; }
.v3-where .tx { flex: 1; min-width: 0; line-height: 1.25; }
.v3-where b { display: block; font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v3-where .v3-sub { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; }
.v3-btn { font: 600 13px/1.1 inherit; min-height: 44px; padding: 6px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--card); color: var(--text); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex-shrink: 0; }
.v3-btn.primary { background: var(--primary); border-color: var(--primary); color: #fff; }
.v3-btn.on { background: var(--text); border-color: var(--text); color: var(--card); }
.v3-btn.sm { min-height: 36px; padding: 4px 10px; font-size: 12.5px; }
.v3-btn svg { width: 18px; height: 18px; flex-shrink: 0; }
.v3-quit { min-width: 44px; font-size: 16px; }
.v3-row { display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0; }
.v3-row .seg { display: inline-flex; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: var(--card); }
.v3-row .seg button { font: 600 12.5px/1 inherit; min-height: 36px; padding: 6px 10px; border: 0; background: transparent; color: var(--text); cursor: pointer; }
.v3-row .seg button.on { background: var(--text); color: var(--card); }
.v3-legend { display: flex; flex-wrap: wrap; gap: 3px; font-size: 11px; font-weight: 600; pointer-events: none; flex-shrink: 0; }
.v3-legend span { display: inline-flex; align-items: center; gap: 5px; padding: 2px 6px; border-radius: 6px; background: color-mix(in srgb, var(--card) 88%, transparent); }
.v3-legend i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.v3-drawer { overflow: auto; touch-action: pan-y; overscroll-behavior: contain; padding: 4px 12px 10px; line-height: 1.4; border-radius: 12px; border: 1px solid var(--line); background: color-mix(in srgb, var(--card) 96%, transparent); max-height: 46vh; }
.v3-drawer p { margin: 6px 0; }
.v3-drawer h5 { margin: 8px 0 4px; font-size: 11.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.v3 .ec { color: var(--ec); } .v3 .cac { color: var(--cac); } .v3 .commun { color: var(--muted); }
.v3-sub { color: var(--muted); font-size: 12.5px; }
.v3-acts { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.v3-people { list-style: none; margin: 6px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; }
.v3-people button { width: 100%; display: flex; gap: 8px; align-items: center; text-align: left; font: 600 13px/1.25 inherit; padding: 6px 8px; min-height: 48px; border-radius: 10px; border: 1px solid var(--line); background: var(--card); color: var(--text); cursor: pointer; }
.v3-people button.sel { border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }
.v3-people .face { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; position: relative; background: var(--fc); }
.v3-people .face::after { content: ''; position: absolute; left: 9px; top: 5px; width: 12px; height: 12px; border-radius: 50%; background: #f1c7a3; }
.v3-people .face.hat::before { content: ''; position: absolute; left: 8px; top: 3px; width: 14px; height: 4px; border-radius: 2px; background: #1f2937; z-index: 1; }
.v3-people .n { font-weight: 800; }
.v3-people em { font-style: normal; font-weight: 400; color: var(--muted); font-size: 11.5px; display: block; }
.v3-cmp { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 6px; }
.v3-cmp th, .v3-cmp td { border: 1px solid var(--line); padding: 5px 6px; vertical-align: top; text-align: left; }
.v3-cmp th { font-size: 11.5px; } .v3-cmp td:first-child { font-weight: 700; width: 26%; }
.v3-stick { position: absolute; left: max(18px, env(safe-area-inset-left, 0px)); bottom: calc(22px + var(--sb)); width: 104px; height: 104px; border-radius: 50%; border: 2px solid color-mix(in srgb, var(--text) 25%, transparent); background: color-mix(in srgb, var(--card) 45%, transparent); display: none; z-index: 2; }
.v3-stick i { position: absolute; left: 50%; top: 50%; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%; background: var(--primary); opacity: .85; }
.v3-pad { position: absolute; right: 14px; bottom: calc(30px + var(--sb)); display: none; gap: 10px; z-index: 2; align-items: flex-end; }
.v3-pad .v3-btn { min-height: 58px; min-width: 88px; border-radius: 29px; -webkit-touch-callout: none; }
.v3.touch.drive .v3-stick, .v3.touch.drive .v3-pad { display: flex; }
.v3-alt { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(14px + var(--sb)); z-index: 2; font-size: 11.5px; font-weight: 600; color: var(--muted); pointer-events: none; padding: 3px 8px; border-radius: 999px; background: color-mix(in srgb, var(--card) 80%, transparent); white-space: nowrap; }
.v3:not(.drive) .v3-alt, .v3.touch .v3-keys { display: none; }
.v3-keys { position: absolute; left: 10px; bottom: 10px; font-size: 11.5px; color: var(--muted); z-index: 1; pointer-events: none; }
.v3:not(.drive) .v3-keys { display: none; }
.v3-sheet { position: absolute; inset: 8px; z-index: 4; overflow: auto; touch-action: pan-y; overscroll-behavior: contain; border-radius: 12px; border: 1px solid var(--line); background: var(--card); padding: 0 12px 12px; }
.v3-sheet-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; position: sticky; top: 0; background: var(--card); padding: 10px 0 8px; z-index: 1; flex-wrap: wrap; }
.v3-sheet h4 { margin: 12px 0 6px; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; display: flex; align-items: center; gap: 6px; }
.v3-sheet h4 i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.v3-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; }
.v3-list button { text-align: left; display: flex; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--card); color: var(--text); cursor: pointer; font: 600 13px/1.2 inherit; min-height: 48px; }
.v3-list button span { min-width: 0; }
.v3-list button small { display: block; font-weight: 400; color: var(--muted); font-size: 11px; }
.v3-list button svg { width: 22px; height: 22px; flex-shrink: 0; }
.v3-list button.here { border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }
.v3-list button.seen::after { content: '✓'; margin-left: auto; color: var(--ok, #15803d); font-weight: 800; }
.v3-opt { display: flex; gap: 6px; flex-wrap: wrap; }
`;

export function startVille3D(root, THREE, opts = {}) {
  root.classList.add('v3', 'drive'); root.classList.toggle('v3-full', !!opts.full); root.tabIndex = 0;
  const touch = matchMedia('(pointer: coarse)').matches; root.classList.toggle('touch', touch);
  root.innerHTML = `<canvas class="v3-gl"></canvas><div class="v3-labels" id="v3-labels"></div>
    <div class="v3-ui"><div class="v3-top"><div class="v3-where" id="v3-where"></div><button type="button" class="v3-btn" data-a="opts" aria-label="Options">☰</button>${opts.onQuit ? '<button type="button" class="v3-btn v3-quit" data-a="quit" aria-label="Quitter la visite">✕</button>' : ''}</div>
    <div class="v3-row" id="v3-row"></div><div class="v3-legend" id="v3-legend" hidden></div><div class="v3-drawer" id="v3-drawer" hidden></div></div>
    <div class="v3-alt" id="v3-alt"></div>
    <div class="v3-stick" id="v3-stick"><i></i></div>
    <div class="v3-pad"><button type="button" class="v3-btn" id="v3-turbo" aria-label="Turbo (maintenir)">Turbo</button></div>
    <div class="v3-keys">Flèches : voler · Maj : turbo · glisser : hauteur et caméra · Entrée : entrer · L : aller à · M : vue métier</div>
    <div class="v3-sheet" id="v3-sheet" hidden></div>`;
  const $ = (s) => root.querySelector(s);
  if (!document.getElementById('v3-compo-css')) { const st = document.createElement('style'); st.id = 'v3-compo-css'; st.textContent = COMPO_CSS; document.head.appendChild(st); }
  const canvas = $('.v3-gl'), whereEl = $('#v3-where'), rowEl = $('#v3-row'), legendEl = $('#v3-legend'), drawer = $('#v3-drawer'), sheet = $('#v3-sheet'), turboBtn = $('#v3-turbo'), labelLayer = $('#v3-labels'), altEl = $('#v3-alt');
  // Pas de « tirer pour recharger » ni de défilement de la page derrière la visite : seuls les tiroirs défilent.
  root.addEventListener('touchmove', (e) => { if (!e.target.closest('.v3-drawer, .v3-sheet')) e.preventDefault(); }, { passive: false });

  const col = { ec: cssVar('--ec', '#0e7490'), cac: cssVar('--cac', '#7c3aed'), commun: cssVar('--muted', '#64748b'), card: cssVar('--card', '#ffffff'), text: cssVar('--text', '#0f172a'), line: cssVar('--line', '#e2e8f0'), primary: cssVar('--primary', '#1e40af') };
  const th = document.documentElement.dataset.theme;
  const dark = th === 'dark' || (th !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  const ROLEC = { ...ROLE, elu_ec: col.ec, elu_cac: col.cac };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = dark ? 1 : 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const camera = new THREE.PerspectiveCamera(56, 1, 0.5, 520);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 300); ortho.up.set(0, 0, -1);
  let W = 1, H = 1;
  const resize = () => { W = root.clientWidth || 1; H = root.clientHeight || 1; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); setOrtho(); };
  // Décale l'image pour que le centre de la vue tombe au milieu de la zone dégagée, sous les encarts du haut.
  const reframe = () => {
    const rr0 = root.getBoundingClientRect(), ui = $('.v3-ui'), top = ui ? ui.getBoundingClientRect().bottom - rr0.top : 0;
    const bottom = touch && S.mode === 'drive' ? H - 130 : H;
    const dy = clamp(H / 2 - (top + bottom) / 2, -H * 0.3, H * 0.3);
    camera.setViewOffset(W, H, 0, dy, W, H); camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(() => { resize(); reframe(); }); ro.observe(root);

  // ---------- Ressources partagées
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const matCache = new Map();
  const lam = (c, extra) => { const k = c + (extra ? JSON.stringify(extra) : ''); if (!matCache.has(k)) matCache.set(k, keep(new THREE.MeshLambertMaterial({ color: c, ...extra }))); return matCache.get(k); };
  const BOX = keep(new THREE.BoxGeometry(1, 1, 1));
  const drawIcon = (x, name, X, Y, size, color, lw = 2) => { x.save(); x.translate(X, Y); x.scale(size / 24, size / 24); x.lineWidth = lw; x.strokeStyle = color; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(new Path2D(ICONES[name])); x.restore(); };
  let grainSeed = 11; const grnd = () => ((grainSeed = (grainSeed * 16807) % 2147483647) / 2147483647);
  const grain = (x, Wd, Ht, n = 900, a = 0.08) => { for (let i = 0; i < n; i++) { x.fillStyle = grnd() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`; x.fillRect(grnd() * Wd, grnd() * Ht, 1 + grnd() * 2, 1 + grnd() * 2); } };
  const canvasTex = (c) => { const t = keep(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const plane = (w, d, c, y = 0) => { const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, d)), lam(c, { polygonOffset: true, polygonOffsetFactor: -Math.round(y * 100), polygonOffsetUnits: -Math.round(y * 100) })); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; return m; };
  const box = (sc, w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(BOX, mat); m.scale.set(w, h, d); m.position.set(x, y, z); sc.add(m); return m; };
  const texPlane = (sc, w, d, tex, x, z, rotZ = 0, order = 1) => { const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, d)), keep(new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }))); m.rotation.x = -Math.PI / 2; m.rotation.z = rotZ; m.position.set(x, 0.06, z); m.renderOrder = order; sc.add(m); return m; };
  const FONT = '-apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  const textTex = (txt, fs, color, icon, iconColor) => {
    const c = document.createElement('canvas'), x = c.getContext('2d'); x.font = `800 ${fs}px ${FONT}`; const tw = x.measureText(txt).width, iw = icon ? fs * 1.3 : 0;
    c.width = Math.ceil(tw + fs * 0.6 + iw); c.height = Math.round(fs * 1.45);
    x.font = `800 ${fs}px ${FONT}`; x.textBaseline = 'middle';
    if (icon) drawIcon(x, icon, fs * 0.2, fs * 0.25, fs * 0.95, iconColor || color, 2.6);
    x.lineWidth = fs / 8; x.strokeStyle = 'rgba(15,23,42,.5)'; x.strokeText(txt, fs * 0.3 + iw, c.height / 2 + 1); x.fillStyle = color; x.fillText(txt, fs * 0.3 + iw, c.height / 2 + 1);
    const t = canvasTex(c); t.anisotropy = 4; return { t, ratio: c.height / c.width };
  };

  // ---------- Étiquettes HTML projetées : nettes à toute distance, limitées en nombre, sans chevauchement.
  const labelItems = [];
  const mkLabel = (html, cls, pos, o = {}) => { const el = document.createElement('div'); el.className = `v3-lb ${cls}`; el.innerHTML = html; el.hidden = true; labelLayer.appendChild(el); const it = { el, pos, far: o.far ?? 60, prio: o.prio ?? 0, w: (o.len ?? 10) * 7.6 + 24, h: 26, ...o }; labelItems.push(it); return it; };
  const vP = new THREE.Vector3();
  function updateLabels(cam, list, maxN) {
    const cands = [];
    for (const it of list) {
      if (it.off) { if (!it.el.hidden) it.el.hidden = true; continue; }
      vP.copy(it.pos).project(cam);
      const d = cam.isOrthographicCamera ? 1 : cam.position.distanceTo(it.pos);
      if (vP.z > 1 || Math.abs(vP.x) > 1.15 || Math.abs(vP.y) > 1.15 || d > it.far || d < (it.near ?? 0)) { if (!it.el.hidden) it.el.hidden = true; continue; }
      cands.push({ it, sx: (vP.x + 1) / 2 * W, sy: (1 - vP.y) / 2 * H, d });
    }
    cands.sort((a, b) => (b.it.prio - a.it.prio) || (a.d - b.d));
    const boxes = []; let n = 0;
    for (const c of cands) {
      const { it } = c, x0 = c.sx - it.w / 2, y0 = c.sy - it.h - 4;
      const clash = n >= maxN || boxes.some((b) => x0 < b.x1 + 4 && x0 + it.w > b.x0 - 4 && y0 < b.y1 + 2 && y0 + it.h > b.y0 - 2);
      if (clash) { if (!it.el.hidden) it.el.hidden = true; continue; }
      boxes.push({ x0, x1: x0 + it.w, y0, y1: y0 + it.h }); n++;
      it.el.style.transform = `translate3d(${c.sx.toFixed(1)}px,${c.sy.toFixed(1)}px,0) translate(-50%,-100%) translateY(-4px)`;
      if (it.el.hidden) it.el.hidden = false;
    }
  }
  const hideLabels = (list) => { for (const it of list) if (!it.el.hidden) it.el.hidden = true; };

  // ---------- La ville
  const city = new THREE.Scene();
  const horizon = dark ? '#1e293b' : '#cfe0f3';
  city.background = new THREE.Color(horizon); city.fog = new THREE.Fog(horizon, 170, 520);
  {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, dark ? '#020617' : '#3b78c9'); gr.addColorStop(0.5, dark ? '#0f1b33' : '#8db6e6'); gr.addColorStop(1, horizon); x.fillStyle = gr; x.fillRect(0, 0, 4, 256);
    const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(480, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), keep(new THREE.MeshBasicMaterial({ map: canvasTex(c), side: THREE.BackSide, fog: false, depthWrite: false })));
    sky.renderOrder = -1; city.add(sky);
    const cc = document.createElement('canvas'); cc.width = 128; cc.height = 64; const cx = cc.getContext('2d');
    for (let i = 0; i < 9; i++) { const g2 = cx.createRadialGradient(20 + i * 11, 34 + (i % 3) * 4, 2, 20 + i * 11, 34 + (i % 3) * 4, 22); g2.addColorStop(0, 'rgba(255,255,255,.85)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = g2; cx.fillRect(0, 0, 128, 64); }
    const cm = keep(new THREE.SpriteMaterial({ map: canvasTex(cc), transparent: true, depthWrite: false, fog: false, opacity: dark ? 0.15 : 0.8 }));
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + 0.3, r = 260 + (i % 3) * 40, cl = new THREE.Sprite(cm); cl.scale.set(90 + (i % 4) * 25, 40, 1); cl.position.set(Math.cos(a) * r, 80 + (i % 4) * 18, Math.sin(a) * r); cl.renderOrder = -1; city.add(cl); }
  }
  city.add(new THREE.HemisphereLight(0xffffff, 0x7a8698, dark ? 1 : 1.15));
  const sun = new THREE.DirectionalLight(dark ? 0xc7d2fe : 0xfff1d6, dark ? 0.6 : 1.25); sun.position.set(45, 70, 35); city.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 85, bottom: -85, near: 10, far: 220 }); sun.shadow.camera.updateProjectionMatrix();
  const C = dark
    ? { ground: '#1a2333', ecz: '#103a43', cacz: '#291f47', north: '#262a33', intl: '#232c3d', river: '#1e3d73', road: '#3a4354', walk: '#2b3445', quay: '#26303f' }
    : { ground: '#d5dde7', ecz: '#c9e6eb', cacz: '#e3daf6', north: '#e6dcc8', intl: '#d6dcea', river: '#7fb0e8', road: '#8f98a6', walk: '#e7ecf2', quay: '#dfe6ee' };
  const GX = TERRAIN.x, GZ = TERRAIN.z;
  city.add(plane(GX * 2, GZ * 2, C.ground, 0));
  { const g = new THREE.Mesh(keep(new THREE.PlaneGeometry(1000, 1000)), lam(dark ? '#14281c' : '#9fc58f', { polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 })); g.rotation.x = -Math.PI / 2; g.position.y = -0.05; g.receiveShadow = true; city.add(g);
    let sd = 3; const r2 = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const hills = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), lam(dark ? '#1c3326' : '#86b07a'), 22);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), Sc = new THREE.Vector3();
    for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2, r = 150 + r2() * 70; M.compose(V.set(Math.cos(a) * r, -1, Math.sin(a) * r * 1.3), Q, Sc.set(40 + r2() * 45, 12 + r2() * 22, 40 + r2() * 45)); hills.setMatrixAt(i, M); }
    city.add(hills);
    const grove = []; for (let i = 0; i < 70; i++) { const a = r2() * Math.PI * 2, r = 60 + r2() * 70; grove.push([Math.cos(a) * r * 0.9, Math.sin(a) * r * 1.4, 1 + r2() * 1.2]); }
    const gc = new THREE.InstancedMesh(keep(new THREE.ConeGeometry(1.6, 4.5, 7)), lam(dark ? '#14532d' : '#4f8a4a'), grove.length);
    grove.forEach(([x, z, k], i) => { if (Math.abs(x) < GX + 3 && Math.abs(z) < GZ + 3) { x = Math.sign(x || 1) * (GX + 6 + r2() * 30); } M.compose(V.set(x, 2.2 * k, z), Q, Sc.set(k, k, k)); gc.setMatrixAt(i, M); }); city.add(gc); }
  // Pavages : carreaux (rive EC), briques (rive CAC), dalles (esplanade des juridictions), losanges (international).
  const paving = (kind, base) => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 128, 128); x.strokeStyle = dark ? 'rgba(255,255,255,.08)' : 'rgba(15,23,42,.10)'; x.lineWidth = 3;
    x.beginPath();
    if (kind === 'ec') { for (let i = 0; i <= 128; i += 32) { x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); } }
    else if (kind === 'cac') { for (let r = 0; r < 8; r++) { const y = r * 16; x.moveTo(0, y); x.lineTo(128, y); for (let i = (r % 2) * 16; i <= 128; i += 32) { x.moveTo(i, y); x.lineTo(i, y + 16); } } }
    else if (kind === 'intl') { for (let i = -128; i <= 128; i += 32) { x.moveTo(i, 0); x.lineTo(i + 128, 128); x.moveTo(i + 128, 0); x.lineTo(i, 128); } }
    else { for (let i = 0; i <= 128; i += 64) { x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); } x.moveTo(32, 64); x.lineTo(32, 128); x.moveTo(96, 0); x.lineTo(96, 64); }
    x.stroke(); grain(x, 128, 128, 700, 0.07);
    const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  };
  const pzone = (x0, x1, z0, z1, kind, base, y = 0.01) => {
    const t = paving(kind, base); t.repeat.set((x1 - x0) / 8, (z1 - z0) / 8);
    const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(x1 - x0, z1 - z0)), keep(new THREE.MeshLambertMaterial({ map: t, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; city.add(m);
  };
  pzone(-GX, RIVER.x0, RIVER.zn, GZ, 'ec', C.ecz); pzone(RIVER.x1, GX, RIVER.zn, GZ, 'cac', C.cacz);
  pzone(-GX, GX, -45, RIVER.zn, 'justice', C.north); pzone(-GX, GX, -GZ, -45, 'intl', C.intl);
  pzone(RIVER.x0 - 3, RIVER.x0, RIVER.zn, GZ, 'quay', C.quay, 0.012); pzone(RIVER.x1, RIVER.x1 + 3, RIVER.zn, GZ, 'quay', C.quay, 0.012);
  for (const st of STREETS) box(city, GX * 2, 0.04, 0.5, 0, 0.04, st.z + BAND / 2, lam(st.c));
  const riverTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = C.river; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 2; for (let y = 8; y < 128; y += 16) { x.beginPath(); for (let i = 0; i <= 128; i += 8) x.lineTo(i, y + Math.sin((i + y) / 10) * 3); x.stroke(); }
    const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 30); return t; })();
  { const len = GZ + 120 - RIVER.zn, m = new THREE.Mesh(keep(new THREE.PlaneGeometry(RIVER.x1 - RIVER.x0, len)), keep(new THREE.MeshLambertMaterial({ map: riverTex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.015, RIVER.zn + len / 2); m.receiveShadow = true; city.add(m);
    // Bassin au bout du fleuve, sur l'esplanade.
    const pond = new THREE.Mesh(keep(new THREE.CircleGeometry(4.5, 28)), lam(C.river, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); pond.rotation.x = -Math.PI / 2; pond.position.set(0, 0.02, RIVER.zn - 0.5); city.add(pond); }
  const asphalt = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = C.road; x.fillRect(0, 0, 128, 128); grain(x, 128, 128, 1600, 0.12);
    const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const road = (x0, x1, z0, z1, y = 0.03) => { const t = keep(asphalt.clone()); t.needsUpdate = true; t.repeat.set((x1 - x0) / 6, (z1 - z0) / 6);
    const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(x1 - x0, z1 - z0)), keep(new THREE.MeshLambertMaterial({ map: t, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }))); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; city.add(m); };
  for (const s of [-1, 1]) road(s * BX - RH, s * BX + RH, RIVER.zn, ZEND + RH);
  const dash = lam(dark ? '#cbd5e1' : '#ffffff');
  for (const s of [-1, 1]) for (let z = RIVER.zn + 2; z < ZEND; z += 4) box(city, 0.18, 0.02, 1.6, s * BX, 0.05, z, dash);
  const par = lam(dark ? '#94a3b8' : '#475569');
  const southBands = STREETS.filter((st) => st.z > RIVER.zn);
  for (const st of southBands) {
    road(-BX, BX, st.z - RH, st.z + RH, 0.05); box(city, 2 * BX - 1, 0.6, 0.3, 0, 0.3, st.z - RH, par); box(city, 2 * BX - 1, 0.6, 0.3, 0, 0.3, st.z + RH, par);
    for (const s of [-1, 1]) { const { t, ratio } = textTex(st.nom.toUpperCase(), 64, '#ffffff'); const wpl = 2 * RH - 0.6, hpl = wpl * ratio; texPlane(city, wpl, hpl, t, s * BX, st.z + BAND / 2 - 1.6 - hpl / 2, Math.PI / 2 * (s < 0 ? 1 : -1)); }
  }
  // Esplanades du nord : allée centrale et nom de la bande peint en travers, à l'entrée sud de chaque bande.
  for (const st of STREETS.filter((s) => s.z < RIVER.zn)) {
    road(-2, 2, st.z - BAND / 2, st.z + BAND / 2, 0.03);
    const { t, ratio } = textTex(st.nom.toUpperCase(), 64, '#ffffff'); const wpl = 22, hpl = wpl * ratio; texPlane(city, wpl, hpl, t, 0, st.z + BAND / 2 - 0.6 - hpl / 2, 0);
  }
  for (const [s, kind, txt] of [[-1, 'ec', 'RIVE EC · L’ORDRE'], [1, 'cac', 'RIVE CAC · L’AUDIT']]) {
    const m = lam(col[kind]); box(city, 0.5, 4.2, 0.5, s * BX - RH - 0.3, 2.1, ZEND + 3, m); box(city, 0.5, 4.2, 0.5, s * BX + RH + 0.3, 2.1, ZEND + 3, m); box(city, 2 * RH + 1.6, 0.6, 0.6, s * BX, 4.4, ZEND + 3, m);
    mkLabel(`${svgIcon(kind === 'ec' ? 'cnoec' : 'cncc')} ${txt}`, 'band', new THREE.Vector3(s * BX, 5.2, ZEND + 3), { far: 80, len: txt.length, prio: 2 }).el.style.setProperty('--bc', col[kind]);
  }
  const bandLabels = STREETS.map((st) => { const it = mkLabel(esc(st.nom), 'band', new THREE.Vector3(0, 2.2, st.z + BAND / 2 - 1), { far: 90, len: st.nom.length, prio: 1, st }); it.el.style.setProperty('--bc', st.c); return it; });

  // Bâtiments : façade vers le boulevard (rives) ou vers le sud (esplanades), symbole, porte, nom peint sur le parvis.
  const wallPattern = (x, Wd, Ht, quartier) => {
    x.strokeStyle = 'rgba(0,0,0,.16)'; x.lineWidth = 1; x.beginPath();
    if (quartier === 'ec') for (let y = 0, r = 0; y < Ht; y += 6, r++) { x.moveTo(0, y); x.lineTo(Wd, y); for (let i = (r % 2) * 6; i < Wd; i += 12) { x.moveTo(i, y); x.lineTo(i, y + 6); } }
    else if (quartier === 'cac') { x.strokeStyle = 'rgba(255,255,255,.22)'; for (let i = 0; i < Wd; i += 10) { x.moveTo(i, 0); x.lineTo(i, Ht); } for (let y = 0; y < Ht; y += 14) { x.moveTo(0, y); x.lineTo(Wd, y); } }
    else if (quartier === 'intl') for (let i = 0; i < Wd; i += 32) { x.moveTo(i, 0); x.lineTo(i, Ht); for (let y = 0; y < Ht; y += 32) { x.moveTo(0, y); x.lineTo(Wd, y); } }
    else for (let y = 0; y < Ht; y += 10) { x.moveTo(0, y); x.lineTo(Wd, y); }
    x.stroke(); grain(x, Wd, Ht, Math.round(Wd * Ht / 6), 0.07);
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
  const facade = (lot, fw, fh) => {
    const c = document.createElement('canvas'), Wd = 256, Ht = clamp(Math.round(256 * fh / fw), 140, 360); c.width = Wd; c.height = Ht; const x = c.getContext('2d');
    x.fillStyle = col[lot.b.rive]; x.fillRect(0, 0, Wd, Ht); wallPattern(x, Wd, Ht, lot.quartier); x.fillStyle = lot.quartier === 'cac' ? 'rgba(220,230,255,.4)' : 'rgba(255,255,255,.26)';
    for (let yy = 14; yy < Ht - 70; yy += 30) for (let xx = 16; xx < Wd - 16; xx += 32) x.fillRect(xx, yy, 14, 18);
    const r = Math.min(Wd * 0.3, (Ht - 56) * 0.42), cx = Wd / 2, cy = Math.max(r + 8, (Ht - 56) / 2);
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    drawIcon(x, SYMBOLES[lot.id][0], cx - r * 0.62, cy - r * 0.62, r * 1.24, col[lot.b.rive], 2.2);
    return canvasTex(c);
  };
  const PRISM = (() => { const sh = new THREE.Shape(); sh.moveTo(-0.5, 0); sh.lineTo(0.5, 0); sh.lineTo(0, 1); sh.lineTo(-0.5, 0); return keep(new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5)); })();
  const DOME = keep(new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2)), COL = keep(new THREE.CylinderGeometry(0.17, 0.2, 1, 8));
  const FLAGS = ['#dc2626', '#f59e0b', '#16a34a', '#2563eb', '#7c3aed', '#0891b2'];
  let flagI = 0;
  // Index de la face du cube qui porte la façade : [+x, -x, +y, -y, +z, -z].
  const frontIndex = (lot) => (lot.nx > 0 ? 0 : lot.nx < 0 ? 1 : lot.nz > 0 ? 4 : 5);
  const facadeLen = (lot) => (lot.axis === 'x' ? lot.d : lot.w);
  // Point sur la ligne de façade (k le long, t vers l'extérieur).
  const onFace = (lot, k, t) => (lot.axis === 'x' ? { x: lot.faceX + lot.nx * t, z: lot.z + k } : { x: lot.x + k, z: lot.faceZ + lot.nz * t });
  function archi(lot) {
    const { x, z, w, d, h } = lot, top = h + 0.25, L = facadeLen(lot);
    if (lot.quartier === 'intl') {
      const r = Math.min(w, d) * 0.34, dome = new THREE.Mesh(DOME, lam(dark ? '#cbd5e1' : '#e2e8f0')); dome.scale.set(r, r * 0.9, r); dome.position.set(x, top, z); city.add(dome);
      const f = onFace(lot, L / 2 - 0.6, -0.8);
      box(city, 0.08, 2.2, 0.08, f.x, top + 1.1, f.z, lam('#94a3b8')); box(city, 0.05, 0.6, 1, f.x, top + 1.9, f.z + 0.5, lam(FLAGS[flagI++ % FLAGS.length]));
    } else if (lot.quartier === 'ec') {
      const roof = new THREE.Mesh(PRISM, keep(new THREE.MeshLambertMaterial({ map: roofTex }))); if (lot.axis === 'z') { roof.rotation.y = Math.PI / 2; roof.scale.set(d + 0.5, Math.min(2.2, d * 0.45), w + 0.5); } else roof.scale.set(w + 0.5, Math.min(2.2, w * 0.45), d + 0.5);
      roof.position.set(x, top, z); city.add(roof);
      box(city, 0.6, 1, 0.6, x - w * 0.3, top + 0.9, z - d * 0.3, lam('#7c5a3a'));
    } else if (lot.quartier === 'cac') {
      const glass = lam(dark ? '#a5b4fc' : '#c4b5fd', { transparent: true, opacity: 0.85 });
      box(city, w * 0.62, h * 0.28, d * 0.62, x, top + h * 0.14, z, glass);
      box(city, 0.06, 1.6, 0.06, x, top + h * 0.28 + 0.8, z, lam('#94a3b8'));
    } else {
      const stone = lam(dark ? '#e7e5e4' : '#f5f0e6');
      for (const k of [-0.4, -0.2, 0.2, 0.4]) { const f = onFace(lot, k * L, 0.35), c = new THREE.Mesh(COL, stone); c.scale.set(1, h, 1); c.position.set(f.x, h / 2, f.z); city.add(c); }
      const f = onFace(lot, 0, 0.3), ped = new THREE.Mesh(PRISM, stone);
      if (lot.axis === 'x') { box(city, 0.9, 0.35, L + 0.4, f.x, h + 0.05, f.z, stone); ped.rotation.y = Math.PI / 2; ped.scale.set(L + 0.4, 1.3, 0.5); box(city, 0.6, 0.12, L + 0.6, f.x, 0.06, f.z, stone); }
      else { box(city, L + 0.4, 0.35, 0.9, f.x, h + 0.05, f.z, stone); ped.scale.set(L + 0.4, 1.3, 0.5); box(city, L + 0.6, 0.12, 0.6, f.x, 0.06, f.z, stone); }
      ped.position.set(f.x, h + 0.22, f.z); city.add(ped);
    }
  }
  const pick = [], blabels = [];
  for (const lot of LOTS) {
    const { b } = lot;
    const plot = plane(lot.w + 1.1 + Math.abs(lot.nx) * PARVIS, lot.d + 1.1 + Math.abs(lot.nz) * PARVIS, C.walk, 0.02); plot.position.set(lot.x + lot.nx * PARVIS / 2, 0.02, lot.z + lot.nz * PARVIS / 2); city.add(plot);
    const fi = frontIndex(lot), door = onFace(lot, 0, -0.11), rotY = lot.axis === 'x' ? 0 : Math.PI / 2;
    if (b.style === 'vide') {
      const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([a, c]) => new THREE.Vector3(lot.x + a * lot.w / 2, 0.1, lot.z + c * lot.d / 2));
      const line = new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints(pts)), keep(new THREE.LineDashedMaterial({ color: col[b.rive], dashSize: 1, gapSize: 0.6 }))); line.computeLineDistances(); city.add(line);
      const pf = onFace(lot, 0, -0.4), post = box(city, 0.25, 2.2, 0.25, pf.x, 1.1, pf.z, lam('#64748b')); post.userData.id = lot.id; pick.push(post);
      const mats = Array.from({ length: 6 }, () => lam('#fff')); mats[fi] = new THREE.MeshLambertMaterial({ map: facade(lot, 3.5, 3) });
      const board = new THREE.Mesh(BOX, mats); board.scale.set(lot.axis === 'x' ? 0.2 : 3.5, 2.4, lot.axis === 'x' ? 3.5 : 0.2); board.position.set(pf.x, 2.6, pf.z); board.userData.id = lot.id; city.add(board); pick.push(board);
    } else {
      const st = sideTexOf(b.rive, lot.quartier).clone(); st.repeat.set(Math.max(1, lot.w / 2.6), Math.max(1, lot.h / 2.6)); st.needsUpdate = true; keep(st);
      const side = keep(new THREE.MeshLambertMaterial({ map: st })), front = keep(new THREE.MeshLambertMaterial({ map: facade(lot, facadeLen(lot), lot.h) }));
      const mats = [side, side, roofMat, roofMat, side, side]; mats[fi] = front;
      const m = new THREE.Mesh(BOX, mats);
      m.scale.set(lot.w, lot.h, lot.d); m.position.set(lot.x, lot.h / 2, lot.z); m.userData.id = lot.id; m.castShadow = true; m.receiveShadow = true; city.add(m); pick.push(m);
      box(city, lot.w + 0.3, 0.25, lot.d + 0.3, lot.x, lot.h + 0.12, lot.z, lam(col[b.rive]));
      archi(lot);
      const dm = box(city, 0.2, 2, 1.6, door.x, 1, door.z, lam(dark ? '#e2e8f0' : '#1e293b')); dm.rotation.y = rotY;
    }
    { const { t, ratio } = textTex(b.court.toUpperCase(), 64, 'rgba(255,255,255,.95)', SYMBOLES[lot.id][0], '#ffffff'); let wpl = facadeLen(lot) + 0.4, hpl = wpl * ratio; if (hpl > PARVIS - 0.3) { wpl *= (PARVIS - 0.3) / hpl; hpl = PARVIS - 0.3; }
      const pp = onFace(lot, 0, PARVIS / 2); texPlane(city, wpl, hpl, t, pp.x, pp.z, lot.nx > 0 ? Math.PI / 2 : lot.nx < 0 ? -Math.PI / 2 : 0); }
    const lb = mkLabel(`<span class="${b.rive}">${svgIcon(lot.id)}</span>${esc(b.court)}`, '', new THREE.Vector3(lot.x, Math.max(lot.h, 2.6) + 1.3, lot.z), { far: 70, len: b.court.length + 2, lot }); blabels.push(lb);
  }

  // Végétation et réverbères.
  const M4 = new THREE.Matrix4(), Q0 = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3();
  const instanced = (geo, mat, items) => { if (!items.length) return; const im = new THREE.InstancedMesh(geo, mat, items.length); im.castShadow = true; items.forEach(([x, y, z, sx, sy, sz], i) => { M4.compose(V3.set(x, y, z), Q0, S3.set(sx, sy ?? sx, sz ?? sx)); im.setMatrixAt(i, M4); }); city.add(im); };
  const onRoad = (x, z) => (z > RIVER.zn - 1 && Math.abs(Math.abs(x) - BX) < RH + 1.2) || (Math.abs(x) < BX + RH + 1 && southBands.some((t) => Math.abs(z - t.z) < RH + 1.2)) || (z < RIVER.zn && Math.abs(x) < 3.2);
  {
    const spots = []; let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let x = -GX + 2; x <= GX - 2; x += 3) for (let z = -GZ + 2; z <= GZ - 2; z += 3) {
      const px = x + (rnd() - 0.5) * 1.6, pz = z + (rnd() - 0.5) * 1.6;
      if (onRoad(px, pz) || (pz > RIVER.zn - 5 && Math.abs(px) < RIVER.x1 + 1.2)) continue;
      if (LOTS.some((l) => Math.abs(px - l.x - l.nx * PARVIS / 2) < l.w / 2 + 1.6 + Math.abs(l.nx) * PARVIS / 2 && Math.abs(pz - l.z - l.nz * PARVIS / 2) < l.d / 2 + 1.6 + Math.abs(l.nz) * PARVIS / 2)) continue;
      if (rnd() < 0.5) continue;
      spots.push([px, pz, 0.75 + rnd() * 0.35, pz < RIVER.zn ? (pz < -45 ? 'intl' : 'justice') : px < 0 ? 'ec' : 'cac']);
    }
    instanced(keep(new THREE.CylinderGeometry(0.13, 0.17, 0.8, 5)), lam('#7c5a3a'), spots.filter((p) => p[3] !== 'intl').map(([x, z, k]) => [x, 0.4 * k, z, k]));
    instanced(keep(new THREE.SphereGeometry(0.75, 10, 8)), lam(dark ? '#15803d' : '#5aa55f'), spots.filter((p) => p[3] === 'ec').map(([x, z, k]) => [x, 1.3 * k, z, k]));
    instanced(keep(new THREE.ConeGeometry(0.6, 1.6, 7)), lam(dark ? '#166534' : '#3f8a52'), spots.filter((p) => p[3] === 'cac').map(([x, z, k]) => [x, 1.5 * k, z, k]));
    instanced(keep(new THREE.ConeGeometry(0.32, 2.4, 7)), lam(dark ? '#14532d' : '#2f6b3f'), spots.filter((p) => p[3] === 'justice').map(([x, z, k]) => [x, 1.6 * k, z, k]));
    const beds = spots.filter((p) => p[3] === 'intl');
    instanced(keep(new THREE.CylinderGeometry(0.9, 0.9, 0.35, 10)), lam(dark ? '#334155' : '#94a3b8'), beds.map(([x, z]) => [x, 0.17, z, 1]));
    instanced(keep(new THREE.SphereGeometry(0.75, 8, 6)), lam('#f472b6'), beds.map(([x, z, k]) => [x, 0.45, z, k, 0.5 * k, k]));
  }
  {
    const posts = [], heads = { ec: [], cac: [], commun: [] };
    for (const s of [-1, 1]) for (let z = RIVER.zn + 4; z <= ZEND - 3; z += 9) { const x = s * (BX + RH + 0.4); if (LOTS.some((l) => Math.abs(z - l.z) < 1.4 && l.sgn === s)) continue; posts.push([x, 1.3, z, 1, 2.6, 1]); heads[s < 0 ? 'ec' : 'cac'].push([x, 2.7, z, 1]); }
    for (let z = RIVER.zn - 6; z > -GZ; z -= 9) for (const s of [-1, 1]) { posts.push([s * 2.4, 1.3, z, 1, 2.6, 1]); heads.commun.push([s * 2.4, 2.7, z, 1]); }
    instanced(keep(new THREE.CylinderGeometry(0.06, 0.08, 1, 6)), lam(dark ? '#94a3b8' : '#475569'), posts);
    const head = keep(new THREE.SphereGeometry(0.24, 10, 8));
    for (const k of ['ec', 'cac', 'commun']) instanced(head, lam(k === 'commun' ? '#a16207' : col[k], { emissive: k === 'commun' ? '#a16207' : col[k], emissiveIntensity: dark ? 0.7 : 0.25 }), heads[k]);
    // Place de la justice : quatre colonnes autour du bassin ; place internationale : mâts et drapeaux.
    for (const [dx, dz] of [[-6, -3], [6, -3], [-6, 3], [6, 3]]) { const c = new THREE.Mesh(COL, lam(dark ? '#e7e5e4' : '#f5f0e6')); c.scale.set(1.3, 3, 1.3); c.position.set(dx, 1.5, RIVER.zn - 0.5 + dz); city.add(c); }
    FLAGS.forEach((c, i) => { const x = (i - 2.5) * 2.2; box(city, 0.07, 3, 0.07, x, 1.5, -GZ + 4, lam('#94a3b8')); box(city, 0.05, 0.55, 0.9, x, 2.7, -GZ + 4.45, lam(c)); });
  }

  // Le drone : corps, quatre bras, quatre hélices qui tournent, une ombre portée au sol.
  const drone = new THREE.Group(), rotors = [];
  box(drone, 1.1, 0.32, 1.1, 0, 0, 0, lam(col.primary)); box(drone, 0.5, 0.2, 0.3, 0, -0.1, 0.62, lam('#111827'));
  const arm = lam(dark ? '#cbd5e1' : '#1e293b'), rotorG = keep(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 10)), rotorM = lam('#94a3b8', { transparent: true, opacity: 0.55 });
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const a = box(drone, 1.1, 0.08, 0.08, sx * 0.6, 0.08, sz * 0.6, arm); a.rotation.y = sx * sz > 0 ? -Math.PI / 4 : Math.PI / 4;
    box(drone, 0.1, 0.3, 0.1, sx * 0.95, 0.2, sz * 0.95, arm);
    const r = new THREE.Mesh(rotorG, rotorM); r.position.set(sx * 0.95, 0.38, sz * 0.95); drone.add(r); rotors.push(r);
  }
  city.add(drone);
  city.traverse((o) => { if (o.isMesh && o.geometry?.type !== 'PlaneGeometry' && o.material?.fog !== false && !o.material?.transparent) o.castShadow = true; });

  // Personnages
  const DISC = keep(new THREE.CircleGeometry(0.62, 18).rotateX(-Math.PI / 2));
  const ROBE = keep(new THREE.CylinderGeometry(0.36, 0.48, 1.35, 10)), HEAD = keep(new THREE.SphereGeometry(0.28, 12, 10)), HAT = keep(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10));
  const figure = (c, hat = false) => {
    const g = new THREE.Group();
    const r = new THREE.Mesh(ROBE, lam(c)); r.position.y = 0.68; r.castShadow = true; g.add(r);
    const h = new THREE.Mesh(HEAD, lam('#f1c7a3')); h.position.y = 1.62; g.add(h);
    if (hat) { const t = new THREE.Mesh(HAT, lam('#1f2937')); t.position.y = 1.92; g.add(t); }
    return g;
  };

  // ---------- Intérieurs : un hémicycle. Le président fait face à l'assemblée, disposée en arcs ; les personnes
  // présentes sans siéger se tiennent debout sur les côtés ; les guichets (pancartes) sont des panneaux au mur du fond.
  const rooms = new Map();
  function buildRoom(lot) {
    if (rooms.has(lot.id)) return rooms.get(lot.id);
    const { b } = lot, hex = col[b.rive];
    const salle = SALLES[lot.id] || { layout: 'bureau', groupes: [] };
    const seated = salle.groupes.filter((g) => !g.debout).flatMap((g) => Array.from({ length: g.n }, () => g));
    const standing = salle.groupes.filter((g) => g.debout).flatMap((g) => Array.from({ length: g.n }, () => g));
    const seats = []; let rest = seated.length - 1, k = 0, maxR = 0;
    while (rest > 0) { const r = 3.4 + k * 2.3, span = Math.PI * 0.72, cap = Math.max(3, Math.floor(r * span / 1.5) + 1), n = Math.min(cap, rest); for (let i = 0; i < n; i++) { const a = Math.PI / 2 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * span); seats.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, r, a, k }); } rest -= n; maxR = r; k++; }
    const Wd = clamp(Math.ceil(2 * (maxR + 2.6)), 14, 40), D = clamp(Math.ceil(maxR + 7.5), 12, 30), zp = -D / 2 + 2.6;
    const sc = new THREE.Scene(); sc.background = new THREE.Color(dark ? '#111827' : '#dfe6f0');
    sc.add(new THREE.HemisphereLight(0xffffff, 0x8892a0, 1.2)); const l = new THREE.DirectionalLight(0xffffff, 0.6); l.position.set(8, 22, 10); l.castShadow = true; l.shadow.mapSize.set(1024, 1024); Object.assign(l.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 60 }); sc.add(l);
    { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), q = lot.quartier;
      x.fillStyle = q === 'ec' ? (dark ? '#5b4636' : '#c9a27a') : q === 'cac' ? (dark ? '#3b2f5c' : '#cfc3ea') : q === 'intl' ? (dark ? '#334155' : '#e2e8f0') : (dark ? '#44403c' : '#f1ede4'); x.fillRect(0, 0, 128, 128);
      x.strokeStyle = 'rgba(0,0,0,.16)'; x.lineWidth = 2;
      if (q === 'ec') for (let y = 0, r = 0; y < 128; y += 16, r++) { x.beginPath(); x.moveTo(0, y); x.lineTo(128, y); x.stroke(); for (let i = (r % 3) * 21; i < 128; i += 64) { x.beginPath(); x.moveTo(i, y); x.lineTo(i, y + 16); x.stroke(); } }
      else if (q === 'justice') { x.fillStyle = dark ? 'rgba(0,0,0,.25)' : 'rgba(0,0,0,.09)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) x.fillRect(i * 32, j * 32, 32, 32); }
      else if (q === 'intl') for (let i = 0; i <= 128; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); }
      grain(x, 128, 128, q === 'cac' ? 2600 : 900, q === 'cac' ? 0.1 : 0.06);
      const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Wd / 5, D / 5);
      const fl = new THREE.Mesh(keep(new THREE.PlaneGeometry(Wd, D)), keep(new THREE.MeshLambertMaterial({ map: t }))); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; sc.add(fl); }
    // Murs bas et translucides : on voit la salle de n'importe quel côté.
    const wall = lam(hex, { transparent: true, opacity: 0.35 });
    box(sc, Wd, 2.6, 0.3, 0, 1.3, -D / 2, lam(hex, { transparent: true, opacity: 0.5 })); box(sc, 0.3, 1.2, D, -Wd / 2, 0.6, 0, wall); box(sc, 0.3, 1.2, D, Wd / 2, 0.6, 0, wall); box(sc, Wd, 1.2, 0.3, 0, 0.6, D / 2, wall);
    const plinth = lam('#7c5a3a'); box(sc, Wd, 0.5, 0.35, 0, 0.25, -D / 2 + 0.05, plinth);
    const people = [], groups = [], labels = [], wood = lam('#8b5e3c');
    const put = (g, x, z, face, kind) => {
      const c = ROLEC[g.role] || col.commun, f = figure(c, g.role === 'magistrat'); f.position.set(x, 0, z); f.lookAt(face[0], 0, face[1]); sc.add(f);
      const disc = new THREE.Mesh(DISC, lam(c, { transparent: true, opacity: 0.35 })); disc.position.set(x, 0.03, z); sc.add(disc);
      const first = !groups.includes(g); if (first) groups.push(g);
      const p = { mesh: f, x, z, qui: g.qui, fait: g.fait, label: g.label, g, first, color: c, kind };
      p.lb = mkLabel(`<i style="background:${c}"></i>${esc(first ? groupLabel(g) : g.label)}`, first ? '' : 'small', new THREE.Vector3(x, 2.5, z), { far: 60, len: (first ? groupLabel(g) : g.label).length + 2, prio: first ? 1 : 0, p }); p.lb.off = true; labels.push(p.lb);
      people.push(p); return p;
    };
    if (seated.length) { box(sc, 4.2, 1, 1.2, 0, 0.5, zp - 0.9, wood); put(seated[0], 0, zp, [0, D], 'siege'); }
    for (let a = 0; a < k; a++) { const r = 3.4 + a * 2.3, ring = new THREE.Mesh(keep(new THREE.RingGeometry(r - 1.1, r - 0.45, 40, 1, Math.PI / 2 - Math.PI * 0.38, Math.PI * 0.76)), wood); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.78, zp); sc.add(ring); }
    seats.forEach((s, i) => put(seated[i + 1], s.x, zp + s.z, [0, zp], 'siege'));
    standing.forEach((g, i) => { const s = i % 2 ? 1 : -1; put(g, s * (Wd / 2 - 1.8), zp + 1.5 + Math.floor(i / 2) * 2.2, [0, zp], 'debout'); });
    const nb = b.pancartes.length, gap = Math.min(4.2, (Wd - 2) / Math.max(1, nb));
    b.pancartes.forEach((p, i) => {
      const x = (i - (nb - 1) / 2) * gap, z = -D / 2 + 0.22;
      box(sc, gap * 0.82, 1.5, 0.12, x, 2.1, z, lam(dark ? '#f8fafc' : '#ffffff'));
      const short = p.qui.length > 26 ? `${p.qui.slice(0, 24)}…` : p.qui;
      const e = { x, z: z + 0.6, qui: p.qui, fait: p.fait, label: p.qui, panneau: true, first: true, kind: 'guichet', color: hex };
      e.lb = mkLabel(`▤ ${esc(short)}`, 'small', new THREE.Vector3(x, 3.1, z), { far: 60, len: short.length + 2, prio: 0, p: e }); e.lb.off = true; labels.push(e.lb);
      people.push(e);
    });
    const title = mkLabel(`<span class="${b.rive}">${svgIcon(lot.id)}</span>${esc(b.nom)}`, '', new THREE.Vector3(0, 4.3, -D / 2 + 0.3), { far: 90, len: b.nom.length + 2, prio: 3 }); title.off = true; labels.push(title);
    const room = { scene: sc, people, groups, W: Wd, D, zp, labels, center: new THREE.Vector3(0, 1.1, zp + Math.max(2.5, maxR * 0.5)), fit: Math.max(Wd * 0.7, D * 0.8) + 3 };
    rooms.set(lot.id, room); return room;
  }

  // ---------- État
  const S = {
    mode: 'drive', pos: new THREE.Vector3(0, 0, ZEND + 6), alt: 6, vx: 0, vz: 0, heading: Math.PI, camYaw: Math.PI, camOff: 0, look: new THREE.Vector3(0, 1, ZEND - 6),
    inside: null, room: null, focus: null, near: null, route: null, tour: null, instant: false, visited: new Set(),
    orb: { yaw: 0, pitch: 1.2, r: 20, vy: 0, tgt: new THREE.Vector3() }, metier: { rive: 'ec', band: null, cx: 0, cz: 0, hh: 60 }, tab: null, uiBand: null,
  };
  const curBand = () => bandOf(S.inside ? S.inside.z : S.pos.z);

  // ---------- Encarts du haut : une ligne de contexte, une rangée d'onglets, un tiroir fermé par défaut.
  const tab = (id, txt, on) => `<button type="button" class="v3-btn sm ${on ? 'on' : ''}" data-a="tab" data-t="${id}">${txt}</button>`;
  const peopleList = (r) => `<ul class="v3-people">${r.people.filter((p) => p.first && !p.panneau).map((p) => `<li><button type="button" data-a="to" data-i="${r.people.indexOf(p)}"><span class="face ${p.g.role === 'magistrat' ? 'hat' : ''}" style="--fc:${p.color}"></span><span><span class="n">${p.g.approx ? '' : `${p.g.n} `}</span>${esc(p.g.label)}${p.g.debout ? '<em>présent, non membre</em>' : ''}</span></button></li>`).join('')}</ul>`;
  const twinHtml = (b) => {
    const twin = b.jumeau && lotOf(b.jumeau); if (!twin) return '<p class="v3-sub">Pas de jumeau : cette institution est commune aux deux professions, ou propre à l’une sans équivalent.</p>';
    const rows = VILLE.jumeaux?.[twinKey(b.id, twin.id)] || [], ecB = b.rive === 'ec' ? b : twin.b, cacB = b.rive === 'ec' ? twin.b : b;
    return `${rows.length ? `<table class="v3-cmp"><tr><th></th><th class="ec">EC · ${esc(ecB.court)}</th><th class="cac">CAC · ${esc(cacB.court)}</th></tr>${rows.map(([t, e, c]) => `<tr><td>${esc(t)}</td><td>${md(e)}</td><td>${md(c)}</td></tr>`).join('')}</table>` : ''}
      <h5>Qui siège chez le jumeau</h5><div class="cp-b" style="cursor:auto;padding:4px 10px">${compositionItems(twin.id)}</div><div class="v3-acts"><button type="button" class="v3-btn sm primary" data-a="go" data-id="${twin.id}">Aller chez ${esc(twin.b.court)}</button></div>`;
  };
  const guichetsHtml = (r) => `<ul class="v3-people">${r.people.filter((p) => p.panneau).map((p) => `<li><button type="button" data-a="to" data-i="${r.people.indexOf(p)}"><span>▤ ${esc(p.qui)}</span></button></li>`).join('')}</ul>`;
  const tourBar = () => (S.tour ? `<p class="v3-sub">${esc(S.tour.titre)} · étape ${S.tour.i + 1} / ${S.tour.ids.length}</p>` : '');
  const seg = (a, v, cur, t) => `<button type="button" data-a="${a}" data-v="${v}" class="${cur === v ? 'on' : ''}">${t}</button>`;
  function setUI() {
    let where, row = '', body = null, legend = false;
    if (S.mode === 'metier') {
      const st = S.metier.band, i = st ? STREETS.indexOf(st) : -1, m = S.metier;
      where = `<div class="tx"><b>${st ? esc(st.nom) : `Vue métier · ${m.rive === 'ec' ? 'Expert-comptable' : m.rive === 'cac' ? 'Commissaire aux comptes' : 'les deux rives'}`}</b><span class="v3-sub">${st ? `bande ${STREETS.length - i} / ${STREETS.length} · touchez un bâtiment pour y aller` : 'touchez un bâtiment pour y aller'}</span></div>${st ? `<button type="button" class="v3-btn sm" data-a="metier-step" data-v="1" aria-label="Bande au sud">▼</button><button type="button" class="v3-btn sm" data-a="metier-step" data-v="-1" aria-label="Bande au nord">▲</button>` : ''}<button type="button" class="v3-btn sm primary" data-a="metier-off">Voler</button>`;
      row = `<div class="seg">${seg('metier-rive', 'ec', m.rive, 'EC')}${seg('metier-rive', 'cac', m.rive, 'CAC')}${seg('metier-rive', 'tout', m.rive, 'Tout')}</div><div class="seg">${seg('metier-zoom', 'col', st ? 'band' : 'col', 'Toute la rive')}${seg('metier-zoom', 'band', st ? 'band' : 'col', 'Bande par bande')}</div>`;
      legend = true;
    } else if (S.inside) {
      const r = S.room, b = S.inside.b, f = S.focus, t = S.tab;
      where = `<span class="${b.rive}">${svgIcon(S.inside.id)}</span><div class="tx"><b>${esc(b.nom)}</b><span class="v3-sub">${esc(S.inside.st.nom)} · glissez pour tourner, pincez pour zoomer</span></div><button type="button" class="v3-btn sm" data-a="exit">Sortir</button>`;
      row = tab('qui', `Qui siège (${r.groups.length})`, t === 'qui') + tab('quoi', `Ce qu’on y fait (${b.pancartes.length})`, t === 'quoi') + tab('jumeau', 'Jumeau', t === 'jumeau') + (opts.onFiche ? `<button type="button" class="v3-btn sm" data-a="fiche" data-f="${esc(b.fiche)}">Fiche</button>` : '');
      if (f) body = `<p><strong style="color:${f.color}">${esc(f.qui)}</strong></p><p>${md(f.fait)}</p><div class="v3-acts"><button type="button" class="v3-btn sm" data-a="unfocus">Vue d’ensemble</button>${S.tour ? '<button type="button" class="v3-btn sm primary" data-a="tour-next">Suivant ›</button>' : ''}</div>`;
      else if (t === 'qui') body = `<p class="v3-sub">Touchez une personne, ici ou dans la salle : elle dit ce qu’elle fait.</p>${peopleList(r)}`;
      else if (t === 'quoi') body = `<p class="v3-sub">${md(b.role)}</p>${guichetsHtml(r)}${b.pieges?.length ? `<h5>Pièges</h5>${b.pieges.map((p) => `<p>⚠ ${md(p)}</p>`).join('')}` : ''}`;
      else if (t === 'jumeau') body = twinHtml(b);
      if (S.tour && !f) body = (body || '') + `<div class="v3-acts"><button type="button" class="v3-btn sm primary" data-a="tour-next">Bâtiment suivant ›</button><button type="button" class="v3-btn sm" data-a="tour-stop">Fin du parcours</button></div>${tourBar()}`;
    } else if (S.route) {
      const b = S.route.lot.b;
      where = `<span class="${b.rive}">${svgIcon(b.id)}</span><div class="tx"><b>En vol vers ${esc(b.court)}</b><span class="v3-sub">${esc(S.route.lot.st.nom)} · ${S.route.lot.sgn < 0 ? 'rive EC' : S.route.lot.sgn > 0 ? 'rive CAC' : 'esplanade'}</span></div><button type="button" class="v3-btn sm" data-a="stop">Arrêter</button>`;
      if (S.tour) body = `<p>${md(S.tour.etapes?.[S.tour.i]?.[1] || '')}</p>${tourBar()}`;
    } else if (S.near) {
      const l = S.near, b = l.b, twin = b.jumeau && lotOf(b.jumeau), t = S.tab;
      where = `<span class="${b.rive}">${svgIcon(l.id)}</span><div class="tx"><b>${esc(b.nom)}</b><span class="v3-sub">${esc(l.st.nom)} · ${esc(b.type)}</span></div><button type="button" class="v3-btn sm primary" data-a="enter">Entrer</button>`;
      row = tab('role', 'À quoi ça sert', t === 'role') + tab('jumeau', twin ? `Jumeau : ${esc(twin.b.court)}` : 'Jumeau', t === 'jumeau') + (opts.onFiche ? `<button type="button" class="v3-btn sm" data-a="fiche" data-f="${esc(b.fiche)}">Fiche</button>` : '');
      if (t === 'role') body = `<p>${md(b.role)}</p><p class="v3-sub"><span class="${b.rive}">●</span> ${VILLE.rives[b.rive]}${b.chiffres?.length ? ` · ${b.chiffres.map(esc).join(' · ')}` : ''}<br>Symbole : ${esc(SYMBOLES[l.id][1])}.</p>${b.pieges?.length ? b.pieges.map((p) => `<p>⚠ ${md(p)}</p>`).join('') : ''}`;
      else if (t === 'jumeau') body = twinHtml(b);
      if (S.tour) body = (body || `<p>${md(S.tour.etapes?.[S.tour.i]?.[1] || '')}</p>`) + `<div class="v3-acts"><button type="button" class="v3-btn sm primary" data-a="tour-next">Suivant ›</button><button type="button" class="v3-btn sm" data-a="tour-stop">Fin du parcours</button></div>${tourBar()}`;
    } else {
      const st = curBand();
      where = `<i style="width:12px;height:12px;border-radius:3px;background:${st.c};flex-shrink:0"></i><div class="tx"><b>${esc(st.nom)}</b><span class="v3-sub">${zoneName(S.pos.x, S.pos.z)} · approchez d’une porte pour entrer</span></div><button type="button" class="v3-btn sm primary" data-a="list">Aller à</button>`;
      row = `<button type="button" class="v3-btn sm" data-a="metier">Vue métier</button><button type="button" class="v3-btn sm" data-a="tours">Parcours</button>`;
    }
    whereEl.innerHTML = where; rowEl.innerHTML = row; rowEl.hidden = !row;
    legendEl.hidden = !legend; if (legend) legendEl.innerHTML = [...STREETS].reverse().map((st) => `<span><i style="background:${st.c}"></i>${esc(st.nom)}</span>`).join('');
    drawer.hidden = body == null; if (body != null) { drawer.innerHTML = body; drawer.scrollTop = 0; }
    S.uiBand = S.mode === 'drive' && !S.near && !S.route ? curBand() : null;
    reframe();
  }

  // ---------- Feuilles (Aller à, parcours, options)
  function openList() {
    const cur = S.inside || S.near;
    sheet.innerHTML = `<div class="v3-sheet-head"><strong>Aller à <span class="v3-sub">· ${S.visited.size} / ${LOTS.length} visités</span></strong><div class="v3-opt"><button type="button" class="v3-btn sm ${S.instant ? '' : 'on'}" data-a="mode" data-v="drive">En vol</button><button type="button" class="v3-btn sm ${S.instant ? 'on' : ''}" data-a="mode" data-v="instant">Instantané</button><button type="button" class="v3-btn sm" data-a="close">Fermer</button></div></div>
      ${QUARTIERS_LISTE.map((q) => `<h4><i style="background:${col[q.rive]}"></i>${esc(q.titre)}</h4><div class="v3-list">${q.ids.map((id) => { const l = lotOf(id); return `<button type="button" data-a="go" data-id="${id}" class="${l === cur ? 'here' : ''} ${S.visited.has(id) ? 'seen' : ''}"><span class="${l.b.rive}">${svgIcon(id)}</span><span>${esc(l.b.court)}<small>${esc(l.st.nom)}</small></span></button>`; }).join('')}</div>`).join('')}`;
    sheet.hidden = false; sheet.scrollTop = 0;
  }
  function openTours() {
    sheet.innerHTML = `<div class="v3-sheet-head"><strong>Parcours</strong><button type="button" class="v3-btn sm" data-a="close">Fermer</button></div><p class="v3-sub" style="margin:0 0 8px">Un fil rouge suit un dossier de bâtiment en bâtiment. Refaites-le ensuite de mémoire.</p>
      <div class="v3-list">${(VILLE.parcours || []).map((p) => `<button type="button" data-a="tour" data-p="${p.id}"><span class="${p.rive}">${svgIcon(p.etapes[0][0])}</span><span>${esc(p.titre)}<small>${p.etapes.map(([id]) => lotOf(id).b.court).join(' → ')}</small></span></button>`).join('')}
      <button type="button" data-a="tour" data-p="tout"><span class="commun">${svgIcon('ifac')}</span><span>Tous les bâtiments<small>${LOTS.length} étapes, du sud au nord</small></span></button></div>`;
    sheet.hidden = false; sheet.scrollTop = 0;
  }
  function openCompo() {
    sheet.innerHTML = `<div class="v3-sheet-head"><strong>Qui compose chaque institution</strong><button type="button" class="v3-btn sm" data-a="close">Fermer</button></div><p class="v3-sub" style="margin:0 0 4px">Touchez une institution pour y aller.</p>${compositionHtml()}`;
    sheet.hidden = false; sheet.scrollTop = 0;
  }
  function openOpts() {
    sheet.innerHTML = `<div class="v3-sheet-head"><strong>Options</strong><button type="button" class="v3-btn sm" data-a="close">Fermer</button></div>
      <div class="v3-acts" style="flex-direction:column;align-items:stretch">
      <button type="button" class="v3-btn primary" data-a="list">Aller à un bâtiment</button>
      <button type="button" class="v3-btn" data-a="tours">Parcours (fils rouges)</button>
      <button type="button" class="v3-btn" data-a="metier">Vue métier (de dessus, par profession)</button>
      <button type="button" class="v3-btn" data-a="compo">Composition de chaque institution</button></div>
      <h4>Les bandes, du sud au nord</h4><div class="v3-sub">${[...STREETS].reverse().map((st) => `<span style="display:inline-flex;gap:5px;align-items:center;margin:2px 10px 2px 0"><i style="width:10px;height:10px;border-radius:3px;background:${st.c};display:inline-block"></i>${esc(st.nom)}</span>`).join('')}</div>
      <p class="v3-sub">Joystick : voler. Glisser sur la scène : monter ou descendre (vertical), tourner la caméra (horizontal). Turbo : maintenir.</p>
      <h4>Les symboles des façades</h4><div class="v3-list">${TOUR3D.map((id) => `<button type="button" data-a="go" data-id="${id}"><span class="${lotOf(id).b.rive}">${svgIcon(id)}</span><span>${esc(lotOf(id).b.court)}<small>${esc(SYMBOLES[id][1])}</small></span></button>`).join('')}</div>`;
    sheet.hidden = false; sheet.scrollTop = 0;
  }
  const closeSheets = () => { sheet.hidden = true; };

  // ---------- Modes : vol, intérieur, vue métier
  function setMode(m) {
    S.mode = m; root.classList.toggle('drive', m === 'drive');
    if (m !== 'inside') hideLabels(S.room ? S.room.labels : []);
    if (m !== 'metier') hideLabels(bandLabels.concat(blabels));
  }
  function setOrtho() {
    const hh = S.metier.hh, aspect = W / H; ortho.left = -hh * aspect; ortho.right = hh * aspect; ortho.top = hh; ortho.bottom = -hh; ortho.updateProjectionMatrix();
  }
  // Vue métier : une rive entière (ou une bande), de dessus, le nord en haut.
  function metierFrame(rive, band) {
    S.metier.rive = rive; S.metier.band = band;
    const aspect = W / H, xr = rive === 'ec' ? [-27, 7] : rive === 'cac' ? [-7, 27] : [-27, 27];
    S.metier.cx = (xr[0] + xr[1]) / 2;
    if (band) { S.metier.cz = band.z; S.metier.hh = Math.max(BAND / 2 + 1.5, (xr[1] - xr[0]) / 2 / aspect + 1); }
    else { S.metier.cz = 0; S.metier.hh = Math.max(ZEND + 4, (xr[1] - xr[0]) / 2 / aspect + 1); }
    setOrtho(); setUI();
  }
  function metierOn() { if (S.inside) exit(true); closeSheets(); S.route = null; S.vx = S.vz = 0; setMode('metier'); metierFrame(S.pos.x > 0 ? 'cac' : 'ec', null); }
  function metierOff() { setMode('drive'); snapCamera(); setUI(); }

  function snapCamera() {
    const f = { x: Math.sin(S.camYaw), z: Math.cos(S.camYaw) };
    camera.position.set(S.pos.x - f.x * 8, S.alt + 3, S.pos.z - f.z * 8); S.look.set(S.pos.x + f.x * 6, S.alt * 0.4, S.pos.z + f.z * 6); camera.lookAt(S.look);
  }
  const faceHeading = (lot) => Math.atan2(-lot.nx, -lot.nz);
  function placeAt(lot) { S.pos.set(lot.stop.x, 0, lot.stop.z); S.alt = 2.5; S.heading = faceHeading(lot); S.camYaw = S.heading; S.camOff = 0; S.vx = S.vz = 0; S.near = lot; S.route = null; S.tab = null; snapCamera(); }
  function goTo(lot, then = null) {
    closeSheets();
    if (S.mode === 'metier') { setMode('drive'); placeAt(lot); setUI(); if (then === 'enter') enter(lot); return; }
    if (S.inside) exit(true);
    if (S.instant) { placeAt(lot); setUI(); if (then === 'enter') enter(lot); return; }
    S.route = { lot, then }; S.near = null; S.tab = null; setUI();
  }
  function arrive() {
    const { lot, then } = S.route; S.route = null; S.vx = S.vz = 0; S.near = lot; S.tab = null; S.pos.set(lot.stop.x, 0, lot.stop.z); setUI();
    if (then === 'enter') enter(lot);
  }
  function enter(lot) {
    S.inside = lot; S.room = buildRoom(lot); S.focus = null; S.route = null; S.tab = null; S.visited.add(lot.id);
    const o = S.orb; o.yaw = 0; o.pitch = 1.2; o.r = S.room.fit; o.vy = 0; o.tgt.copy(S.room.center);
    camera.position.set(0, 6, S.room.D); camera.lookAt(o.tgt);
    setMode('inside'); setUI(); closeSheets();
  }
  function exit(silent) {
    const lot = S.inside; if (!lot) return;
    hideLabels(S.room.labels); S.inside = null; S.room = null; S.focus = null; S.tab = null;
    S.pos.set(lot.stop.x, 0, lot.stop.z); S.alt = 2.5; S.heading = faceHeading(lot); S.camYaw = S.heading; S.camOff = 0; S.vx = S.vz = 0; S.near = lot; setMode('drive'); snapCamera();
    if (!silent) setUI();
  }
  function focusOn(p) {
    S.focus = p; const o = S.orb; o.tgt.set(p.x, 1.1, p.z); o.r = Math.min(o.r, 6.5);
    const dz = p.z - S.room.zp, dx = p.x; if (p.kind === 'siege' && (dx || dz)) o.yaw = Math.atan2(dx, dz) + Math.PI; else if (p.kind === 'guichet') o.yaw = 0;
    for (const q of S.room.people) if (q.lb) q.lb.el.classList.toggle('sel', q === p);
    setUI();
  }
  function unfocus() { S.focus = null; const o = S.orb; o.tgt.copy(S.room.center); o.r = S.room.fit; for (const q of S.room.people) if (q.lb) q.lb.el.classList.remove('sel'); setUI(); }
  const startTour = (pid) => {
    const p = (VILLE.parcours || []).find((x) => x.id === pid);
    S.tour = p ? { titre: p.titre, ids: p.etapes.map(([id]) => id), etapes: p.etapes, i: 0 } : { titre: 'Tous les bâtiments', ids: TOUR3D, i: 0 };
    goTo(lotOf(S.tour.ids[0]));
  };
  const nextTour = () => { if (!S.tour) return; S.tour.i++; if (S.tour.i >= S.tour.ids.length) { S.tour = null; if (S.inside) exit(true); setUI(); drawer.hidden = false; drawer.innerHTML = '<p><strong>Parcours terminé.</strong> Refaites-le de mémoire : nommez chaque bâtiment avant d’y arriver.</p>'; return; } goTo(lotOf(S.tour.ids[S.tour.i])); };

  // ---------- Commandes
  const keys = {};
  let turboOn = false, stick = null, visible = true;
  const onDown = (e) => {
    if (!visible || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (e.repeat) { keys[k] = true; return; }
    keys[k] = true;
    if (k === 'enter' || k === 'e') { e.preventDefault(); if (!sheet.hidden) return; if (S.inside) exit(); else if (S.near) enter(S.near); }
    else if (k === 'escape') { if (!sheet.hidden) closeSheets(); else if (S.inside) exit(); else if (S.mode === 'metier') metierOff(); }
    else if (k === 'l') { if (sheet.hidden) openList(); else closeSheets(); }
    else if (k === 'm') { if (S.mode === 'metier') metierOff(); else metierOn(); }
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
  const setTurbo = (on) => { turboOn = on; turboBtn.classList.toggle('on', on); };
  turboBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); setTurbo(true); try { turboBtn.setPointerCapture(e.pointerId); } catch { /* ignore */ } });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) turboBtn.addEventListener(ev, () => setTurbo(false));
  turboBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  root.addEventListener('click', (e) => {
    const cpb = e.target.closest('#v3-sheet .cp-b[data-id]'); if (cpb) return goTo(lotOf(cpb.dataset.id));
    const t = e.target.closest('[data-a]'); if (!t || !root.contains(t)) return;
    const a = t.dataset.a;
    if (a === 'list') openList(); else if (a === 'opts') openOpts(); else if (a === 'close') closeSheets(); else if (a === 'tours') openTours(); else if (a === 'compo') openCompo();
    else if (a === 'go') goTo(lotOf(t.dataset.id));
    else if (a === 'enter' && S.near) enter(S.near); else if (a === 'exit') exit();
    else if (a === 'to' && S.room) focusOn(S.room.people[Number(t.dataset.i)]);
    else if (a === 'unfocus') unfocus();
    else if (a === 'tab') { S.tab = S.tab === t.dataset.t ? null : t.dataset.t; if (S.focus) { S.focus = null; for (const q of S.room.people) if (q.lb) q.lb.el.classList.remove('sel'); } setUI(); }
    else if (a === 'stop') { S.route = null; setUI(); }
    else if (a === 'tour') startTour(t.dataset.p); else if (a === 'tour-next') nextTour(); else if (a === 'tour-stop') { S.tour = null; setUI(); }
    else if (a === 'metier') metierOn(); else if (a === 'metier-off') metierOff();
    else if (a === 'metier-rive') metierFrame(t.dataset.v, S.metier.band);
    else if (a === 'metier-zoom') metierFrame(S.metier.rive, t.dataset.v === 'band' ? (S.metier.band || bandOf(S.pos.z)) : null);
    else if (a === 'metier-step') { const i = clamp(STREETS.indexOf(S.metier.band) + Number(t.dataset.v), 0, STREETS.length - 1); metierFrame(S.metier.rive, STREETS[i]); }
    else if (a === 'mode') { S.instant = t.dataset.v === 'instant'; openList(); }
    else if (a === 'fiche') opts.onFiche?.(t.dataset.f);
    else if (a === 'quit') opts.onQuit?.();
  });
  // Gestes sur la scène : en vol, glisser = hauteur (vertical) et caméra (horizontal) ; dedans, orbite et pincement ;
  // en vue métier, déplacement et pincement. Un toucher bref désigne un bâtiment ou une personne.
  const ray = new THREE.Raycaster(); const ptrs = new Map(); let gesture = null;
  const startGesture = (id, x, y, moved) => ({ id, x0: x, y0: y, x, y, moved, alt: S.alt, off: S.camOff, yaw: S.orb.yaw, pitch: S.orb.pitch, cx: S.metier.cx, cz: S.metier.cz });
  canvas.addEventListener('pointerdown', (e) => {
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    if (ptrs.size === 1) gesture = startGesture(e.pointerId, e.clientX, e.clientY, false);
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; gesture = { pinch: true, d0: Math.hypot(a.x - b.x, a.y - b.y), r0: S.orb.r, hh0: S.metier.hh, moved: true }; }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId); if (!p) return; p.x = e.clientX; p.y = e.clientY;
    if (!gesture) return;
    if (gesture.pinch) { const [a, b] = [...ptrs.values()]; const k = gesture.d0 / Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)); if (S.mode === 'inside') S.orb.r = clamp(gesture.r0 * k, 3.5, S.room.fit * 1.6); else if (S.mode === 'metier') { S.metier.hh = clamp(gesture.hh0 * k, 8, 80); setOrtho(); } return; }
    if (e.pointerId !== gesture.id) return;
    const dx = e.clientX - gesture.x0, dy = e.clientY - gesture.y0; if (!gesture.moved && Math.hypot(dx, dy) < 8) return; gesture.moved = true;
    const ddx = e.clientX - gesture.x; gesture.x = e.clientX; gesture.y = e.clientY;
    if (S.mode === 'inside') { S.orb.yaw = gesture.yaw - dx * 0.007; S.orb.pitch = clamp(gesture.pitch + dy * 0.005, 0.35, 1.35); S.orb.vy = -ddx * 0.007; }
    else if (S.mode === 'metier') { const k = 2 * S.metier.hh / H; S.metier.cx = gesture.cx - dx * k; S.metier.cz = gesture.cz - dy * k; }
    else { S.alt = clamp(gesture.alt - dy / 12, ALT.min, ALT.max); S.camOff = gesture.off - dx * 0.008; }
  });
  const endPtr = (e) => {
    const was = gesture; ptrs.delete(e.pointerId);
    if (ptrs.size === 0) gesture = null; else if (ptrs.size === 1 && was?.pinch) { const [[id, p]] = [...ptrs.entries()]; gesture = startGesture(id, p.x, p.y, true); }
    if (e.type !== 'pointerup' || !was || was.pinch || was.id !== e.pointerId || was.moved) return;
    const r = canvas.getBoundingClientRect(), cam = S.mode === 'metier' ? ortho : camera;
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
    if (S.inside) {
      const ms = S.room.people.filter((p) => p.mesh).map((p) => p.mesh); const hit = ray.intersectObjects(ms, true)[0]; if (!hit) return;
      let o = hit.object; while (o.parent && !ms.includes(o)) o = o.parent; const p = S.room.people.find((q) => q.mesh === o); if (p) focusOn(p);
      return;
    }
    const hit = ray.intersectObjects(pick, false)[0]; if (hit) { const l = lotOf(hit.object.userData.id); if (S.mode === 'metier') goTo(l); else if (l === S.near) enter(l); else goTo(l); }
  };
  canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); if (S.mode === 'inside') S.orb.r = clamp(S.orb.r * (1 + Math.sign(e.deltaY) * 0.1), 3.5, S.room.fit * 1.6); else if (S.mode === 'metier') { S.metier.hh = clamp(S.metier.hh * (1 + Math.sign(e.deltaY) * 0.1), 8, 80); setOrtho(); } else S.alt = clamp(S.alt - Math.sign(e.deltaY) * 1.5, ALT.min, ALT.max); }, { passive: false });
  const io = new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; }); io.observe(root);

  // ---------- Boucle
  function input() {
    const kf = (keys.arrowup || keys.z || keys.w ? 1 : 0) - (keys.arrowdown || keys.s ? 1 : 0);
    const kt = (keys.arrowleft || keys.q || keys.a ? 1 : 0) - (keys.arrowright || keys.d ? 1 : 0);
    if (keys.pageup || keys['+']) S.alt = clamp(S.alt + 0.4, ALT.min, ALT.max); if (keys.pagedown || keys['-']) S.alt = clamp(S.alt - 0.4, ALT.min, ALT.max);
    const jm = stick ? Math.hypot(stick.jx, stick.jy) : 0;
    const jx = jm > 0.15 ? stick.jx : -kt, jy = jm > 0.15 ? stick.jy : -kf, m = Math.hypot(jx, jy);
    return { jx, jy, m: Math.min(1, m), turbo: !!keys.shift || turboOn, any: m > 0.15 };
  }
  // Vol : le joystick pousse le drone dans la direction vue par la caméra ; il se tourne vers où il va.
  function stepFly(dt, I) {
    if (I.any && S.route) { S.route = null; setUI(); }
    const vmax = I.turbo ? 42 : 16; let tx = 0, tz = 0;
    if (S.route) {
      const to = S.route.lot.stop, d = hyp(to, S.pos);
      if (d < 0.7 && Math.abs(S.alt - 2.5) < 0.6) { arrive(); }
      else {
        const sp = Math.min(I.turbo ? 60 : 36, Math.sqrt(2 * 16 * d) + 1), ux = (to.x - S.pos.x) / (d || 1), uz = (to.z - S.pos.z) / (d || 1);
        tx = ux * sp; tz = uz * sp;
        const wantAlt = d > 14 ? Math.max(10, S.alt) : 2.5 + (d / 14) * 8; S.alt += (wantAlt - S.alt) * Math.min(1, dt * 2.5);
      }
    } else if (I.any) {
      const a = S.camYaw + S.camOff, fx = Math.sin(a), fz = Math.cos(a), rx = -Math.cos(a), rz = Math.sin(a);
      tx = (fx * -I.jy + rx * I.jx) * I.m * vmax; tz = (fz * -I.jy + rz * I.jx) * I.m * vmax;
    }
    const k = Math.min(1, dt * (tx || tz ? 3 : 4)); S.vx += (tx - S.vx) * k; S.vz += (tz - S.vz) * k;
    S.pos.x += S.vx * dt; S.pos.z += S.vz * dt;
    if (pushOut(S.pos, 1, S.alt)) { S.vx *= 0.3; S.vz *= 0.3; }
    const sp = Math.hypot(S.vx, S.vz);
    if (sp > 1.5) { S.heading += angDiff(S.heading, Math.atan2(S.vx, S.vz)) * Math.min(1, dt * 5); S.camYaw += angDiff(S.camYaw, S.heading) * (1 - Math.exp(-dt * 2)); if (!gesture) S.camOff *= Math.exp(-dt * 1.5); }
    else if (S.near && !S.route) { S.heading += angDiff(S.heading, faceHeading(S.near)) * Math.min(1, dt * 3); }
    drone.position.set(S.pos.x, S.alt + Math.sin(performance.now() / 600) * 0.08, S.pos.z); drone.rotation.set(clamp(-S.vz * 0.012, -0.3, 0.3) * Math.cos(S.heading) + clamp(-S.vx * 0.012, -0.3, 0.3) * Math.sin(S.heading), S.heading, 0);
    for (const r of rotors) r.rotation.y += dt * 40;
    if (!S.route) {
      let best = null, bd = 4.5; for (const l of LOTS) { const d = hyp(l.stop, S.pos); if (d < bd && S.alt < l.h + 6) { bd = d; best = l; } }
      if (best !== S.near) { S.near = best; S.tab = null; setUI(); }
      else if (!best && curBand() !== S.uiBand) setUI();
    }
    altEl.textContent = `hauteur ${Math.round(S.alt)} m · glissez pour monter`;
  }
  const camTarget = new THREE.Vector3(), lookTarget = new THREE.Vector3();
  function stepCamera(dt) {
    if (S.mode === 'inside') {
      const o = S.orb; if (!gesture) { o.yaw += o.vy; o.vy *= Math.exp(-dt * 6); }
      camTarget.set(o.tgt.x + Math.sin(o.yaw) * Math.sin(o.pitch) * o.r, o.tgt.y + Math.cos(o.pitch) * o.r, o.tgt.z + Math.cos(o.yaw) * Math.sin(o.pitch) * o.r);
      camTarget.y = Math.max(camTarget.y, 1.5); lookTarget.copy(o.tgt);
      camera.position.lerp(camTarget, 1 - Math.exp(-dt * 8)); S.look.lerp(lookTarget, 1 - Math.exp(-dt * 8)); camera.lookAt(S.look); return;
    }
    const a = S.camYaw + S.camOff, f = { x: Math.sin(a), z: Math.cos(a) }, sp = Math.hypot(S.vx, S.vz), alt = S.alt;
    const dist = 6 + alt * 0.3 + sp * 0.08, h = alt + 2.4 + alt * 0.35, ahead = 9 + alt * 0.8;
    camTarget.set(S.pos.x - f.x * dist, h, S.pos.z - f.z * dist); lookTarget.set(S.pos.x + f.x * ahead, Math.max(0, alt * 0.2), S.pos.z + f.z * ahead);
    // À l'arrêt devant une porte : vue de trois quarts sur la façade.
    if (S.near && !S.route && sp < 1.5 && !gesture) { const l = S.near; if (l.sgn) camTarget.set(l.faceX + l.nx * (12 + alt * 0.5), 4.5 + alt * 0.7, l.z + 5); else camTarget.set(l.nx * 4.5, 8.5 + alt * 0.6, l.z + 7 + alt * 0.3); lookTarget.set(l.faceX, l.h * 0.45, l.faceZ); }
    for (const l of LOTS) if (Math.abs(camTarget.x - l.x) < l.w / 2 + 1.5 && Math.abs(camTarget.z - l.z) < l.d / 2 + 1.5) camTarget.y = Math.max(camTarget.y, l.h + 2);
    const fov = 56 + clamp((sp - 20) / 30, 0, 1) * 10; if (Math.abs(camera.fov - fov) > 0.2) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
    camera.position.lerp(camTarget, 1 - Math.exp(-dt * 6)); S.look.lerp(lookTarget, 1 - Math.exp(-dt * 9)); camera.lookAt(S.look);
  }
  let fpsAcc = 0, fpsN = 0, degrade = 0;
  function watchFps(dt) {
    fpsAcc += dt; fpsN++; if (fpsAcc < 2) return;
    const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
    if (fps < 38 && degrade === 0) { degrade = 1; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; sun.castShadow = false; }
    else if (fps < 38 && degrade === 1) { degrade = 2; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25)); resize(); }
  }
  let alive = true, last = performance.now(), frame = 0;
  function loop(now) {
    if (!alive) return; requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!visible || document.hidden) return;
    const I = input();
    if (S.mode === 'drive') stepFly(dt, I);
    stepCamera(dt); watchFps(dt);
    riverTex.offset.y -= dt * 0.08;
    if (S.mode === 'inside') { renderer.render(S.room.scene, camera); if (frame % 2 === 0) { for (const it of S.room.labels) it.off = false; updateLabels(camera, S.room.labels, 12); } }
    else if (S.mode === 'metier') {
      ortho.position.set(S.metier.cx, 120, S.metier.cz); ortho.lookAt(S.metier.cx, 0, S.metier.cz);
      renderer.render(city, ortho);
      if (frame % 2 === 0) { for (const it of blabels) { it.off = S.metier.rive !== 'tout' && it.lot.b.rive !== 'commun' && it.lot.b.rive !== S.metier.rive; it.prio = 1; it.near = 0; it.h = 22; it.w = it.len * 6.6 + 20; it.el.classList.add('small'); } for (const it of bandLabels) { it.off = false; it.prio = 0; it.near = 0; } updateLabels(ortho, bandLabels.concat(blabels), 40); }
    } else {
      renderer.render(city, camera);
      if (frame % 2 === 0) { const st = curBand(); for (const it of blabels) { it.off = false; it.near = 6; it.h = 26; it.w = it.len * 7.6 + 24; it.el.classList.remove('small'); it.prio = it.lot === S.near ? 3 : it.lot.st === st ? 1 : 0; } for (const it of bandLabels) { it.off = false; it.prio = it.st === st ? 2 : 1; it.near = 4; } updateLabels(camera, bandLabels.concat(blabels), 10); }
    }
    frame++;
  }
  resize(); snapCamera(); setMode('drive'); setUI();
  ro.observe($('.v3-ui'));
  requestAnimationFrame(loop);

  return {
    stop() {
      alive = false; ro.disconnect(); io.disconnect(); window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp);
      for (const r of rooms.values()) r.scene.clear(); city.clear();
      for (const d of disposables) { try { d.dispose(); } catch { /* ignore */ } }
      renderer.dispose();
    },
    goto(id, then) { const l = lotOf(id); if (l) goTo(l, then); },
    place(id) { const l = lotOf(id); if (l) { if (S.inside) exit(true); if (S.mode === 'metier') setMode('drive'); placeAt(l); setUI(); } },
    enter(id) { const l = lotOf(id); if (l) { if (S.inside) exit(true); if (S.mode === 'metier') setMode('drive'); placeAt(l); enter(l); } },
    metier() { metierOn(); },
    state: S,
  };
}
