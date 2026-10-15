// Comic-Avatare für die Anrufer (dicke schwarze Outlines wie im Spiel)
// cfg: { skin, hair, style: 'bun'|'afro'|'short'|'bald'|'long'|'curly', earrings, glasses, beard, lips }
export function avatarSVG(cfg, mood = 'neutral') {
  const o = 'stroke="#111" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"';
  const hair = cfg.hair || '#2b2b2b';
  let back = '', front = '';
  switch (cfg.style) {
    case 'bun':
      back = `<circle cx="100" cy="88" r="62" fill="${hair}" ${o}/>
        <circle cx="70" cy="40" r="24" fill="${hair}" ${o}/><circle cx="104" cy="30" r="26" fill="${hair}" ${o}/><circle cx="136" cy="44" r="22" fill="${hair}" ${o}/>`;
      front = `<path d="M70 52 q30 -22 64 -2" stroke="#d2452f" stroke-width="6" fill="none"/>
        <path d="M52 92 q8 -46 48 -48 q42 2 50 48 q-20 -24 -50 -26 q-30 2 -48 26z" fill="${hair}" ${o}/>`;
      break;
    case 'afro':
      back = `<circle cx="100" cy="82" r="76" fill="${hair}" ${o}/>`;
      front = `<path d="M50 96 q4 -50 50 -52 q46 2 50 52 q-16 -28 -50 -30 q-34 2 -50 30z" fill="${hair}" ${o}/>`;
      break;
    case 'long':
      back = `<path d="M38 170 q-8 -110 62 -122 q70 12 62 122z" fill="${hair}" ${o}/>`;
      front = `<path d="M48 100 q2 -54 52 -56 q50 2 52 56 q-26 -36 -52 -36 q-26 0 -52 36z" fill="${hair}" ${o}/>`;
      break;
    case 'curly':
      back = [[58, 70], [80, 46], [108, 40], [134, 54], [148, 80], [52, 98], [150, 104]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="20" fill="${hair}" ${o}/>`).join('');
      front = `<path d="M54 92 q6 -40 46 -42 q40 2 46 42 q-20 -18 -46 -20 q-26 2 -46 20z" fill="${hair}" stroke="none"/>`;
      break;
    case 'short':
      front = `<path d="M50 96 q-2 -58 50 -60 q54 2 50 60 q-6 -26 -22 -32 q-30 10 -62 4 q-12 10 -16 28z" fill="${hair}" ${o}/>`;
      break;
    case 'bald':
    default:
      front = `<path d="M54 92 q-6 -16 2 -20M146 92 q6 -16 -2 -20" stroke="${hair}" stroke-width="10" fill="none"/>`;
  }

  // Mimik
  const brows = {
    happy: ['M70 92 q12 -8 22 -2', 'M108 90 q10 -6 22 2'],
    neutral: ['M70 92 q12 -6 22 0', 'M108 92 q10 -6 22 0'],
    suspicious: ['M70 88 q12 2 22 6', 'M108 94 q10 -8 22 -6'],
    angry: ['M70 86 l22 10', 'M130 86 l-22 10'],
  }[mood] || [];
  const mouth = {
    happy: 'M76 140 q24 22 48 0',
    neutral: 'M76 142 q24 -2 48 0',
    suspicious: 'M80 144 q20 -8 42 -2',
    angry: 'M78 148 q22 -16 46 0',
  }[mood] || 'M76 142 q24 -2 48 0';
  const eyes = mood === 'happy'
    ? `<path d="M74 112 q8 -8 16 0M112 112 q8 -8 16 0" stroke="#111" stroke-width="5" fill="none"/>`
    : `<ellipse cx="82" cy="110" rx="5" ry="${mood === 'suspicious' ? 3 : 6}" fill="#111"/><ellipse cx="120" cy="110" rx="5" ry="${mood === 'suspicious' ? 3 : 6}" fill="#111"/>`;

  const ear = (x) => `<circle cx="${x}" cy="148" r="10" fill="none" stroke="#111" stroke-width="7"/><circle cx="${x}" cy="148" r="10" fill="none" stroke="#e8c21e" stroke-width="4"/>`;
  const glasses = cfg.glasses
    ? `<g fill="#ffffff55" stroke="#111" stroke-width="4"><circle cx="82" cy="110" r="15"/><circle cx="120" cy="110" r="15"/><path d="M97 110h8M67 108l-12 -4M135 108l12 -4" fill="none"/></g>` : '';
  const beard = cfg.beard
    ? `<path d="M56 120 q4 56 44 58 q40 -2 44 -58 q-6 30 -20 30 q-24 -12 -48 0 q-14 0 -20 -30z" fill="${cfg.beard}" ${o}/>` : '';
  const stache = cfg.mustache ? `<path d="M74 132 q26 -14 52 0 q-26 6 -52 0z" fill="${cfg.mustache}" ${o}/>` : '';
  const lips = cfg.lips ? `stroke="${cfg.lips}"` : 'stroke="#111"';

  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    ${back}
    <ellipse cx="100" cy="122" rx="50" ry="58" fill="${cfg.skin}" ${o}/>
    ${cfg.earrings ? ear(48) + ear(152) : ''}
    ${front}
    ${eyes}
    ${brows.map((d) => `<path d="${d}" stroke="#111" stroke-width="5" fill="none"/>`).join('')}
    ${glasses}
    ${beard}${stache}
    <path d="${mouth}" ${lips} stroke-width="6" fill="none" stroke-linecap="round"/>
  </svg>`;
}
