// Mise en scène des shorts : personnages et objets dessinés en SVG plat. Fonctions pures (chaînes SVG).
// Distribution fixe : l'expert-comptable (vert), le commissaire aux comptes (terracotta), le dirigeant client (bleu).

const INK = '#1c1b1a';
export const CAST = {
  ec: { name: 'Expert-comptable', color: '#1e7a5f', soft: '#cfe6dc', jacket: '#1e7a5f', shirt: '#f3eee6', skin: '#f0c4a1', hair: '#2a2420', hairStyle: 'short' },
  cac: { name: 'Commissaire aux comptes', color: '#d4532b', soft: '#f5d3c6', jacket: '#d4532b', shirt: '#fff6ee', skin: '#8d5a3b', hair: '#1c1b1a', hairStyle: 'bun', glasses: true },
  boss: { name: 'Le client', color: '#2b3a67', soft: '#dfe5f3', jacket: '#2b3a67', shirt: '#ffffff', skin: '#e3b08c', hair: '#6b4a32', hairStyle: 'side', tie: '#ffc93c' },
};

// Buste de face, 164 × 240.
export function person(k) {
  const p = CAST[k];
  const hair = {
    short: `<path d="M48 58c0-26 18-40 34-40s34 14 34 38c-8-10-22-14-34-14s-26 6-34 16z" fill="${p.hair}"/>`,
    bun: `<circle cx="82" cy="18" r="13" fill="${p.hair}"/><path d="M48 62c0-28 16-40 34-40s34 12 34 40c-6-14-20-20-34-20s-28 6-34 20z" fill="${p.hair}"/>`,
    side: `<path d="M48 60c-2-26 16-40 36-40 18 0 32 12 32 32-14-2-30-8-40-18-6 10-16 20-28 26z" fill="${p.hair}"/>`,
  }[p.hairStyle];
  const glasses = p.glasses ? `<g fill="none" stroke="${INK}" stroke-width="3"><circle cx="70" cy="66" r="10"/><circle cx="96" cy="66" r="10"/><line x1="80" y1="66" x2="86" y2="66"/></g>` : '';
  const tie = p.tie ? `<path d="M82 128l-7 8 7 36 7-36z" fill="${p.tie}"/>` : '';
  return `<svg class="pers" viewBox="0 0 164 240" aria-hidden="true">
    <path d="M24 240c0-62 22-110 58-110s58 48 58 110z" fill="${p.jacket}"/>
    <path d="M66 130l16 22 16-22z" fill="${p.shirt}"/>${tie}
    <rect x="72" y="96" width="20" height="30" rx="8" fill="${p.skin}"/>
    <ellipse cx="82" cy="66" rx="34" ry="38" fill="${p.skin}"/>${hair}
    <ellipse cx="70" cy="68" rx="3.6" ry="4.6" fill="${INK}"/><ellipse cx="96" cy="68" rx="3.6" ry="4.6" fill="${INK}"/>${glasses}
    <path d="M74 86q8 7 16 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <rect x="12" y="134" width="26" height="74" rx="13" fill="${p.jacket}"/><circle cx="25" cy="210" r="11" fill="${p.skin}"/>
    <rect x="126" y="134" width="26" height="74" rx="13" fill="${p.jacket}"/><circle cx="139" cy="210" r="11" fill="${p.skin}"/>
  </svg>`;
}

// Objets, 64 × 64, trait encre et aplats.
const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const ICONS = {
  coins: `<ellipse cx="26" cy="46" rx="18" ry="7" fill="#ffc93c" ${S}/><path d="M8 38v8M44 38v8" ${S}/><ellipse cx="26" cy="38" rx="18" ry="7" fill="#ffc93c" ${S}/><ellipse cx="40" cy="24" rx="18" ry="7" fill="#ffd866" ${S}/><path d="M22 24v8M58 24v8" ${S}/><path d="M22 32c4 4 32 4 36 0" fill="none" ${S}/>`,
  envelope: `<rect x="6" y="14" width="52" height="38" rx="5" fill="#fff" ${S}/><path d="M8 17l24 19 24-19" fill="none" ${S}/><circle cx="48" cy="44" r="7" fill="#d4532b" ${S}/>`,
  padlock: `<path d="M20 28v-8a12 12 0 0 1 24 0v8" fill="none" ${S}/><rect x="12" y="28" width="40" height="30" rx="6" fill="#ffc93c" ${S}/><circle cx="32" cy="41" r="4" fill="${INK}"/><path d="M32 44v6" ${S}/>`,
  alert: `<path d="M18 22c-8 6-12 16-12 22 0 10 10 14 26 14s26-4 26-14c0-6-4-16-12-22z" fill="#cfe6dc" ${S}/><path d="M22 22l-4-12h28l-4 12z" fill="#cfe6dc" ${S}/><text x="32" y="50" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="20" fill="${INK}">€</text><circle cx="52" cy="14" r="10" fill="#d4532b" ${S}/><path d="M52 9v6" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="52" cy="19" r="1.6" fill="#fff"/>`,
  gavel: `<rect x="10" y="50" width="34" height="8" rx="3" fill="#8d5a3b" ${S}/><g transform="rotate(-35 34 26)"><rect x="18" y="14" width="32" height="16" rx="4" fill="#8d5a3b" ${S}/><rect x="31" y="30" width="6" height="28" rx="3" fill="#c98a5a" ${S}/></g>`,
  scales: `<path d="M32 10v44M18 58h28M12 20h40" ${S}/><path d="M12 20l-8 18h16zM52 20l-8 18h16z" fill="#ffc93c" ${S}/><circle cx="32" cy="10" r="4" fill="${INK}"/>`,
  magnifier: `<circle cx="26" cy="26" r="17" fill="#dfe5f3" ${S}/><path d="M38 38l18 18" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M18 22a9 9 0 0 1 9-7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  calendar: `<rect x="6" y="12" width="52" height="46" rx="6" fill="#fff" ${S}/><path d="M6 18a6 6 0 0 1 6-6h40a6 6 0 0 1 6 6v8H6z" fill="#d4532b" ${S}/><path d="M18 6v10M46 6v10" ${S}/><path d="M16 38h8M28 38h8M40 38h8M16 48h8M28 48h8" ${S}/>`,
  chain: `<rect x="4" y="22" width="32" height="18" rx="9" fill="none" stroke="${INK}" stroke-width="6"/><rect x="28" y="24" width="32" height="18" rx="9" fill="none" stroke="#d4532b" stroke-width="6"/>`,
  building: `<path d="M6 22L32 8l26 14z" fill="#dfe5f3" ${S}/><path d="M8 56h48M10 50h44" ${S}/><path d="M14 26v22M26 26v22M38 26v22M50 26v22" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`,
  book: `<path d="M8 12c8-4 16-4 24 2v42c-8-6-16-6-24-2z" fill="#fff" ${S}/><path d="M56 12c-8-4-16-4-24 2v42c8-6 16-6 24-2z" fill="#cfe6dc" ${S}/><path d="M14 24h12M14 32h12M38 24h12M38 32h12" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
  megaphone: `<path d="M10 26h10l26-14v40L20 38H10z" fill="#ffc93c" ${S}/><path d="M16 38l4 16h8l-3-16" fill="#fff" ${S}/><path d="M52 24c4 4 4 12 0 16" fill="none" ${S}/>`,
  pie: `<circle cx="32" cy="32" r="24" fill="#dfe5f3" ${S}/><path d="M32 32V8a24 24 0 0 1 20.8 36z" fill="#1e7a5f" ${S}/>`,
  cap: `<path d="M4 26L32 14l28 12-28 12z" fill="${INK}" ${S}/><path d="M16 32v12c8 6 24 6 32 0V32" fill="#2b3a67" ${S}/><path d="M56 28v14" ${S}/><circle cx="56" cy="44" r="3" fill="#ffc93c" ${S}/>`,
  bulb: `<path d="M32 6a18 18 0 0 0-10 33v7h20v-7A18 18 0 0 0 32 6z" fill="#ffc93c" ${S}/><path d="M24 52h16M26 58h12" ${S}/><path d="M28 30l4 6 4-6" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
  folder: `<path d="M4 16a4 4 0 0 1 4-4h16l6 6h26a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="#f4c25a" ${S}/>`,
};
export const icon = (name) => `<svg class="ico" viewBox="0 0 64 64" aria-hidden="true">${ICONS[name] || ICONS.folder}</svg>`;

// Objet d'un short, d'après son premier sous-thème reconnu.
const BY_TAG = [
  [['honoraires', 'honoraires_bareme'], 'coins'],
  [['lettre_mission', 'lettre_mission_nep210', 'confraternite_reprise_dossier', 'delegation_signature'], 'envelope'],
  [['secret_professionnel'], 'padlock'],
  [['lcb_ft', 'revelation_procureur'], 'alert'],
  [['discipline_sanctions', 'delit_entrave', 'responsabilite_penale'], 'gavel'],
  [['responsabilite_civile'], 'scales'],
  [['controle_qualite', 'controle_activite'], 'magnifier'],
  [['mandat_duree_cessation', 'nomination_seuils', 'demission_revocation', 'alpe_petites_entreprises', 'co_commissariat'], 'calendar'],
  [['independance_situations_risque', 'incompatibilites_liens', 'incompatibilites_activites', 'non_immixtion', 'services_interdits_eip', 'reseau', 'eip'], 'chain'],
  [['h2a_supervision', 'ordre_organisation', 'cncc_crcc_organisation', 'inscription_liste', 'inscription_tableau'], 'building'],
  [['referentiel_normatif', 'missions_assurance', 'nep', 'code_deontologie_structure', 'missions_legales', 'loi_pacte', 'durabilite_csrd'], 'book'],
  [['publicite_demarchage'], 'megaphone'],
  [['societes_ec_capital', 'personnes_physiques', 'agp_associations'], 'pie'],
  [['formation'], 'cap'],
  [['devoir_conseil', 'prestations_declaration_activite'], 'bulb'],
];
export function propFor(tags = []) {
  for (const t of tags) for (const [list, name] of BY_TAG) if (list.includes(t)) return name;
  return 'folder';
}

// Distribution d'un short : qui est sur scène.
export function castFor(s) {
  if (s.type === 'duel') return ['ec', 'cac'];
  const lead = s.prof === 'EC+CAC' ? ['ec', 'cac'] : [s.prof === 'EC' ? 'ec' : 'cac'];
  return s.type === 'cas' && lead.length === 1 ? [...lead, 'boss'] : lead;
}
