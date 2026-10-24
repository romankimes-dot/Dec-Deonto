// Palais de mémoire : le bureau de la Carrière sert de parcours. Chaque liste à connaître est déposée, dans l'ordre,
// sur les lieux du bureau (méthode des lieux). Contenu repris des fiches (source indiquée), sans ajout.
// `ordered` : l'ordre a un sens (gradation, procédure) ; sinon c'est l'ordre de la fiche, que le palais fige.

export const LOCI = [
  ['🚪', 'la porte'], ['🧥', 'le portemanteau'], ['🪴', 'la plante'], ['🪟', 'la fenêtre'],
  ['📚', 'l’étagère'], ['🖼', 'le cadre au mur'], ['🖥', 'l’écran'], ['💡', 'la lampe'],
  ['☎️', 'le téléphone'], ['🗂', 'le classeur'], ['☕', 'la machine à café'], ['🗑', 'la corbeille'],
];

export const LISTS = [
  { id: 'sanctions-ec', title: 'Sanctions disciplinaires de l’expert-comptable', prof: 'EC', ordered: true, hint: 'De la plus légère à la plus lourde.', source: '13-schema-discipline.md',
    items: ['Réprimande', 'Blâme avec inscription au dossier', 'Suspension à durée déterminée avec sursis', 'Suspension sans sursis', 'Radiation du tableau avec interdiction définitive d’exercer'] },
  { id: 'sanctions-cac', title: 'Sanctions de la H2A contre un commissaire aux comptes', prof: 'CAC', ordered: false, hint: 'Ordre de la fiche.', source: '13-schema-discipline.md',
    items: ['Avertissement', 'Blâme', 'Interdiction temporaire d’exercer (3 ans au plus)', 'Radiation', 'Retrait de l’honorariat', 'Interdiction temporaire de fonctions de direction', 'Sanction pécuniaire', 'Publication'] },
  { id: 'poursuite-ec', title: 'Le parcours d’une poursuite disciplinaire (EC)', prof: 'EC', ordered: true, hint: 'De la plainte à la cassation.', source: '13-schema-discipline.md',
    items: ['Plainte à la chambre régionale', 'Instruction par un rapporteur', 'Chambre régionale de discipline', 'Chambre nationale de discipline (appel)', 'Conseil d’État (cassation)'] },
  { id: 'poursuite-cac', title: 'Le parcours d’une poursuite contre un CAC', prof: 'CAC', ordered: true, hint: 'De la saisine au recours.', source: '13-schema-discipline.md',
    items: ['Saisine (procureur général, AMF, ACPR, H2A, CNCC, CRCC…)', 'Enquête du rapporteur général', 'Poursuite et griefs arrêtés par le collège', 'Jugement par la commission des sanctions', 'Recours devant le Conseil d’État'] },
  { id: 'demission', title: 'Motifs légitimes de démission du CAC', prof: 'CAC', ordered: false, hint: 'Quatre motifs.', source: '14-schema-mandat-cac.md',
    items: ['Cessation définitive d’activité', 'Motif personnel impérieux', 'Difficultés dans l’accomplissement de la mission', 'Indépendance compromise sans mesure de sauvegarde possible'] },
  { id: 'obstacles-demission', title: 'Le CAC ne démissionne pas pour se soustraire à…', prof: 'CAC', ordered: false, hint: 'Quatre obligations.', source: '14-schema-mandat-cac.md',
    items: ['La révélation', 'L’alerte', 'La déclaration de soupçon', 'L’émission du rapport'] },
  { id: 'derogation-bareme', title: 'Dérogation au barème d’heures : qui statue ?', prof: 'CAC', ordered: true, hint: 'Du premier niveau au dernier recours.', source: '18-schema-lettre-mission-honoraires.md',
    items: ['Président de la CRCC', 'Président de la CNCC', 'Bureau de la H2A', 'Tribunal administratif'] },
  { id: 'principes-cac', title: 'Principes fondamentaux de comportement du CAC (titre I)', prof: 'CAC', ordered: true, hint: 'Articles 3 à 9 du code de déontologie.', source: '06-cac-deontologie.md',
    items: ['Intégrité', 'Impartialité', 'Indépendance et prévention des conflits d’intérêts', 'Esprit critique', 'Compétence et diligence', 'Confraternité', 'Secret professionnel et discrétion'] },
  { id: 'devoir-conseil', title: 'Les étapes du devoir de conseil de l’EC', prof: 'EC', ordered: true, hint: 'Quatre étapes, de plus en plus fermes.', source: '01-ec-exercice.md',
    items: ['Informer', 'Mettre en garde', 'Exiger', 'Refuser (son concours, voire interrompre la mission)'] },
  { id: 'assurance', title: 'Missions sur comptes complets historiques, par niveau d’assurance', prof: 'EC', ordered: true, hint: 'De l’assurance la plus élevée à la plus faible.', source: '10-schema-cadre-normatif.md',
    items: ['Audit (normes ISA ; NP 2910 si petite entité)', 'Examen limité (NP 2400)', 'Présentation (NP 2300)'] },
  { id: 'cadre-missions', title: 'Le cadre de référence des missions de l’EC', prof: 'EC', ordered: false, hint: 'Trois natures de missions, plus les autres prestations.', source: '10-schema-cadre-normatif.md',
    items: ['Missions d’assurance sur des comptes complets historiques', 'Autres missions d’assurance', 'Missions sans assurance', 'Autres prestations'] },
  { id: 'npmq', title: 'Les éléments de la NPMQ', prof: 'EC', ordered: false, hint: 'Six éléments du système de maîtrise de la qualité.', source: '20-schema-controle-qualite.md',
    items: ['Responsabilités de la direction', 'Règles d’éthique et indépendance', 'Acceptation et maintien des clients et des missions', 'Ressources humaines', 'Réalisation des missions', 'Suivi du système'] },
  { id: 'responsabilites', title: 'Les quatre responsabilités du professionnel', prof: 'EC + CAC', ordered: false, hint: 'L’EC n’a pas la quatrième.', source: '21-schema-responsabilites.md',
    items: ['Civile', 'Pénale', 'Disciplinaire', 'Administrative (CAC seulement)'] },
  { id: 'seuils-cac', title: 'Seuils de nomination d’un CAC (société commerciale, 2 sur 3)', prof: 'CAC', ordered: false, hint: 'Trois critères.', source: '15-schema-chiffres-cles.md',
    items: ['5 M€ de total bilan', '10 M€ de CA HT', '50 salariés'] },
];

// Initiales de la liste : un appui de plus pour le rappel (« R-B-S-S-R »).
export const initials = (list) => list.items.map((x) => x.replace(/^[^A-Za-zÀ-ÿ0-9]+/, '').charAt(0).toUpperCase()).join('-');

// Leurres pour l'épreuve du palais : éléments d'autres listes de la même profession, absents de celle-ci.
export function decoys(list, n = 2, rnd = Math.random) {
  const pool = [...new Set(LISTS.filter((l) => l.id !== list.id && (l.prof === list.prof || list.prof === 'EC + CAC')).flatMap((l) => l.items))]
    .filter((x) => !list.items.includes(x));
  return pool.map((v) => ({ v, r: rnd() })).sort((a, b) => a.r - b.r).slice(0, n).map((x) => x.v);
}
