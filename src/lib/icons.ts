/**
 * The platform's icons: one for each room, drawn for this platform on a 24 by
 * 24 grid with square line ends and mitred corners, to match the identity's
 * square corners and rules. Each value is the inside of an <svg>; stroke and
 * fill come from the wrapper (see src/components/ui/Icon.astro). A filled
 * element says so with fill="currentColor".
 */
export const ICONS = {
  /* Rooms */
  'business-brief': '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 11h6M9 14h6M9 17h3.5"/>',
  'case-room': '<path d="M3 6h6l2 2h10v12H3z"/><path d="M3 11h18"/><path d="M8 15h5"/>',
  'decision-room': '<path d="M12 21v-6.5L6.5 9M12 14.5L17.5 9"/><rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6" fill="currentColor"/>',
  'strategy-studio': '<rect x="3" y="3" width="18" height="18"/><path d="M12 3v18M3 12h18"/><rect x="14.5" y="5.5" width="4" height="4" fill="currentColor"/>',
  'finance-desk': '<path d="M3 21h18"/><path d="M6 17v-4M10.5 17V9M15 17v-6M19.5 17V5"/>',
  'market-studio': '<circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="3.5"/><path d="M11 13l8-8"/><path d="M16 4h4v4"/>',
  'people-and-culture': '<circle cx="8.5" cy="7.5" r="3"/><circle cx="16.5" cy="8.5" r="2.5"/><path d="M3 20v-2.5a5.5 5.5 0 0 1 11 0V20"/><path d="M15 13.2a4.5 4.5 0 0 1 6 4.3V20"/>',
  'operations-floor': '<path d="M2 18h20"/><rect x="4" y="10" width="6" height="6"/><rect x="13" y="7" width="7" height="9"/><path d="M5 21h1M11.5 21h1M18 21h1"/>',
  boardroom: '<rect x="6" y="8.5" width="12" height="7"/><path d="M8 5h2.5M13.5 5H16M8 19h2.5M13.5 19H16M3 10.5v3M21 10.5v3"/>',
  'case-vault': '<rect x="3" y="4" width="18" height="5"/><path d="M5 9v11h14V9"/><path d="M10 13h4"/>',
  'exam-desk': '<rect x="5" y="4" width="14" height="17"/><path d="M9 4V2.5h6V4"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  'examiner-lens': '<circle cx="10" cy="10" r="6.5"/><path d="M15 15l6 6"/><path d="M7 8.5h6M7 11.5h4"/>',
  'ia-studio': '<path d="M5 3h13v18H5z"/><path d="M8.5 3v18"/><path d="M12 3v7l2-1.5 2 1.5V3"/>',
  'revision-brief': '<rect x="3" y="8" width="14" height="12"/><path d="M7 8V4h14v12h-4"/><path d="M6 12h8M6 15h5"/>',
  /* Interface */
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
  rooms: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  arrow: '<path d="M4 12h15"/><path d="M14 7l5 5-5 5"/>',
  check: '<path d="M4.5 12.5l4.5 4.5 10.5-10.5"/>',
  progress: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  map: '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="5" cy="18" r="2"/><path d="M7 6h10M6 8l5.2 8.3M18 8l-5.2 8.3M7 18h3"/>',
} as const;

export type IconId = keyof typeof ICONS;

export function isIcon(id: string): id is IconId {
  return id in ICONS;
}

/** The icon as a complete inline SVG string, for scripts that build markup. */
export function iconSvg(id: IconId, size = 24, label?: string): string {
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="square" stroke-linejoin="miter" ${a11y}>${ICONS[id]}</svg>`;
}
