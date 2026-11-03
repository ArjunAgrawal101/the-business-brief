/**
 * HTML and SVG for the organization chart creator, rendered on the server for
 * the worked example and in the browser after every change, so the two always
 * match. The chart is a tidy tree with one row per level of the hierarchy.
 */
import { esc } from './markup';
import { fmtNumber } from './format';
import { GROUPING_LABEL, SHAPE_LABEL, describeStructure, type DelayerResult, type OrgModel, type OrgPost, type OrgProblem } from './org-chart';
import { P, r1, svgChart, wrapWords } from './tool-palette';

const BOX_W = 152;
const BOX_H = 54;
const GAP_X = 18;
const GAP_Y = 44;
const LEFT = 78;
const TOP = 14;

interface Placed {
  id: string;
  cx: number;
  y: number;
}

/** Positions for every post: leaves take consecutive slots, and each manager sits over its reports. */
export function layoutOrg(model: OrgModel): { place: Record<string, Placed>; width: number; height: number } {
  const place: Record<string, Placed> = {};
  let slot = 0;
  const visit = (id: string): number => {
    const kids = model.children[id] ?? [];
    const y = TOP + ((model.depth[id] ?? 1) - 1) * (BOX_H + GAP_Y);
    if (!kids.length) {
      const cx = LEFT + slot * (BOX_W + GAP_X) + BOX_W / 2;
      slot += 1;
      place[id] = { id, cx, y };
      return cx;
    }
    const xs = kids.map(visit);
    const cx = ((xs[0] ?? 0) + (xs[xs.length - 1] ?? 0)) / 2;
    place[id] = { id, cx, y };
    return cx;
  };
  visit(model.top);
  const width = LEFT + Math.max(1, slot) * (BOX_W + GAP_X) - GAP_X + 14;
  const height = TOP + model.levels * (BOX_H + GAP_Y) - GAP_Y + 14;
  return { place, width, height };
}

const plural = (n: number, one: string, many: string) => `${fmtNumber(n)} ${n === 1 ? one : many}`;

/** A sentence per level, for the chart's description and its text alternative. */
function describeLevels(model: OrgModel): string {
  const byId = new Map(model.posts.map((p) => [p.id, p]));
  return model.byLevel
    .map((l) => {
      const posts = model.posts.filter((p) => model.depth[p.id] === l.level);
      const items = posts.map((p) => {
        const s = model.span[p.id] ?? 0;
        const parts = [p.count > 1 ? `${p.count} people` : '', s ? `span of control ${s}` : ''].filter(Boolean);
        const parent = p.reportsTo ? byId.get(p.reportsTo)?.title : '';
        return `${p.title.trim()}${parts.length ? ` (${parts.join(', ')})` : ''}${parent ? `, reporting to ${parent.trim()}` : ''}`;
      });
      return `Level ${l.level}: ${items.join('; ')}.`;
    })
    .join(' ');
}

export interface OrgChartOptions {
  id: string;
  organization: string;
  /** Posts to highlight as a chain of command, bottom first. */
  chain?: string[];
  /** Posts to mark as removed by delayering. */
  removed?: string[];
}

export function orgChartSvg(model: OrgModel, o: OrgChartOptions): string {
  const { place, width, height } = layoutOrg(model);
  const byId = new Map(model.posts.map((p) => [p.id, p]));
  const chain = new Set(o.chain ?? []);
  const chainLinks = new Set<string>();
  (o.chain ?? []).forEach((id, k, arr) => {
    const up = arr[k + 1];
    if (up) chainLinks.add(`${up}>${id}`);
  });
  const removed = new Set(o.removed ?? []);
  const parts: string[] = [];
  // One band per level, labelled in words at the left.
  for (let l = 1; l <= model.levels; l += 1) {
    const y = TOP + (l - 1) * (BOX_H + GAP_Y);
    if (l % 2 === 0) parts.push(`<rect x="0" y="${r1(y - GAP_Y / 2)}" width="${width}" height="${BOX_H + GAP_Y}" fill="${P.ivory50}"/>`);
    parts.push(`<text x="10" y="${r1(y + BOX_H / 2 + 4)}" class="ch-region" fill="${P.slate}">Level ${l}</text>`);
  }
  // Reporting lines: down from each manager, across its reports, and down to each.
  for (const p of model.posts) {
    const kids = model.children[p.id] ?? [];
    if (!kids.length) continue;
    const a = place[p.id];
    if (!a) continue;
    const mid = a.y + BOX_H + GAP_Y / 2;
    const xs = kids.map((k) => place[k]?.cx ?? a.cx);
    const d = [`M${r1(a.cx)} ${r1(a.y + BOX_H)}V${r1(mid)}`, `M${r1(Math.min(...xs, a.cx))} ${r1(mid)}H${r1(Math.max(...xs, a.cx))}`, ...kids.map((k) => `M${r1(place[k]?.cx ?? 0)} ${r1(mid)}V${r1((place[k]?.y ?? 0) - 1)}`)];
    parts.push(`<path d="${d.join('')}" fill="none" stroke="${P.slate500}" stroke-width="1.2"/>`);
    for (const k of kids) {
      if (!chainLinks.has(`${p.id}>${k}`)) continue;
      const b = place[k];
      if (!b) continue;
      parts.push(`<path d="M${r1(a.cx)} ${r1(a.y + BOX_H)}V${r1(mid)}H${r1(b.cx)}V${r1(b.y - 1)}" fill="none" stroke="${P.cobalt}" stroke-width="2.6" stroke-linejoin="round"/>`);
    }
  }
  // Boxes.
  for (const p of model.posts) {
    const at = place[p.id];
    if (!at) continue;
    const x = at.cx - BOX_W / 2;
    const isTop = p.id === model.top;
    const isManager = (model.children[p.id] ?? []).length > 0;
    const inChain = chain.has(p.id);
    const isRemoved = removed.has(p.id);
    const stroke = isRemoved ? P.signal : inChain ? P.cobalt : isTop || isManager ? P.navy : P.rule;
    const sw = inChain ? 2.4 : isRemoved ? 1.8 : isTop || isManager ? 1.3 : 1;
    const dash = isRemoved ? ' stroke-dasharray="5 4"' : '';
    if (p.count > 1) {
      parts.push(`<rect x="${r1(x + 6)}" y="${r1(at.y + 6)}" width="${BOX_W}" height="${BOX_H}" fill="${P.white}" stroke="${P.rule}"/>`);
      parts.push(`<rect x="${r1(x + 3)}" y="${r1(at.y + 3)}" width="${BOX_W}" height="${BOX_H}" fill="${P.white}" stroke="${P.rule}"/>`);
    }
    parts.push(`<rect x="${r1(x)}" y="${r1(at.y)}" width="${BOX_W}" height="${BOX_H}" fill="${isTop ? P.navy : P.white}" stroke="${stroke}" stroke-width="${sw}"${dash}/>`);
    if (isManager && !isTop) parts.push(`<rect x="${r1(x)}" y="${r1(at.y)}" width="${BOX_W}" height="3" fill="${isRemoved ? P.signal : P.people}"/>`);
    const lines = wrapWords(p.title, 21, 2);
    const span = model.span[p.id] ?? 0;
    const sub = isRemoved ? 'Removed by delayering' : isManager ? `Span of control ${span}` : p.count > 1 ? `${p.count} people` : '';
    const ink = isTop ? P.ivory : P.navy;
    const subInk = isTop ? P.slate300 : isRemoved ? P.signalText : P.slate;
    const total = lines.length + (sub ? 1 : 0);
    const y0 = at.y + BOX_H / 2 - ((total - 1) * 14) / 2 + 4;
    lines.forEach((l, k) => parts.push(`<text x="${r1(at.cx)}" y="${r1(y0 + k * 14)}" text-anchor="middle" class="ch-label org-ch__t" fill="${ink}">${esc(l)}</text>`));
    if (sub) parts.push(`<text x="${r1(at.cx)}" y="${r1(y0 + lines.length * 14)}" text-anchor="middle" class="ch-note org-ch__s" fill="${subInk}">${esc(sub)}</text>`);
  }
  const s = describeStructure(model);
  const desc = `Organization chart of ${o.organization.trim() || 'the organization'}: ${plural(model.posts.length, 'post', 'posts')}, ${plural(model.headcount, 'person', 'people')}, ${plural(model.levels, 'level', 'levels')} of hierarchy. ${s.name}. ${describeLevels(model)}${
    o.chain && o.chain.length > 1 ? ` Highlighted: the chain of command from ${byId.get(o.chain[0] ?? '')?.title.trim()} to ${byId.get(o.chain[o.chain.length - 1] ?? '')?.title.trim()}.` : ''
  }${removed.size ? ` Marked as removed by delayering: ${[...removed].map((id) => byId.get(id)?.title.trim()).join(', ')}.` : ''}`;
  return svgChart({ w: width, h: height, id: o.id, title: `Organization chart: ${o.organization.trim() || 'the organization'}`, desc, body: parts.join(''), minWidth: Math.min(width, Math.max(520, width * 0.78)), maxWidth: width * 1.15, cls: 'org-ch' });
}

/** The same chart as a nested list, for screen readers, for reading and for print. */
export function orgOutlineHtml(model: OrgModel): string {
  const byId = new Map(model.posts.map((p) => [p.id, p]));
  const item = (id: string): string => {
    const p = byId.get(id);
    if (!p) return '';
    const kids = model.children[id] ?? [];
    const meta = [`level ${model.depth[id]}`, p.count > 1 ? `${p.count} people` : '1 person', kids.length ? `span of control ${model.span[id] ?? 0}` : ''].filter(Boolean).join(', ');
    return `<li><span class="org-outline__post">${esc(p.title.trim())}</span> <span class="org-outline__meta">${esc(meta)}</span>${kids.length ? `<ul>${kids.map(item).join('')}</ul>` : ''}</li>`;
  };
  return `<ul class="org-outline">${item(model.top)}</ul>`;
}

const fig = (k: string, v: string, note?: string) => `<div class="fig"><dt>${esc(k)}</dt><dd><span class="fig__v">${v}</span>${note ? `<span class="fig__n">${esc(note)}</span>` : ''}</dd></div>`;

export function orgFiguresHtml(model: OrgModel): string {
  const title = (id: string) => model.posts.find((p) => p.id === id)?.title.trim() ?? '';
  const chain = model.longestChain;
  return [
    fig('Levels of hierarchy', esc(fmtNumber(model.levels))),
    fig('People', esc(fmtNumber(model.headcount)), `in ${plural(model.posts.length, 'post', 'posts')}`),
    fig('Managers', esc(fmtNumber(model.managers)), 'posts with someone reporting to them'),
    fig('Average span of control', model.averageSpan === null ? 'n/a' : esc(fmtNumber(model.averageSpan, Number.isInteger(model.averageSpan) ? 0 : 1)), 'direct reports per manager'),
    fig('Widest span of control', model.widest ? esc(fmtNumber(model.widest.span)) : 'n/a', model.widest ? title(model.widest.id) : undefined),
    fig('Longest chain of command', esc(plural(chain.length, 'post', 'posts')), chain.length > 1 ? `${title(chain[0] ?? '')} to ${title(chain[chain.length - 1] ?? '')}` : undefined),
    fig('Shape', esc(SHAPE_LABEL[model.shape]), 'the platform’s rule of thumb'),
    fig('Departments', esc(GROUPING_LABEL[model.grouping]), 'the posts directly under the top'),
  ].join('');
}

/** Spans of control level by level. */
export function orgLevelRowsHtml(model: OrgModel): string {
  return model.byLevel
    .map((l) => {
      const spans = l.spans.length ? l.spans.join(', ') : 'none';
      const mean = l.meanSpan === null ? 'n/a' : fmtNumber(l.meanSpan, Number.isInteger(l.meanSpan) ? 0 : 1);
      return `<tr><th scope="row">Level ${l.level}</th><td class="n">${l.posts}</td><td class="n">${l.people}</td><td class="n">${l.managers}</td><td class="n">${esc(spans)}</td><td class="n">${esc(mean)}</td></tr>`;
    })
    .join('');
}

/** The posts in tree order (each manager before its reports), or as given if the chart is not yet valid. */
export function treeOrder(posts: OrgPost[]): OrgPost[] {
  const top = posts.filter((p) => !p.reportsTo);
  if (top.length !== 1) return posts;
  const out: OrgPost[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const p = posts.find((x) => x.id === id);
    if (!p) return;
    out.push(p);
    posts.filter((x) => x.reportsTo === id).forEach((x) => visit(x.id));
  };
  visit(top[0]?.id ?? '');
  // Posts outside the tree (a loop) keep their place at the end.
  posts.forEach((p) => seen.has(p.id) || out.push(p));
  return out;
}

const GROUPING_OPTIONS: Array<[string, string]> = [
  ['', 'Not stated'],
  ['function', 'Function'],
  ['product', 'Product'],
  ['region', 'Region'],
];

/** The editor: one group of fields per post, in tree order. */
export function orgEditorHtml(posts: OrgPost[], uid: string, problems: OrgProblem[], depth: Record<string, number>, maxPosts: number): string {
  const ordered = treeOrder(posts);
  const full = posts.length >= maxPosts;
  return ordered
    .map((p, k) => {
      const id = `${uid}-p-${p.id}`;
      const err = (f: OrgProblem['field']) => problems.filter((x) => x.id === p.id && x.field === f).map((x) => x.message).join(' ');
      const isTop = !p.reportsTo;
      const parent = posts.find((x) => x.id === p.reportsTo);
      const underTop = Boolean(parent && !parent.reportsTo);
      const lvl = depth[p.id];
      const name = p.title.trim() || 'Untitled post';
      const options = [`<option value=""${isTop ? ' selected' : ''}>No one: the top post</option>`, ...ordered.filter((x) => x.id !== p.id).map((x) => `<option value="${esc(x.id)}"${x.id === p.reportsTo ? ' selected' : ''}>${esc(x.title.trim() || 'Untitled post')}</option>`)].join('');
      const titleErr = err('title');
      const countErr = err('count');
      const parentErr = err('reportsTo');
      const field = (key: string, label: string, control: string, e: string) =>
        `<div class="field org-row__${key}"><label for="${id}-${key}">${label}</label>${control}<span class="field__error" id="${id}-${key}-err" data-err="${key}">${esc(e)}</span></div>`;
      const invalid = (e: string) => (e ? ' aria-invalid="true"' : '');
      return `<li class="org-row${isTop ? ' org-row--top' : ''}${underTop ? ' org-row--dept' : ''}" data-post="${esc(p.id)}" style="--lvl:${Math.min(5, (lvl ?? 1) - 1)}">
<div class="org-row__set" role="group" aria-labelledby="${id}-name">
<p class="org-row__head"><span class="org-row__no" aria-hidden="true">${k + 1}</span><span class="org-row__name" id="${id}-name" data-legend>${esc(name)}</span>${lvl ? `<span class="org-row__lvl">Level ${lvl}</span>` : ''}</p>
<div class="org-row__actions js-only"><button type="button" class="btn btn--small" data-act="add" data-post="${esc(p.id)}"${full ? ' aria-disabled="true"' : ''}>Add below<span class="sr-only"> ${esc(name)}: a new post reporting to it</span></button>${isTop ? '' : `<button type="button" class="btn btn--small" data-act="remove" data-post="${esc(p.id)}">Remove<span class="sr-only"> ${esc(name)}</span></button>`}</div>
${field('title', 'Post', `<input class="input" id="${id}-title" name="title" type="text" maxlength="80" autocomplete="off" value="${esc(p.title)}" aria-describedby="${id}-title-err"${invalid(titleErr)}>`, titleErr)}
${field('count', 'People', `<input class="input input--num" id="${id}-count" name="count" type="number" inputmode="numeric" min="1" max="999" step="1" value="${Number.isFinite(p.count) ? p.count : ''}" aria-describedby="${id}-count-err"${invalid(countErr)}>`, countErr)}
${field('reportsTo', 'Reports to', `<select class="select" id="${id}-reportsTo" name="reportsTo" aria-describedby="${id}-reportsTo-err"${invalid(parentErr)}>${options}</select>`, parentErr)}
${underTop ? field('grouping', 'Grouped by', `<select class="select" id="${id}-grouping" name="grouping" aria-describedby="${id}-grouping-err">${GROUPING_OPTIONS.map(([v, l]) => `<option value="${v}"${(p.grouping ?? '') === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`, '') : ''}
</div></li>`;
    })
    .join('');
}

/** The comparison of the chart before and after delayering. */
export function delayerRowsHtml(before: OrgModel, d: DelayerResult): string {
  const a = d.after;
  const avg = (m: OrgModel) => (m.averageSpan === null ? 'n/a' : fmtNumber(m.averageSpan, Number.isInteger(m.averageSpan) ? 0 : 1));
  const title = (m: OrgModel, id: string | undefined) => m.posts.find((p) => p.id === id)?.title.trim() ?? '';
  const rows: Array<[string, string, string]> = [
    ['Levels of hierarchy', String(before.levels), String(a.levels)],
    ['Posts', String(before.posts.length), String(a.posts.length)],
    ['People', String(before.headcount), String(a.headcount)],
    ['Managers', String(before.managers), String(a.managers)],
    ['Average span of control', avg(before), avg(a)],
    ['Widest span of control', before.widest ? `${before.widest.span} (${title(before, before.widest.id)})` : 'n/a', a.widest ? `${a.widest.span} (${title(a, a.widest.id)})` : 'n/a'],
    ['Longest chain of command, in posts', String(before.longestChain.length), String(a.longestChain.length)],
    ['Shape', SHAPE_LABEL[before.shape], SHAPE_LABEL[a.shape]],
  ];
  return rows.map(([k, b, c]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join('');
}
