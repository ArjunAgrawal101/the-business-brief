/** HTML for the marketing mix builder, shared by the server render and the browser script. */
import { esc } from './markup';
import { checksTally } from './market-view';
import { ELEMENT_LABELS, STATUS_WORDS, choiceText, elementStatus, elementsFor, mixChecks, type MixState, type Status } from './market-mix';

const cell = (st: Status) => `<td class="mk-st mk-st--${st}"><span class="mk-st__mark" aria-hidden="true"></span>${esc(STATUS_WORDS[st])}</td>`;

/** For each P in use: its choices, and how it sits with the target, the position and the other Ps. */
export function consistencyRowsHtml(s: MixState): string {
  const checks = mixChecks(s);
  return elementsFor(s.kind)
    .map((el) => {
      const st = elementStatus(checks, el);
      return `<tr><th scope="row">${esc(ELEMENT_LABELS[el])}</th><td class="small">${esc(choiceText(s, el))}</td>${cell(st.target)}${cell(st.position)}${cell(st.ps)}</tr>`;
    })
    .join('');
}

export function mixTallyHtml(s: MixState): string {
  return esc(`${s.kind === 'service' ? 'Seven Ps (a service)' : 'Four Ps (a good)'}: ${checksTally(mixChecks(s))}.`);
}
