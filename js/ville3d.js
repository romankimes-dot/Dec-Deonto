// La ville des institutions, version « palais mental » : on conduit un véhicule dans la ville (js/ville.js donne
// les bâtiments et leurs pancartes), on entre dans chaque bâtiment, on y marche parmi les gens qui le composent
// (magistrats, élus, fonctionnaires, personnalités qualifiées), chacun dit qui il est et ce qu'il fait.
// Rendu WebGL avec three.js (passé en paramètre : js/vendor/three.module.min.js dans l'app, inclus dans la page
// autonome). Clavier (flèches ou ZQSD/WASD, Maj = turbo, Entrée = entrer/sortir, Échap = sortir) et tactile
// (joystick à gauche, boutons à droite). « Aller à » téléporte devant un bâtiment. Jeu « Qui fait quoi ? » :
// entrer dans le bâtiment qui correspond à l'affirmation.

import { VILLE, batiment } from './ville.js';

// Couleurs des personnages, par rôle.
const ROLE = {
  magistrat: '#b91c1c', elu_ec: '#0e7490', elu_cac: '#7c3aed', fonctionnaire: '#64748b', qualifie: '#d97706',
  ancien_cac: '#a78bfa', durabilite: '#15803d', ministre: '#1e40af', gouvernement: '#334155', agent: '#0891b2', eip: '#5b21b6', pro: '#0f766e',
};

// Qui siège dans chaque bâtiment : groupes de personnes (n sièges), disposées autour d'une table ou en rangs.
// `fait` est ce que dit la personne quand on s'approche. Les pancartes du bâtiment deviennent des guichets le long du mur.
export const SALLES = {
  cnoec: { layout: 'table', groupes: [
    { n: 1, label: 'Président', role: 'elu_ec', qui: 'Le président du Conseil national', fait: 'Élu par le conseil. Le Conseil national **représente la profession** auprès des pouvoirs publics, **élabore les normes** (agréées par arrêté du ministre) et le **code de déontologie** (adopté par décret), organise la **formation** et **coordonne les CROEC**.' },
    { n: 14, label: 'Élu', role: 'elu_ec', qui: 'Un membre élu du Conseil national', fait: 'Élu **au suffrage direct** par les experts-comptables **depuis 2020** (avant : par les conseils régionaux), pour **4 ans**. Les fiches ne donnent pas l’effectif du conseil : retenir le mode d’élection et la durée.' },
    { n: 1, label: 'Commissaire du gouvernement', role: 'gouvernement', debout: true, qui: 'Le commissaire du gouvernement', fait: 'Représente le **ministre chargé de l’économie**. Il **assiste aux séances** sans être membre, **reçoit les décisions** et peut les contester. Il peut saisir le **comité national du tableau** contre une inscription, porter plainte et faire appel en discipline.' },
  ] },
  croec: { layout: 'table', groupes: [
    { n: 1, label: 'Président du CROEC', role: 'elu_ec', qui: 'Le président du conseil régional', fait: '**4 années consécutives au plus**, puis **2 ans** d’interruption. **Conciliateur** (accord amiable) ou **arbitre** (sentence) ; désigne le **remplaçant provisoire** d’un confrère décédé ou empêché ; **conclut** chaque contrôle de qualité au vu du rapport.' },
    { n: 10, label: 'Élu', role: 'elu_ec', qui: 'Un membre élu du conseil régional', fait: 'Élu pour **4 ans** ; le **bureau** est élu pour **2 ans**. Le conseil **tient le tableau**, statue sur les **inscriptions**, appelle les **cotisations**, organise le **contrôle de qualité**, reçoit le **serment** (dans les **6 mois** de l’inscription).' },
    { n: 1, label: 'Commissaire du gouvernement', role: 'gouvernement', debout: true, qui: 'Le commissaire du gouvernement', fait: 'Placé auprès de **chaque CROEC** comme auprès du Conseil national : assiste aux séances, reçoit les décisions ; recours devant le **comité national du tableau** contre une inscription ou un refus.' },
    { n: 2, label: 'Contrôleur qualité', role: 'pro', debout: true, qui: 'Un contrôleur de qualité', fait: 'Expert-comptable **désigné 3 ans** renouvelables par le conseil régional, **50 heures par an** au moins. Il rédige le rapport ; le **président** conclut : sans observation, simples observations, ou observations **et nouveau contrôle à un an**.' },
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
    { n: 1, label: 'Président de la CNCC', role: 'elu_cac', qui: 'Le président de la CNCC', fait: 'Élu par le Conseil national avec le **bureau**. Il peut **saisir le rapporteur général** de la H2A et reçoit sous **10 jours** le recours contre une décision d’un président de CRCC sur le **barème d’heures**.' },
    { n: 17, label: 'Président de CRCC', role: 'eip', qui: 'Un président de compagnie régionale', fait: '**Tous les présidents de CRCC** (17 depuis le 1er novembre 2020) siègent de droit au Conseil national, comptés dans les **30 sièges** de leur collège.' },
    { n: 21, label: 'CAC d’EIP élu', role: 'eip', qui: 'Un CAC d’EIP élu', fait: 'Collège des CAC **d’entités d’intérêt public** : **30 sièges** (présidents de CRCC compris). Mandat **4 ans**.' },
    { n: 21, label: 'CAC non-EIP élu', role: 'elu_cac', qui: 'Un CAC sans mandat d’EIP élu', fait: 'Collège des CAC **sans mandat d’EIP** : **30 sièges** (présidents de CRCC compris). **60 membres** en tout, pour **4 ans**.' },
  ] },
  crcc: { layout: 'table', groupes: [
    { n: 1, label: 'Président de la CRCC', role: 'elu_cac', qui: 'Le président de la compagnie régionale', fait: 'Exerce au moins **une mission de certification**. Statue sous **15 jours** sur les **dérogations au barème**, **concilie** co-commissaires et litiges d’**honoraires** (**3 mois**), peut **saisir le rapporteur général**, est **avisé** des audiences de la commission des sanctions.' },
    { n: 21, label: 'Élu', role: 'elu_cac', qui: 'Un membre élu du conseil régional', fait: '**22 membres au plus** (compagnie d’au moins 900 membres). Électeurs et éligibles : **personnes physiques à jour de cotisations**, exerçant au **30 juin** ; les **sociétés** ne sont **ni électrices ni éligibles**.' },
  ] },
  h2a: { layout: 'table', groupes: [
    { n: 1, label: 'Président (Cour de cassation)', role: 'magistrat', qui: 'Le président de la H2A', fait: '**Magistrat de la Cour de cassation**. Le collège **poursuit** : il **arrête les griefs**, que le président **notifie** ; il soutient les griefs à l’audience et **propose une sanction** ; il peut proposer une **composition administrative**.' },
    { n: 5, label: 'CE · Cour des comptes · AMF · ACPR · Trésor', role: 'fonctionnaire', qui: 'Un membre venu du Conseil d’État, de la Cour des comptes, de l’AMF, de l’ACPR ou du Trésor', fait: 'Le collège est composé de **non-praticiens majoritaires**. En urgence, sa formation plénière peut **suspendre provisoirement** un CAC **6 mois au plus** (pas une sanction).' },
    { n: 2, label: 'Personnalité qualifiée', role: 'qualifie', qui: 'Une personnalité qualifiée', fait: 'Le collège adopte aussi les **NEP** et la déontologie (homologuées par arrêté du garde des Sceaux) et délègue à la CNCC les contrôles des **non-EIP** et le **suivi de la formation**.' },
    { n: 2, label: 'Ancien CAC', role: 'ancien_cac', qui: 'Un ancien commissaire aux comptes', fait: '**2 anciens CAC** siègent au collège. Nul ne siège **à la fois** au collège et à la commission des sanctions.' },
    { n: 1, label: 'Rapporteur général', role: 'agent', debout: true, qui: 'Le rapporteur général', fait: 'Dirige le **service des enquêtes**. Saisi par la Cour des comptes, le procureur général, les présidents de l’AMF, de l’ACPR, de la H2A, de la CNCC ou d’une CRCC ; **autosaisine** sur signalement ; **pas le garde des Sceaux**. Secret **non opposable**.' },
    { n: 2, label: 'Contrôleur', role: 'agent', debout: true, qui: 'Un contrôleur de la H2A', fait: '**Salarié de la H2A**, il contrôle les CAC d’**EIP** ; les non-EIP sont contrôlés par la **CNCC par délégation**. Un soupçon de blanchiment en contrôle : il informe **lui-même Tracfin**.' },
  ] },
  sanctions: { layout: 'tribunal', groupes: [
    { n: 1, label: 'Président (Cour de cassation)', role: 'magistrat', qui: 'Le président de la commission des sanctions', fait: '**Magistrat de la Cour de cassation**. Seul et **sans débat**, il prononce en **procédure simplifiée** une sanction pécuniaire de **15 000 €** au plus (obligations déclaratives, formation continue) ; **opposition** sous 30 jours.' },
    { n: 1, label: 'Ancien CAC', role: 'ancien_cac', qui: 'La personne ayant exercé la profession de CAC', fait: 'Une des **4 personnes qualifiées**. Membres nommés par **décret** pour **6 ans**, renouvelables une fois. Aucun EC, aucun président de CRCC ni de la CNCC ne siège ici.' },
    { n: 1, label: 'Durabilité', role: 'durabilite', qui: 'La personne qualifiée en durabilité', fait: 'La commission sanctionne aussi les **auditeurs de durabilité**. Audience **publique**, **2 mois au moins** après les griefs ; décision **motivée et publiée** ; recours de **pleine juridiction** devant le **Conseil d’État**.' },
    { n: 2, label: 'Juridique · économique · financier', role: 'qualifie', qui: 'Une personne qualifiée en matière juridique, économique ou financière', fait: 'Échelle : **avertissement, blâme, interdiction temporaire (3 ans au plus), radiation**, retrait de l’honorariat, **sanction pécuniaire** (250 000 € ; société 1 M€ ou la moyenne des honoraires), publication. **Prescription 6 ans.**' },
  ] },
  bercy: { layout: 'bureau', groupes: [
    { n: 1, label: 'Ministre de l’Économie', role: 'ministre', qui: 'Le ministre chargé de l’économie', fait: '**Tutelle** de l’Ordre. **Agrée** par **arrêté** les normes professionnelles ; le code de déontologie des EC est adopté par **décret**. Il désigne les **2 fonctionnaires** de la chambre nationale de discipline.' },
    { n: 1, label: 'Commissaire du gouvernement', role: 'gouvernement', debout: true, qui: 'Le commissaire du gouvernement', fait: 'Il part d’ici siéger (sans voix) auprès du **Conseil national** et de **chaque CROEC**. Recours au **comité national du tableau**, plainte et appel en discipline ; **jamais membre** des chambres.' },
  ] },
  chancellerie: { layout: 'bureau', groupes: [
    { n: 1, label: 'Garde des Sceaux', role: 'ministre', qui: 'Le garde des Sceaux', fait: 'La **CNCC** est placée auprès de lui. Il **homologue par arrêté** les **NEP** adoptées par la H2A et les **conventions de délégation** ; peut **demander une NEP** ; **ne saisit pas** le rapporteur général ; désigne le président de la **chambre nationale** de discipline des EC.' },
  ] },
  ce: { layout: 'tribunal', groupes: [
    { n: 3, label: 'Conseiller d’État', role: 'magistrat', qui: 'Un conseiller d’État', fait: 'Pour l’**EC** : **cassation** contre la chambre nationale de discipline. Pour le **CAC** : **recours de pleine juridiction** contre la commission des sanctions, par la personne sanctionnée ou le président de la H2A après accord du collège.' },
  ] },
  ca: { layout: 'tribunal', groupes: [
    { n: 1, label: 'Premier président', role: 'magistrat', qui: 'Le premier président de la cour d’appel', fait: 'Reçoit le **serment du CAC**, **avant tout exercice**. Désigne le **magistrat qui préside la chambre régionale** de discipline des EC. Les CRCC sont établies dans le **ressort des cours d’appel**.' },
  ] },
  ta: { layout: 'tribunal', groupes: [{ n: 1, label: 'Juge administratif', role: 'magistrat', qui: 'Le juge administratif', fait: 'Recours contre l’**inscription** ou le **refus d’inscription** sur la **liste** des CAC, tenue par la H2A. Chez l’EC : comité national du tableau, saisi par le commissaire du gouvernement.' }] },
  amf: { layout: 'bureau', groupes: [
    { n: 1, label: 'Président de l’AMF', role: 'fonctionnaire', qui: 'Le président de l’AMF', fait: 'Peut **demander une NEP**, **saisir le rapporteur général** de la H2A, **demander le relèvement** d’un CAC d’une société cotée. Le **secret** du CAC lui est **levé**.' },
    { n: 1, label: 'ACPR', role: 'fonctionnaire', qui: 'Un représentant de l’ACPR', fait: 'Même rôle pour les **banques** et les **assurances**. Des membres de l’AMF et de l’ACPR siègent au **collège** de la H2A.' },
  ] },
  terrain: { layout: 'bureau', groupes: [{ n: 1, label: 'Gardien du terrain', role: 'pro', debout: true, qui: 'Le gardien du terrain vague', fait: 'Personne ne construira ici : chez l’**EC**, **aucune autorité publique indépendante** ne supervise la profession. C’est **l’Ordre** qui contrôle (CROEC) et juge (chambres) ; la tutelle passe par le **commissaire du gouvernement**.' }] },
  tj: { layout: 'tribunal', groupes: [{ n: 1, label: 'Juge civil', role: 'magistrat', qui: 'Le juge du tribunal judiciaire ou de commerce', fait: 'Répare le **préjudice** : faute, préjudice, lien de causalité. **EC** : 5 ans, réductible à 1 an, plafonnement possible. **CAC** : **3 ans** (révélation si dissimulé, 10 ans pour un crime), **ni plafond ni aménagement**.' }] },
  tcorr: { layout: 'tribunal', groupes: [{ n: 1, label: 'Juge correctionnel', role: 'magistrat', qui: 'Le juge correctionnel', fait: 'Punit une **infraction** : texte, acte, intention. CAC : **informations mensongères**, **non-révélation** (5 ans, 75 000 €), incompatibilité, usurpation du titre. EC : secret, blanchiment, faux, complicité de fraude fiscale ou d’ABS.' }] },
  parquet: { layout: 'bureau', groupes: [{ n: 1, label: 'Procureur', role: 'magistrat', qui: 'Le procureur de la République', fait: 'Le **CAC** lui **révèle les faits délictueux**, même régularisés ; omettre sciemment est un **délit**. L’**EC** n’y est **pas tenu** : devoir de conseil, refus, interruption. Le **procureur général** peut saisir le rapporteur général de la H2A.' }] },
  cass: { layout: 'tribunal', groupes: [{ n: 2, label: 'Magistrat de la Cour de cassation', role: 'magistrat', qui: 'Un magistrat de la Cour de cassation', fait: 'Deux d’entre eux **président** le **collège** et la **commission des sanctions** de la H2A. La 2e chambre civile définit la faute **dolosive**, exclue de l’assurance RC.' }] },
  ccomptes: { layout: 'tribunal', groupes: [{ n: 1, label: 'Premier président', role: 'magistrat', qui: 'Le premier président de la Cour des comptes', fait: 'Peut **saisir le rapporteur général** de la H2A, comme le président d’une **chambre régionale des comptes**. Des membres de la Cour siègent au **collège** de la H2A.' }] },
  tracfin: { layout: 'bureau', groupes: [{ n: 2, label: 'Agent Tracfin', role: 'agent', qui: 'Un agent de Tracfin', fait: 'Reçoit la **déclaration de soupçon** : de l’**EC en charge de la mission** (pas le correspondant Tracfin, pas de copie au CROEC) ou du **CAC signataire** (NEP 9605). En contrôle : l’**Ordre** informe Tracfin chez l’EC ; les **contrôleurs eux-mêmes** chez le CAC.' }] },
  cavec: { layout: 'bureau', groupes: [{ n: 1, label: 'Guichet CAVEC', role: 'fonctionnaire', qui: 'L’agent de la caisse', fait: 'Cotisations impayées **2 ans sur 10** (ordinales ou sociales, **CAVEC comprise**) : **radiation d’office** par le conseil régional, qui n’est **pas** une sanction disciplinaire.' }] },
  anc: { layout: 'bureau', groupes: [{ n: 2, label: 'ANC · CNoCP', role: 'fonctionnaire', qui: 'Un normalisateur comptable', fait: 'L’**ANC** et le **CNoCP** peuvent **demander une NEP** à la H2A, avec le garde des Sceaux, l’AMF, l’ACPR et la CNCC. **Pas une CRCC.**' }] },
  ifac: { layout: 'table', groupes: [{ n: 2, label: 'CNOEC · CNCC', role: 'pro', qui: 'Un délégué du CNOEC ou de la CNCC', fait: 'Les deux institutions françaises sont **membres** de l’IFAC, fédération mondiale. Aucune norme IFAC ne s’impose directement en France.' }] },
  iesba: { layout: 'bureau', groupes: [{ n: 1, label: 'Rédacteur du Code of Ethics', role: 'pro', qui: 'Un rédacteur de l’IESBA', fait: 'Le **Code of Ethics** et sa typologie des menaces (intérêt personnel, défense, familiarité, intimidation) **ne figurent pas** dans le code ni les normes français.' }] },
  iaasb: { layout: 'bureau', groupes: [{ n: 1, label: 'Rédacteur des ISA', role: 'pro', qui: 'Un rédacteur de l’IAASB', fait: '**ISA**, **ISRE 2400**, **ISAE 3000/3400**, **ISRS 4400/4410** : elles **inspirent** les NP et les NEP, sans s’appliquer directement.' }] },
  iaesb: { layout: 'bureau', groupes: [{ n: 1, label: 'Normes de formation', role: 'pro', qui: 'Un rédacteur de l’IAESB', fait: 'Normes **IES** de formation ; **IES 7** inspire la recommandation de **120 h sur 3 ans** de l’Ordre.' }] },
  aceu: { layout: 'bureau', groupes: [{ n: 1, label: 'Accountancy Europe', role: 'pro', qui: 'Un représentant d’Accountancy Europe', fait: 'Ex-**FEE** : fédération **européenne** de la profession, représentation sans pouvoir normatif en France.' }] },
  ue: { layout: 'table', groupes: [{ n: 3, label: 'CEAOB', role: 'fonctionnaire', qui: 'Un superviseur européen du CEAOB', fait: 'La **H2A** coopère ici avec ses homologues. Textes : **directive 2006/43/CE** modifiée par **2014/56/UE**, **règlement 537/2014** (EIP).' }] },
};

const SCALE = 0.3, GW = 660, GH = 960;
const wx = (b) => (b.x / 100 - .5) * GW * SCALE;
const wz = (b) => (b.y / 100 - .5) * GH * SCALE;
const doorSide = (b) => (b.y > 80 ? -1 : 1); // porte côté rue
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const cssVar = (name, fb) => { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; };

export const VILLE3D_CSS = `
.v3 { position: relative; height: min(70vh, 640px); min-height: 400px; border-radius: 14px; overflow: hidden; border: 1px solid var(--line); background: var(--card); touch-action: none; user-select: none; -webkit-user-select: none; }
.v3 canvas { display: block; width: 100%; height: 100%; }
.v3-top { position: absolute; left: 10px; right: 10px; top: 10px; display: flex; gap: 8px; align-items: flex-start; pointer-events: none; }
.v3-where { flex: 1; min-width: 0; background: color-mix(in srgb, var(--card) 88%, transparent); border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; font-size: 13px; line-height: 1.3; backdrop-filter: blur(6px); }
.v3-where strong { display: block; font-size: 15px; }
.v3-where .q { color: var(--primary); font-weight: 700; }
.v3-hud { position: absolute; right: 10px; top: 10px; display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
.v3 button, .v3 select { font: 600 13px/1 inherit; min-height: 36px; padding: 6px 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--card); color: var(--text); cursor: pointer; max-width: 46vw; }
.v3 button.primary { background: var(--primary); color: #fff; border-color: var(--primary); }
.v3 button.on { background: var(--warn, #b45309); color: #fff; border-color: transparent; }
.v3-panel { position: absolute; left: 10px; right: 10px; bottom: 10px; max-height: 42%; overflow: auto; background: color-mix(in srgb, var(--card) 92%, transparent); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; font-size: 14px; line-height: 1.4; backdrop-filter: blur(6px); }
.v3-panel strong.t { display: block; font-size: 15px; margin-bottom: 2px; }
.v3-panel .muted { color: var(--muted); font-size: 12.5px; }
.v3-stick { position: absolute; left: 14px; bottom: 14px; width: 110px; height: 110px; border-radius: 50%; border: 2px solid color-mix(in srgb, var(--text) 25%, transparent); background: color-mix(in srgb, var(--card) 40%, transparent); display: none; }
.v3-stick i { position: absolute; left: 50%; top: 50%; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%; background: var(--primary); opacity: .85; }
.v3-btns { position: absolute; right: 12px; bottom: 14px; display: none; flex-direction: column; gap: 8px; align-items: flex-end; }
.v3-btns button { min-height: 48px; min-width: 88px; border-radius: 24px; font-size: 14px; }
.v3.touch .v3-stick, .v3.touch .v3-btns { display: flex; }
.v3.touch .v3-panel { bottom: 134px; max-height: 34%; }
.v3-keys { position: absolute; left: 12px; bottom: 12px; font-size: 12px; color: var(--muted); background: color-mix(in srgb, var(--card) 80%, transparent); padding: 4px 8px; border-radius: 8px; }
.v3.touch .v3-keys { display: none; }
.v3-flash { position: absolute; left: 50%; top: 40%; transform: translate(-50%, -50%); padding: 12px 18px; border-radius: 14px; font-weight: 800; font-size: 22px; color: #fff; pointer-events: none; opacity: 0; transition: opacity .2s; }
.v3-flash.ok { background: var(--ok); opacity: 1; } .v3-flash.ko { background: var(--ko); opacity: 1; }
`;

export function startVille3D(root, THREE, opts = {}) {
  root.classList.add('v3');
  const touch = matchMedia('(pointer: coarse)').matches; if (touch) root.classList.add('touch');
  root.innerHTML = `<canvas></canvas>
    <div class="v3-top"><div class="v3-where" id="v3-where"></div></div>
    <div class="v3-hud"><select id="v3-goto" aria-label="Aller à"><option value="">Aller à…</option>${VILLE.batiments.map((b) => `<option value="${b.id}">${esc(b.court)}</option>`).join('')}</select><button type="button" id="v3-quiz">Qui fait quoi ?</button></div>
    <div class="v3-panel" id="v3-panel"></div>
    <div class="v3-stick" id="v3-stick"><i></i></div>
    <div class="v3-btns"><button type="button" id="v3-turbo">Turbo</button><button type="button" id="v3-act" class="primary">Entrer</button></div>
    <div class="v3-keys">Flèches ou ZQSD · Maj : turbo · Entrée : entrer / sortir</div>
    <div class="v3-flash" id="v3-flash"></div>`;
  const $ = (s) => root.querySelector(s);
  const canvas = $('canvas'), where = $('#v3-where'), panel = $('#v3-panel'), flash = $('#v3-flash'), actBtn = $('#v3-act'), turboBtn = $('#v3-turbo');

  const col = { bg: cssVar('--bg', '#f6f7fb'), ec: cssVar('--ec', '#0e7490'), cac: cssVar('--cac', '#7c3aed'), commun: cssVar('--muted', '#64748b'), line: cssVar('--line', '#e2e8f0'), card: cssVar('--card', '#fff'), text: cssVar('--text', '#0f172a'), primary: cssVar('--primary', '#1e40af') };
  const dark = matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.dataset.theme !== 'light' || document.documentElement.dataset.theme === 'dark';

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const camera = new THREE.PerspectiveCamera(60, 1, 0.5, 900);
  const resize = () => { const w = root.clientWidth, h = root.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  resize(); const ro = new ResizeObserver(resize); ro.observe(root);

  // ----- Textures et étiquettes
  const label = (text, { bg = col.card, fg = col.text, border = col.line, size = 44, k = 0.013 } = {}) => {
    const c = document.createElement('canvas'); const ctx = c.getContext('2d');
    ctx.font = `700 ${size}px -apple-system, Segoe UI, Roboto, sans-serif`;
    const w = Math.ceil(ctx.measureText(text).width) + 40; c.width = w; c.height = size + 36;
    ctx.font = `700 ${size}px -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.fillStyle = bg; ctx.strokeStyle = border; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.roundRect(3, 3, w - 6, c.height - 6, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(text, w / 2, c.height / 2 + 2);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sp.scale.set(w * k, c.height * k, 1); sp.renderOrder = 10; return sp;
  };
  const windowsTex = (hex) => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const ctx = c.getContext('2d');
    ctx.fillStyle = hex; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let y = 8; y < 64; y += 16) for (let x = 8; x < 64; x += 16) ctx.fillRect(x, y, 7, 9);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  };

  // ----- La ville
  const city = new THREE.Scene(); city.background = new THREE.Color(dark ? '#0b1220' : '#dbe7f6'); city.fog = new THREE.Fog(city.background, 120, 420);
  city.add(new THREE.HemisphereLight(0xffffff, 0x667788, dark ? .9 : 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, dark ? .6 : 1); sun.position.set(60, 120, 40); city.add(sun);
  const groundW = GW * SCALE, groundH = GH * SCALE;
  const plane = (w, h, color, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ color })); m.rotation.x = -Math.PI / 2; m.position.y = y; return m; };
  const ground = plane(groundW + 40, groundH + 40, dark ? '#1b2436' : '#cfd8e3'); city.add(ground);
  const zoneY = (p) => (p - .5) * groundH;
  const zone = (x0, x1, z0, z1, color, y) => { const m = plane(x1 - x0, z1 - z0, color, y); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); city.add(m); };
  zone(-groundW / 2, groundW / 2, zoneY(0), zoneY(.11), dark ? '#2a3448' : '#bfc9d6', .02);
  zone(-groundW / 2, -groundW * .06, zoneY(.11), zoneY(.78), dark ? '#0f3a44' : '#bfe3ea', .02);
  zone(groundW * .06, groundW / 2, zoneY(.11), zoneY(.78), dark ? '#2a1d4d' : '#dfd3f7', .02);
  zone(-groundW * .06, groundW * .06, zoneY(.11), zoneY(.78), dark ? '#1f3a73' : '#8fb4e8', .03);
  zone(-groundW / 2, groundW / 2, zoneY(.78), zoneY(1), dark ? '#2a3448' : '#c4ccd8', .02);
  for (const p of [.11, .28, .5, .78]) zone(-groundW / 2, groundW / 2, zoneY(p) - 2.2, zoneY(p) + 2.2, dark ? '#3b4457' : '#8e98a8', .05);
  const bmesh = [], boxes = [];
  for (const b of VILLE.batiments) {
    const w = b.w * SCALE, d = b.d * SCALE, h = Math.max(1.2, b.h * SCALE), x = wx(b), z = wz(b);
    const hex = col[b.rive];
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), b.style === 'vide' ? new THREE.MeshLambertMaterial({ color: hex, transparent: true, opacity: .25 }) : new THREE.MeshLambertMaterial({ map: windowsTex(hex) }));
    if (b.style !== 'vide') { m.material.map.repeat.set(Math.max(1, w / 6), Math.max(1, h / 6)); }
    m.position.set(x, h / 2, z); m.userData.id = b.id; city.add(m); bmesh.push(m);
    const door = new THREE.Mesh(new THREE.BoxGeometry(4, 5, .4), new THREE.MeshLambertMaterial({ color: dark ? '#f8fafc' : '#0f172a' }));
    door.position.set(x, 2.5, z + doorSide(b) * (d / 2 + .1)); door.userData.id = b.id; city.add(door); bmesh.push(door);
    const sp = label(b.court, { border: hex }); sp.position.set(x, h + 4, z); city.add(sp);
    boxes.push({ b, min: [x - w / 2 - 1.4, z - d / 2 - 1.4], max: [x + w / 2 + 1.4, z + d / 2 + 1.4], door: [x, z + doorSide(b) * (d / 2 + 5)], out: doorSide(b) });
  }

  // Véhicule
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: col.primary });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, .9, 4.2), bodyMat); body.position.y = .9; car.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.9, .8, 2), new THREE.MeshLambertMaterial({ color: dark ? '#cbd5e1' : '#1e293b' })); cab.position.set(0, 1.7, -.3); car.add(cab);
  const wheelG = new THREE.CylinderGeometry(.45, .45, .4, 14), wheelM = new THREE.MeshLambertMaterial({ color: '#111827' });
  for (const [sx, sz] of [[-1.1, 1.3], [1.1, 1.3], [-1.1, -1.3], [1.1, -1.3]]) { const wm = new THREE.Mesh(wheelG, wheelM); wm.rotation.z = Math.PI / 2; wm.position.set(sx, .45, sz); car.add(wm); }
  const lamp = new THREE.PointLight(0xfff2cc, 0, 30); lamp.position.set(0, 1.5, 2.5); car.add(lamp);
  city.add(car);

  // Marcheur (intérieur)
  const figure = (hex, { hat = false } = {}) => {
    const g = new THREE.Group();
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(.42, .55, 1.5, 12), new THREE.MeshLambertMaterial({ color: hex })); robe.position.y = .75; g.add(robe);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.32, 14, 12), new THREE.MeshLambertMaterial({ color: '#f1c7a3' })); head.position.y = 1.85; g.add(head);
    if (hat) { const hm = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .25, 12), new THREE.MeshLambertMaterial({ color: '#1f2937' })); hm.position.y = 2.2; g.add(hm); }
    return g;
  };
  const walker = figure(col.primary, { hat: true });

  // ----- État
  const S = { mode: 'city', pos: new THREE.Vector3(0, 0, zoneY(.62)), heading: Math.PI, v: 0, input: { fwd: 0, turn: 0, turbo: false }, near: null, inside: null, people: [], focus: null, quiz: null, tourIdx: null };
  const room = { scene: null, bounds: null, door: null };

  // ----- Intérieur d'un bâtiment
  function buildRoom(b) {
    const sc = new THREE.Scene(); const hex = col[b.rive];
    sc.background = new THREE.Color(dark ? '#111827' : '#f1f5f9');
    sc.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.2)); const l = new THREE.DirectionalLight(0xffffff, .5); l.position.set(10, 30, 10); sc.add(l);
    const W = 60, D = 44;
    const floor = plane(W, D, dark ? '#1f2937' : '#e2e8f0'); sc.add(floor);
    const wallM = new THREE.MeshLambertMaterial({ color: hex, transparent: true, opacity: .35 });
    for (const [x, z, w, d] of [[0, -D / 2, W, .5], [-W / 2, 0, .5, D], [W / 2, 0, .5, D], [0, D / 2, W, .5]]) { const wm = new THREE.Mesh(new THREE.BoxGeometry(w, 9, d), wallM); wm.position.set(x, 4.5, z); sc.add(wm); }
    const title = label(b.nom, { border: hex, size: 54, k: .012 }); title.position.set(0, 9.5, -D / 2 + 2); sc.add(title);
    const people = [];
    const put = (g, x, z, face = [0, 0]) => {
      const f = figure(ROLE[g.role] || col.commun, { hat: g.role === 'magistrat' }); f.position.set(x, 0, z); f.lookAt(face[0], 0, face[1]); sc.add(f);
      const lb = label(g.label, { border: ROLE[g.role] || col.commun, size: 36, k: .0075 }); lb.position.set(x, 2.8, z); sc.add(lb);
      people.push({ mesh: f, x, z, qui: g.qui, fait: g.fait, label: g.label });
    };
    const salle = SALLES[b.id] || { layout: 'bureau', groupes: [] };
    const seated = salle.groupes.filter((g) => !g.debout), standing = salle.groupes.filter((g) => g.debout);
    const seats = seated.flatMap((g) => Array.from({ length: g.n }, () => g));
    if (salle.layout === 'rangs') {
      const dais = new THREE.Mesh(new THREE.BoxGeometry(14, .6, 3), new THREE.MeshLambertMaterial({ color: '#8b5e3c' })); dais.position.set(0, .3, -D / 2 + 6); sc.add(dais);
      let i = 0;
      for (const g of seats) {
        if (i === 0) { put(g, 0, -D / 2 + 6, [0, 0]); i++; continue; }
        const k = i - 1, cols = 12, r = Math.floor(k / cols), c = k % cols;
        put(g, (c - (cols - 1) / 2) * 3.4, -D / 2 + 12 + r * 3.2, [0, -D / 2]); i++;
      }
    } else if (salle.layout === 'tribunal') {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(Math.max(10, seats.length * 3.2), 1.2, 2.2), new THREE.MeshLambertMaterial({ color: '#8b5e3c' })); bench.position.set(0, .6, -D / 2 + 8); sc.add(bench);
      seats.forEach((g, i) => put(g, (i - (seats.length - 1) / 2) * 3.2, -D / 2 + 6.2, [0, 0]));
    } else if (salle.layout === 'table') {
      const n = seats.length, rx = Math.max(6, n * .9), rz = Math.max(4, n * .55);
      const table = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .3, 36), new THREE.MeshLambertMaterial({ color: '#8b5e3c' })); table.scale.set(rx - 2, 1, rz - 2); table.position.y = 1.1; sc.add(table);
      seats.forEach((g, i) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; put(g, Math.cos(a) * rx, Math.sin(a) * rz - 2, [0, -2]); });
    } else {
      const desk = new THREE.Mesh(new THREE.BoxGeometry(Math.max(6, seats.length * 4), 1.1, 2.4), new THREE.MeshLambertMaterial({ color: '#8b5e3c' })); desk.position.set(0, .55, -D / 2 + 9); sc.add(desk);
      seats.forEach((g, i) => put(g, (i - (seats.length - 1) / 2) * 4, -D / 2 + 7, [0, 0]));
    }
    standing.forEach((g, i) => Array.from({ length: g.n }, (_, k) => put(g, W / 2 - 5 - k * 3, -8 + i * 7, [0, 0])));
    // Guichets des pancartes le long du mur gauche
    b.pancartes.forEach((p, i) => {
      const x = -W / 2 + 4, z = -D / 2 + 8 + i * 5;
      const desk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 3.4), new THREE.MeshLambertMaterial({ color: '#a16207' })); desk.position.set(x + 2.2, .5, z); sc.add(desk);
      const f = figure(col.commun); f.position.set(x, 0, z); f.lookAt(W, 0, z); sc.add(f);
      const lb = label(p.qui.length > 34 ? `${p.qui.slice(0, 32)}…` : p.qui, { size: 32, k: .0075 }); lb.position.set(x + 2, 2.8, z); sc.add(lb);
      people.push({ mesh: f, x, z, qui: p.qui, fait: p.fait, label: p.qui });
    });
    sc.add(walker);
    return { scene: sc, people, bounds: [W / 2 - 2, D / 2 - 2], W, D };
  }

  // ----- HUD
  const info = (html) => { panel.innerHTML = html; };
  const setWhere = () => {
    const b = S.inside;
    const q = S.quiz && S.quiz.i < S.quiz.order.length ? `<div class="q">Q${S.quiz.i + 1}/${S.quiz.order.length} · ${md(S.quiz.order[S.quiz.i].q)}</div><div class="muted">Entrez dans le bon bâtiment.</div>` : '';
    if (b) where.innerHTML = `${q}<strong>${esc(b.nom)}</strong><span class="muted">${VILLE.rives[b.rive]} · ${esc(b.type)} · approchez-vous des personnes</span>`;
    else where.innerHTML = `${q}<strong>${S.near ? `Devant : ${esc(S.near.b.nom)}` : 'La ville des institutions'}</strong><span class="muted">${S.near ? 'Entrée → ' + esc(S.near.b.role) : 'Rive gauche EC, rive droite CAC, en haut l’international, en bas la justice'}</span>`;
    actBtn.textContent = b ? 'Sortir' : S.near ? 'Entrer' : 'Entrer'; actBtn.disabled = !b && !S.near;
  };
  const showBuilding = (b) => info(`<strong class="t">${esc(b.nom)}</strong><div>${md(b.role)}</div>${b.chiffres?.length ? `<div class="muted">${b.chiffres.map(esc).join(' · ')}</div>` : ''}${b.jumeau ? `<div class="muted">Jumeau de l’autre rive : ${esc(batiment(b.jumeau).court)}</div>` : ''}`);
  const showPerson = (p) => info(`<strong class="t">${esc(p.qui)}</strong><div>${md(p.fait)}</div>`);
  const flashMsg = (txt, ok) => { flash.textContent = txt; flash.className = `v3-flash ${ok ? 'ok' : 'ko'}`; setTimeout(() => { flash.className = 'v3-flash'; }, 1600); };

  // ----- Déplacements
  function teleport(b) {
    const bx = boxes.find((x) => x.b.id === b.id);
    S.pos.set(bx.door[0], 0, bx.door[1] + bx.out * 9); S.heading = bx.out > 0 ? Math.PI : 0; S.v = 0;
    camera.position.set(S.pos.x, 10, S.pos.z + bx.out * 18);
    showBuilding(b);
  }
  function enter(b) {
    if (S.quiz && S.quiz.i < S.quiz.order.length) {
      const item = S.quiz.order[S.quiz.i], ok = b.id === item.r; if (ok) S.quiz.score++;
      flashMsg(ok ? 'Oui !' : `Non : ${batiment(item.r).court}`, ok); S.quiz.i++;
      if (S.quiz.i >= S.quiz.order.length) { const { score, order } = S.quiz; S.quiz = null; info(`<strong class="t">${score} / ${order.length}</strong><div>${score === order.length ? 'Tout est à sa place.' : 'Relisez les bâtiments manqués : entrez-y, écoutez les gens.'}</div>`); opts.onQuizEnd?.(score, order.length); setWhere(); if (!ok) return; }
      else if (!ok) { setWhere(); return; }
    }
    S.inside = b; const r = buildRoom(b); room.scene = r.scene; room.bounds = r.bounds; S.people = r.people; S.focus = null;
    S.pos.set(0, 0, r.D / 2 - 5); S.heading = Math.PI; S.v = 0; walker.position.copy(S.pos);
    camera.position.set(0, 6, r.D / 2 + 6);
    showBuilding(b); setWhere();
  }
  function exit() {
    const b = S.inside; if (!b) return; S.inside = null; S.people = []; S.focus = null; room.scene = null;
    const bx = boxes.find((x) => x.b.id === b.id); S.pos.set(bx.door[0], 0, bx.door[1] + bx.out * 4); S.heading = bx.out > 0 ? 0 : Math.PI; S.v = 0;
    setWhere();
  }
  function action() { if (S.inside) exit(); else if (S.near) enter(S.near.b); }

  // Clavier
  const keys = {};
  const onKey = (e, down) => {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase(); keys[k] = down;
    if (down && (k === 'enter' || k === 'e')) { action(); e.preventDefault(); }
    if (down && k === 'escape' && S.inside) exit();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  };
  window.addEventListener('keydown', (e) => onKey(e, true)); window.addEventListener('keyup', (e) => onKey(e, false));
  const readKeys = () => {
    S.input.fwd = (keys.arrowup || keys.z || keys.w ? 1 : 0) - (keys.arrowdown || keys.s ? 1 : 0);
    S.input.turn = (keys.arrowleft || keys.q || keys.a ? 1 : 0) - (keys.arrowright || keys.d ? 1 : 0);
    S.input.turbo = !!keys.shift || turboOn;
  };
  // Joystick tactile
  const stick = $('#v3-stick'), knob = stick.querySelector('i'); let stickId = null, stickOrigin = null;
  stick.addEventListener('pointerdown', (e) => { stickId = e.pointerId; stickOrigin = [e.clientX, e.clientY]; stick.setPointerCapture(e.pointerId); });
  stick.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stickId) return;
    const dx = Math.max(-40, Math.min(40, e.clientX - stickOrigin[0])), dy = Math.max(-40, Math.min(40, e.clientY - stickOrigin[1]));
    knob.style.transform = `translate(${dx}px,${dy}px)`; S.touchInput = { fwd: -dy / 40, turn: -dx / 40 };
  });
  const stickEnd = (e) => { if (e.pointerId !== stickId) return; stickId = null; knob.style.transform = ''; S.touchInput = null; };
  stick.addEventListener('pointerup', stickEnd); stick.addEventListener('pointercancel', stickEnd);
  let turboOn = false; turboBtn.onclick = () => { turboOn = !turboOn; turboBtn.classList.toggle('on', turboOn); };
  actBtn.onclick = action;
  $('#v3-goto').onchange = (e) => { const b = batiment(e.target.value); e.target.value = ''; if (!b) return; if (S.inside) exit(); teleport(b); };
  $('#v3-quiz').onclick = () => {
    if (S.inside) exit();
    const order = VILLE.quiz.map((q, i) => ({ q, k: Math.random() + i / 1e6 })).sort((a, b) => a.k - b.k).map((x) => x.q).slice(0, 12);
    S.quiz = { order, i: 0, score: 0 }; setWhere(); info('<strong class="t">Qui fait quoi ?</strong><div>Lisez l’affirmation en haut, conduisez jusqu’au bâtiment qui correspond et entrez-y (Entrée ou bouton). 12 questions.</div>');
  };
  // Clic ou toucher sur un bâtiment / une personne
  const ray = new THREE.Raycaster(); let downAt = null;
  canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return; downAt = null;
    const r = canvas.getBoundingClientRect(); const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(p, camera);
    if (S.inside) { const hits = ray.intersectObjects(S.people.map((x) => x.mesh), true); if (hits.length) { const g = hits[0].object.parent; const per = S.people.find((x) => x.mesh === g); if (per) { S.focus = per; showPerson(per); } } return; }
    const hits = ray.intersectObjects(bmesh); if (hits.length) { const b = batiment(hits[0].object.userData.id); const d = Math.hypot(S.pos.x - wx(b), S.pos.z - wz(b)); if (d > 40) teleport(b); else showBuilding(b); }
  });

  // ----- Boucle
  const clock = new THREE.Clock(); const dir = new THREE.Vector3(); const camTarget = new THREE.Vector3(); let alive = true;
  function step(dt) {
    readKeys(); if (S.touchInput) { S.input.fwd = S.touchInput.fwd; S.input.turn = S.touchInput.turn; }
    const inside = !!S.inside;
    const maxV = inside ? (S.input.turbo ? 12 : 7) : (S.input.turbo ? 75 : 32), acc = inside ? 30 : (S.input.turbo ? 60 : 28);
    S.v += S.input.fwd * acc * dt; S.v *= Math.pow(inside ? .02 : .25, dt);
    S.v = Math.max(-maxV * .5, Math.min(maxV, S.v));
    if (Math.abs(S.v) < .05 && !S.input.fwd) S.v = 0;
    const steer = inside ? 2.6 : 1.9 * Math.min(1, Math.abs(S.v) / 8);
    S.heading += S.input.turn * steer * dt * (S.v < 0 ? -1 : 1);
    dir.set(Math.sin(S.heading), 0, Math.cos(S.heading));
    S.pos.addScaledVector(dir, S.v * dt);
    if (inside) {
      const [bx, bz] = room.bounds; S.pos.x = Math.max(-bx, Math.min(bx, S.pos.x)); S.pos.z = Math.max(-bz, Math.min(bz, S.pos.z));
      walker.position.copy(S.pos); walker.rotation.y = S.heading;
      if (S.pos.z >= bz - .2 && Math.abs(S.pos.x) < 4 && S.v > 0) { exit(); return; }
      let best = null, bd = 4.2;
      for (const p of S.people) { const d = Math.hypot(p.x - S.pos.x, p.z - S.pos.z); if (d < bd) { bd = d; best = p; } }
      if (best !== S.focus) { S.focus = best; if (best) showPerson(best); else showBuilding(S.inside); }
      camTarget.set(S.pos.x - dir.x * 7, 4.5, S.pos.z - dir.z * 7);
    } else {
      S.pos.x = Math.max(-groundW / 2 - 15, Math.min(groundW / 2 + 15, S.pos.x)); S.pos.z = Math.max(-groundH / 2 - 15, Math.min(groundH / 2 + 15, S.pos.z));
      for (const bx of boxes) {
        if (bx.b.style === 'vide') continue;
        if (S.pos.x > bx.min[0] && S.pos.x < bx.max[0] && S.pos.z > bx.min[1] && S.pos.z < bx.max[1]) {
          const px = Math.min(S.pos.x - bx.min[0], bx.max[0] - S.pos.x), pz = Math.min(S.pos.z - bx.min[1], bx.max[1] - S.pos.z);
          if (px < pz) S.pos.x = S.pos.x - bx.min[0] < bx.max[0] - S.pos.x ? bx.min[0] : bx.max[0]; else S.pos.z = S.pos.z - bx.min[1] < bx.max[1] - S.pos.z ? bx.min[1] : bx.max[1];
          S.v *= -.3;
        }
      }
      car.position.copy(S.pos); car.rotation.y = S.heading; lamp.intensity = S.input.turbo ? 2 : 0;
      let best = null, bd = 11;
      for (const bx of boxes) { const d = Math.hypot(bx.door[0] - S.pos.x, bx.door[1] - S.pos.z); if (d < bd) { bd = d; best = bx; } }
      if (best !== S.near) { S.near = best; setWhere(); if (best) showBuilding(best.b); }
      const dist = S.input.turbo ? 24 : 18, hgt = S.input.turbo ? 11 : 9;
      camTarget.set(S.pos.x - dir.x * dist, hgt, S.pos.z - dir.z * dist);
      const fov = S.input.turbo && Math.abs(S.v) > 30 ? 72 : 60; if (Math.abs(camera.fov - fov) > .5) { camera.fov += (fov - camera.fov) * .1; camera.updateProjectionMatrix(); }
    }
    camera.position.lerp(camTarget, 1 - Math.pow(.001, dt));
    camera.lookAt(S.pos.x + dir.x * 5, inside ? 1.6 : 2, S.pos.z + dir.z * 5);
  }
  function loop() {
    if (!alive) return; requestAnimationFrame(loop);
    const dt = Math.min(.05, clock.getDelta()); step(dt);
    renderer.render(S.inside ? room.scene : city, camera);
  }
  camera.position.set(S.pos.x, 14, S.pos.z + 26);
  setWhere(); info('<strong class="t">Bienvenue dans la ville</strong><div>Conduisez jusqu’à un bâtiment (la pancarte vous guide), entrez par la porte sombre, puis marchez vers les gens : chacun dit qui il est et ce qu’il fait. « Aller à » vous téléporte ; « Qui fait quoi ? » vous met au défi.</div>');
  loop();

  return { stop() { alive = false; ro.disconnect(); renderer.dispose(); }, goto(id) { const b = batiment(id); if (b) teleport(b); }, enter(id) { const b = batiment(id); if (b) { teleport(b); enter(b); } }, state: S };
}
