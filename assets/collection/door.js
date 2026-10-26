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
