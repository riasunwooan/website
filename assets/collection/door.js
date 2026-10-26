// A carved double door under a pointed stone arch, drawn for the rooms. The leaves swing open on hover.
let n = 0;

export function door() {
  const k = 'd' + (++n);
  // Lozenge rows on each leaf
  const motifs = (x0) => {
    let s = '';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) {
      const cx = x0 + 15 + c * 30, cy = 112 + r * 23;
      s += '<path d="M' + cx + ' ' + (cy - 9) + ' Q' + (cx + 4) + ' ' + (cy - 3) + ' ' + (cx + 9) + ' ' + cy + ' Q' + (cx + 4) + ' ' + (cy + 3) + ' ' + cx + ' ' + (cy + 9) +
        ' Q' + (cx - 4) + ' ' + (cy + 3) + ' ' + (cx - 9) + ' ' + cy + ' Q' + (cx - 4) + ' ' + (cy - 3) + ' ' + cx + ' ' + (cy - 9) + 'Z" class="cx-door-motif"/>';
    }
    return s;
  };
  const arch = (x, top, sh) => 'M' + x + ' 262 V' + sh + ' Q' + x + ' ' + (top + 34) + ' 100 ' + top + ' Q' + (200 - x) + ' ' + (top + 34) + ' ' + (200 - x) + ' ' + sh + ' V262 Z';
  return '<svg class="cx-door" viewBox="0 0 200 264" aria-hidden="true" focusable="false">' +
    '<defs>' +
      '<linearGradient id="' + k + 's" x1="0" x2="1"><stop offset="0" stop-color="#b98d68"/><stop offset=".5" stop-color="#d6b08c"/><stop offset="1" stop-color="#b48763"/></linearGradient>' +
      '<linearGradient id="' + k + 'w" x1="0" x2="1"><stop offset="0" stop-color="#6e3f22"/><stop offset=".55" stop-color="#94603a"/><stop offset="1" stop-color="#7a4628"/></linearGradient>' +
      '<radialGradient id="' + k + 'g" cx=".5" cy=".7" r=".7"><stop offset="0" stop-color="#fbe7b8"/><stop offset=".55" stop-color="#d9a35c"/><stop offset="1" stop-color="#5a3518"/></radialGradient>' +
      '<clipPath id="' + k + 'c"><path d="' + arch(42, 46, 122) + '"/></clipPath>' +
    '</defs>' +
    // stone surround, carved band, inner reveal
    '<path d="' + arch(8, 4, 108) + '" fill="url(#' + k + 's)"/>' +
    '<path d="' + arch(20, 18, 114) + '" fill="none" stroke="#8a6448" stroke-width="5" stroke-dasharray="2 3" opacity=".75"/>' +
    '<path d="' + arch(30, 32, 118) + '" fill="#c39b78"/>' +
    '<path d="M8 108 H30 M170 108 H192 M8 160 H30 M170 160 H192 M8 212 H30 M170 212 H192" stroke="#9c7556" stroke-width=".8" opacity=".6"/>' +
    // light behind the doors
    '<path d="' + arch(42, 46, 122) + '" fill="url(#' + k + 'g)"/>' +
    '<g clip-path="url(#' + k + 'c)">' +
      '<g class="cx-door-leaf cx-door-l"><rect x="42" y="40" width="58" height="224" fill="url(#' + k + 'w)"/>' +
        '<rect x="47" y="226" width="48" height="28" fill="none" stroke="#c99a6c" stroke-width="1.2"/>' + motifs(42) +
        '<rect x="93" y="178" width="3" height="16" rx="1" fill="#e7dccb"/></g>' +
      '<g class="cx-door-leaf cx-door-r"><rect x="100" y="40" width="58" height="224" fill="url(#' + k + 'w)"/>' +
        '<rect x="105" y="226" width="48" height="28" fill="none" stroke="#c99a6c" stroke-width="1.2"/>' + motifs(100) +
        '<rect x="104" y="178" width="3" height="16" rx="1" fill="#e7dccb"/></g>' +
    '</g>' +
    '<path d="' + arch(42, 46, 122) + '" fill="none" stroke="#5c3a22" stroke-width="2"/>' +
    // columns either side of the doors
    '<rect x="32" y="128" width="8" height="134" fill="#a77850"/><rect x="160" y="128" width="8" height="134" fill="#a77850"/>' +
    '<rect x="30" y="122" width="12" height="8" fill="#8f6a4e"/><rect x="158" y="122" width="12" height="8" fill="#8f6a4e"/>' +
    '<rect x="2" y="260" width="196" height="4" fill="#9c7556"/>' +
  '</svg>';
}

// A Korean gate (hanok daemun) for Curator's Choice: upturned tiled roof, painted dancheong beams,
// red pillars and gold lattice doors. Uses the same leaf classes, so it opens on hover like the others.
export function gate() {
  const k = 'g' + (++n);
  let tiles = '';
  for (let x = 30; x <= 170; x += 7) tiles += '<path d="M' + x + ' 46 Q' + (x + (x - 100) * 0.08) + ' 66 ' + (x + (x - 100) * 0.18) + ' 84" stroke="#3d4a5e" stroke-width="1" fill="none" opacity=".55"/>';
  let paint = '';
  for (let x = 40; x < 160; x += 20) paint += '<circle cx="' + (x + 10) + '" cy="96" r="4.5" fill="#c9704f" stroke="#efe3c8" stroke-width="1.2"/><path d="M' + (x + 2) + ' 96h4M' + (x + 14) + ' 96h4" stroke="#efe3c8" stroke-width="1.2"/>';
  const lattice = (x0) => {
    let s = '';
    for (let y = 132; y <= 236; y += 13) s += '<path d="M' + (x0 + 5) + ' ' + y + 'h40" stroke="#8a6326" stroke-width="1.4"/>';
    for (let x = x0 + 5; x <= x0 + 45; x += 10) s += '<path d="M' + x + ' 126v114" stroke="#8a6326" stroke-width="1.4"/>';
    return s + '<rect x="' + (x0 + 5) + '" y="126" width="40" height="114" fill="none" stroke="#6d4c1a" stroke-width="2"/>';
  };
  return '<svg class="cx-door cx-gate" viewBox="0 0 200 264" aria-hidden="true" focusable="false">' +
    '<defs>' +
      '<linearGradient id="' + k + 'r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6c7c96"/><stop offset="1" stop-color="#46536a"/></linearGradient>' +
      '<linearGradient id="' + k + 'd" x1="0" x2="1"><stop offset="0" stop-color="#c99a45"/><stop offset=".5" stop-color="#e3bd68"/><stop offset="1" stop-color="#c2913c"/></linearGradient>' +
      '<radialGradient id="' + k + 'g" cx=".5" cy=".7" r=".7"><stop offset="0" stop-color="#fbe7b8"/><stop offset=".55" stop-color="#d9a35c"/><stop offset="1" stop-color="#5a3518"/></radialGradient>' +
      '<clipPath id="' + k + 'c"><rect x="50" y="120" width="100" height="132"/></clipPath>' +
    '</defs>' +
    // stone base and steps
    '<rect x="22" y="250" width="156" height="8" fill="#b7a68e"/><rect x="14" y="257" width="172" height="7" fill="#9f8e76"/>' +
    // pillars
    '<rect x="34" y="104" width="13" height="148" fill="#9e4a3c"/><rect x="153" y="104" width="13" height="148" fill="#9e4a3c"/>' +
    '<rect x="31" y="240" width="19" height="12" fill="#8c7c66"/><rect x="150" y="240" width="19" height="12" fill="#8c7c66"/>' +
    // light behind the doors, then the doors
    '<rect x="50" y="120" width="100" height="132" fill="url(#' + k + 'g)"/>' +
    '<g clip-path="url(#' + k + 'c)">' +
      '<g class="cx-door-leaf cx-door-l"><rect x="50" y="120" width="50" height="132" fill="url(#' + k + 'd)"/>' + lattice(50) + '<circle cx="94" cy="190" r="3" fill="none" stroke="#5a3e14" stroke-width="1.6"/></g>' +
      '<g class="cx-door-leaf cx-door-r"><rect x="100" y="120" width="50" height="132" fill="url(#' + k + 'd)"/>' + lattice(100) + '<circle cx="106" cy="190" r="3" fill="none" stroke="#5a3e14" stroke-width="1.6"/></g>' +
    '</g>' +
    '<rect x="47" y="104" width="106" height="16" fill="#9e4a3c"/>' +
    // signboard
    '<rect x="78" y="104" width="44" height="15" fill="#2f3f5c" stroke="#d6b26a" stroke-width="1.6"/>' +
    '<path d="M86 111.5h6M97 108v7M95 111.5h4M104 109h8M108 109v6M104 115h8" stroke="#e7c97f" stroke-width="1.4" stroke-linecap="round"/>' +
    // painted beams (dancheong)
    '<rect x="26" y="86" width="148" height="18" fill="#5f8f86"/>' + paint +
    '<rect x="26" y="86" width="148" height="3" fill="#3f6b64"/><rect x="26" y="101" width="148" height="3" fill="#c9704f"/>' +
    // roof with upturned eaves
    '<path d="M2 66 Q30 84 100 82 Q170 84 198 66 Q186 76 176 88 L24 88 Q14 76 2 66 Z" fill="#3d4a5e"/>' +
    '<path d="M8 64 Q40 48 60 34 L140 34 Q160 48 192 64 Q170 80 100 78 Q30 80 8 64 Z" fill="url(#' + k + 'r)"/>' + tiles +
    '<path d="M50 34 Q100 26 150 34" stroke="#2e3747" stroke-width="7" fill="none" stroke-linecap="round"/>' +
    '<path d="M48 35 q-5 -2 -6 -8 M152 35 q5 -2 6 -8" stroke="#2e3747" stroke-width="4" fill="none" stroke-linecap="round"/>' +
  '</svg>';
}
