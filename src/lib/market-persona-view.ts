/** HTML for the customer persona creator, shared by the server render and the browser script. */
import { esc } from './markup';
import { removeButton, selectField, textField } from './market-view';
import { BASIS_LABELS, USE_LABELS, initials, type PersonaChannel, type PersonaState } from './market-persona';

export function channelRowHtml(c: PersonaChannel, i: number, uid: string): string {
  const id = (k: string) => `${uid}-ch-${i}-${k}`;
  return `<div class="mk-chrow" data-row="${i}">${textField({ id: id('name'), f: 'name', label: `Channel ${i + 1}`, value: c.name, max: 60, srLabel: true })}${selectField({ id: id('use'), f: 'use', label: `Channel ${i + 1}: how much they use it`, value: c.use, options: (['high', 'medium', 'low'] as const).map((u) => ({ value: u, label: USE_LABELS[u] })), srLabel: true })}${removeButton('Remove', `channel ${i + 1}`)}${textField({ id: id('note'), f: 'note', label: `Note on channel ${i + 1} (optional)`, value: c.note, max: 160, cls: 'mk-chrow__note' })}</div>`;
}

const list = (items: string[], cls: string) => (items.length ? `<ul class="${cls}">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="small muted">None yet.</p>');

/** The persona card: the portrait the team will share and print. */
export function personaCardHtml(p: PersonaState): string {
  const facts = [p.age ? `${p.age} years old` : '', p.occupation, p.location].filter((x) => x.trim());
  const width = { high: 100, medium: 60, low: 25 } as const;
  const channels = p.channels.length
    ? `<ul class="mk-pc__channels" role="list">${p.channels
        .map(
          (c) =>
            `<li><span class="mk-pc__chname">${esc(c.name)}</span><span class="mk-pc__bar" aria-hidden="true"><i style="width:${width[c.use]}%"></i></span><span class="mk-pc__use">${esc(USE_LABELS[c.use])}</span>${c.note ? `<span class="mk-pc__chnote">${esc(c.note)}</span>` : ''}</li>`,
        )
        .join('')}</ul>`
    : '<p class="small muted">No channels yet.</p>';
  return `<article class="mk-pc" aria-label="${esc(`Persona card: ${p.name || 'unnamed'}`)}">
<header class="mk-pc__head"><span class="mk-pc__mono" aria-hidden="true">${esc(initials(p.name))}</span><div><p class="mk-pc__kicker">Persona · ${esc(p.business)}</p><p class="mk-pc__name">${esc(p.name || 'Unnamed persona')}</p><p class="mk-pc__facts">${esc(facts.join(' · '))}</p>${p.segment ? `<p class="mk-pc__seg"><span class="label">Segment</span> ${esc(p.segment)}</p>` : ''}</div></header>
${p.quote ? `<blockquote class="mk-pc__quote"><p>${esc(p.quote)}</p></blockquote>` : ''}
${p.background ? `<p class="mk-pc__bg">${esc(p.background)}</p>` : ''}
<div class="mk-pc__cols"><section><h6 class="mk-pc__h">Needs and goals</h6>${list(p.needs, 'mk-pc__list mk-pc__list--needs')}</section><section><h6 class="mk-pc__h">Pains and frustrations</h6>${list(p.pains, 'mk-pc__list mk-pc__list--pains')}</section></div>
<div class="mk-pc__cols"><section><h6 class="mk-pc__h">How they buy</h6>${list(p.behaviour, 'mk-pc__list')}</section><section><h6 class="mk-pc__h">Where to reach them</h6>${channels}</section></div>
<div class="mk-pc__cols"><section><h6 class="mk-pc__h">What might stop them</h6>${list(p.objections, 'mk-pc__list')}</section><section><h6 class="mk-pc__h">What would win them</h6>${list(p.winners, 'mk-pc__list')}</section></div>
<footer class="mk-pc__foot"><span class="tag ${p.basis === 'assumption' ? 'tag--planned' : 'tag--plain'}">${esc(BASIS_LABELS[p.basis])}</span> ${esc(p.evidence)}</footer>
</article>`;
}
