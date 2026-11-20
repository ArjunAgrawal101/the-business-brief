/**
 * The diagrams added for visual learning: every one names real subtopics at
 * the right level, describes itself in full and in one sentence, downloads as
 * a file, draws a layout for phones whose text is never under 14 units (12
 * pixels on a 320 pixel screen), and each interaction is complete: parts that
 * open real pages, states and panels that draw, live figures that read back
 * without a problem. Also the catalogue's order, labels and record of where
 * each diagram is used.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { DIAGRAMS, describe as descOf, standalone, type DiagramDef } from '../../src/lib/diagrams';
import { UNIT1_MORE } from '../../src/lib/figures/unit1-more';
import { UNIT2_MORE } from '../../src/lib/figures/unit2-more';
import { UNIT3_MORE, treeRows } from '../../src/lib/figures/unit3-more';
import { UNIT45_MORE } from '../../src/lib/figures/unit45-more';
import { TOOLKIT_MORE } from '../../src/lib/figures/toolkit-more';
import { LIVE, defaults } from '../../src/lib/figures/live';
import { diagramUses, diagramsInOrder, interactionLabel } from '../../src/lib/diagram-library';
import { getStaticPaths } from '../../src/pages/downloads/diagrams/[id].svg';
import { loadCorpus } from './helpers/corpus';

const NEW: Record<string, DiagramDef> = { ...UNIT1_MORE, ...UNIT2_MORE, ...UNIT3_MORE, ...UNIT45_MORE, ...TOOLKIT_MORE };
const IDS = Object.keys(NEW);
const c = loadCorpus();
const subtopics = (c.curricula['ib-dp-bm']?.units ?? []).flatMap((u) => u.subtopics);
const frameworkIds = new Set(readdirSync(new URL('../../src/content/frameworks/', import.meta.url)).map((f) => f.replace(/\.yaml$/, '')));

/** Every font size a drawing's text is set at; text with no size of its own takes the drawing's 13. */
function textSizes(svg: string): number[] {
  const out: number[] = [];
  for (const m of svg.matchAll(/<text\b([^>]*)>/g)) {
    const size = /font-size="([\d.]+)"/.exec(m[1] ?? '');
    out.push(size ? Number(size[1]) : 13);
  }
  return out;
}

/** Everything the diagram can draw: wide, for phones, every state and panel, and every part's words. */
function everything(id: string, d: DiagramDef): string[] {
  const o = { link: (p: string) => `/x/${p}/`, describedBy: 'k' };
  const out = [d.render(`a-${id}`, o), standalone(id)];
  if (d.narrow) out.push(d.narrow(`n-${id}`, o));
  if (d.ix?.kind === 'switch') for (const s of d.ix.states) out.push(d.ix.draw(`s-${s.id}`, s.id, false, o), d.ix.draw(`sn-${s.id}`, s.id, true, o), s.label, s.note);
  if (d.ix?.kind === 'compare') for (const p of d.ix.panels) out.push(d.ix.draw(`p-${p.id}`, p.id), p.label, ...p.facts.flat());
  if (d.ix?.kind === 'live') out.push(JSON.stringify(LIVE[d.ix.model].read(defaults(d.ix.inputs))));
  if (d.ix?.kind === 'tree') out.push(...treeRows(d.ix.tree).map(({ n }) => `${n.label} ${n.note ?? ''}`));
  for (const p of d.parts ?? []) out.push(p.label, p.text);
  out.push(d.title, d.caption ?? '', d.alt ?? '', d.howTo ?? '');
  return out;
}

describe('the new diagrams', () => {
  it('add between 12 and 20 diagrams, each with a new id', () => {
    expect(IDS.length).toBeGreaterThanOrEqual(12);
    expect(IDS.length).toBeLessThanOrEqual(20);
    for (const id of IDS) expect(DIAGRAMS[id], id).toBe(NEW[id]);
  });

  it.each(IDS)('%s names real subtopics, at the right level', (id) => {
    const d = NEW[id]!;
    expect(d.syllabus.length).toBeGreaterThan(0);
    const levels = d.syllabus.map((code) => {
      const s = subtopics.find((x) => x.code === code);
      expect(s, `${id}: ${code}`).toBeDefined();
      return s?.level;
    });
    // HL only exactly when every subtopic it teaches is HL only.
    expect(d.level).toBe(levels.every((l) => l === 'HL') ? 'HL' : 'SL/HL');
    // Filed under the unit of the first subtopic it teaches, or the toolkit.
    if (d.group !== 'toolkit') expect(d.group).toBe(`unit-${d.syllabus[0]!.split('.')[0]}`);
  });

  it.each(IDS)('%s describes itself in full and in one sentence', (id) => {
    const d = NEW[id]!;
    const svg = d.render(`t-${id}`);
    expect(descOf(svg).length).toBeGreaterThan(150);
    expect(d.alt && d.alt.length).toBeGreaterThan(40);
    expect(d.alt).toMatch(/^[A-Z].*\.$/);
    expect(d.caption).toBeTruthy();
    expect(svg).toContain(`aria-labelledby="t-${id}-t"`);
    expect(svg).toContain(`aria-describedby="t-${id}-d"`);
  });

  it.each(IDS)('%s downloads as a file, and prints from the page', (id) => {
    expect(getStaticPaths().map((p) => p.params.id)).toContain(id);
    const file = standalone(id);
    expect(file.startsWith('<?xml')).toBe(true);
    expect(file).toContain(NEW[id]!.title.replace(/&/g, '&amp;'));
    expect(file).toContain('Arjun Agrawal | The Business Brief');
  });

  it.each(IDS)('%s has a layout for phones whose text is 14 units or more', (id) => {
    const d = NEW[id]!;
    const phone: string[] = [];
    if (d.ix?.kind === 'tree') return; // drawn in HTML on the page, at 14 pixels and more
    if (d.ix?.kind === 'compare') for (const p of d.ix.panels) phone.push(d.ix.draw(`p-${p.id}`, p.id));
    else if (d.ix?.kind === 'switch') for (const s of d.ix.states) phone.push(d.ix.draw(`sn-${s.id}`, s.id, true));
    else {
      expect(d.narrow, `${id} needs a layout for phones`).toBeDefined();
      phone.push(d.narrow!(`n-${id}`));
    }
    for (const svg of phone) {
      expect(/viewBox="0 0 300 /.test(svg), `${id} is drawn 300 wide for phones`).toBe(true);
      const small = textSizes(svg).filter((s) => s < 14);
      expect(small, `${id}: text under 14 units`).toEqual([]);
    }
  });

  it.each(IDS)('%s writes no dashes, and nothing undefined', (id) => {
    for (const s of everything(id, NEW[id]!)) {
      expect(/[–—]/.test(s), `${id}: a dash in "${s.slice(0, 80)}"`).toBe(false);
      expect(/undefined|NaN|\[object Object\]/.test(s), `${id}: "${s.slice(0, 80)}"`).toBe(false);
    }
  });
});

describe('the framework diagrams on phones', () => {
  const pages = readdirSync(new URL('../../src/content/frameworks/', import.meta.url)).filter((f) => f.endsWith('.yaml'));
  const drawn = pages.map((f) => {
    const src = readFileSync(new URL(`../../src/content/frameworks/${f}`, import.meta.url), 'utf8');
    return [f.replace(/\.yaml$/, ''), /^diagram: (\S+)/m.exec(src)?.[1] ?? ''] as const;
  });

  it.each(drawn)('the framework %s draws its diagram again for a phone, with no text under 14 units', (fw, id) => {
    const d = DIAGRAMS[id];
    expect(d, `${fw}: ${id}`).toBeDefined();
    expect(d!.narrow, `${fw}: ${id} has no layout for phones`).toBeDefined();
    const svg = d!.narrow!(`f-${id}`);
    expect(/viewBox="0 0 300 /.test(svg)).toBe(true);
    expect(textSizes(svg).filter((x) => x < 14), `${id}: text under 14 units`).toEqual([]);
    // It says what the wide drawing says.
    expect(descOf(svg)).toBe(descOf(d!.render(`w-${id}`)));
    expect(/[–—]|undefined|NaN/.test(svg)).toBe(false);
  });
});

describe('the interactions', () => {
  it('give every explorable part words and a page that exists, in both layouts', () => {
    const withParts = IDS.filter((id) => NEW[id]!.parts?.length);
    expect(withParts.length).toBeGreaterThanOrEqual(5);
    for (const id of withParts) {
      const d = NEW[id]!;
      const o = { link: (p: string) => `/x/${p}/`, describedBy: 'k' };
      const wide = d.render('w', o);
      const narrow = d.narrow?.('n', o) ?? '';
      const ids = d.parts!.map((p) => p.id);
      expect(new Set(ids).size, `${id}: part ids are unique`).toBe(ids.length);
      for (const p of d.parts!) {
        expect(p.text.length, `${id}/${p.id}`).toBeGreaterThan(40);
        if (p.code) expect(subtopics.some((s) => s.code === p.code), `${id}/${p.id}: ${p.code}`).toBe(true);
        else {
          const m = /^\/frameworks\/([^/]+)\/$/.exec(p.href ?? '');
          expect(m && frameworkIds.has(m[1]!), `${id}/${p.id}: ${p.href}`).toBe(true);
        }
        // Each part is a link on the page, described by its explanation, in the wide drawing and the phone one.
        for (const svg of [wide, narrow]) {
          expect(svg).toContain(`data-part="${p.id}" href="/x/${p.id}/"`);
          expect(svg).toContain(`aria-describedby="k-${p.id}"`);
        }
      }
      // On the page the drawing is a group of links, not a single image.
      expect(wide).toContain('role="group"');
      expect(d.render('plain')).not.toContain('<a ');
    }
  });

  it('draw every state of a switch, wide and for phones', () => {
    const switches = IDS.filter((id) => NEW[id]!.ix?.kind === 'switch');
    expect(switches.length).toBeGreaterThanOrEqual(2);
    for (const id of switches) {
      const ix = NEW[id]!.ix as Extract<DiagramDef['ix'], { kind: 'switch' }>;
      expect(ix.states.length).toBeGreaterThanOrEqual(2);
      const drawn = ix.states.map((s) => ix.draw(`s-${s.id}`, s.id, false));
      expect(new Set(drawn.map((x) => descOf(x))).size, `${id}: each state says something different`).toBe(ix.states.length);
    }
  });

  it('give every panel of a comparison the same facts in the same order', () => {
    const compares = IDS.filter((id) => NEW[id]!.ix?.kind === 'compare');
    expect(compares.length).toBeGreaterThanOrEqual(2);
    for (const id of compares) {
      const ix = NEW[id]!.ix as Extract<DiagramDef['ix'], { kind: 'compare' }>;
      const keys = ix.panels[0]!.facts.map(([k]) => k);
      for (const p of ix.panels) expect(p.facts.map(([k]) => k), `${id}/${p.id}`).toEqual(keys);
      expect(ix.panels.map((p) => p.id)).toEqual(expect.arrayContaining(ix.first));
      expect(ix.first[0]).not.toBe(ix.first[1]);
    }
  });

  it('start every live diagram from figures it can read, inside each input’s range', () => {
    const lives = IDS.filter((id) => NEW[id]!.ix?.kind === 'live');
    expect(lives.length).toBeGreaterThanOrEqual(3);
    for (const id of lives) {
      const ix = NEW[id]!.ix as Extract<DiagramDef['ix'], { kind: 'live' }>;
      for (const i of ix.inputs) {
        expect(i.value, `${id}/${i.key}`).toBeGreaterThanOrEqual(i.min);
        expect(i.value, `${id}/${i.key}`).toBeLessThanOrEqual(i.max);
        if (i.options) expect(i.options.map((x) => x.value)).toContain(i.value);
      }
      const r = LIVE[ix.model].read(defaults(ix.inputs));
      expect(r.problems, id).toEqual([]);
      expect(r.reading.length).toBeGreaterThan(60);
    }
  });

  it('end every branch of the decision tree at a glossary entry that exists', () => {
    const trees = IDS.filter((id) => NEW[id]!.ix?.kind === 'tree');
    expect(trees.length).toBeGreaterThanOrEqual(1);
    for (const id of trees) {
      const ix = NEW[id]!.ix as Extract<DiagramDef['ix'], { kind: 'tree' }>;
      const options = treeRows(ix.tree).filter(({ n }) => n.kind === 'option');
      expect(options.length).toBeGreaterThanOrEqual(8);
      for (const { n } of options) {
        const term = /^\/glossary\/([^/]+)\/$/.exec(n.href ?? '')?.[1];
        expect(term && c.glossary[term], `${id}/${n.id}: ${n.href}`).toBeTruthy();
      }
      // Every source of finance the guide names appears at the end of a branch.
      const names = options.map(({ n }) => n.label.toLowerCase());
      for (const s of ['personal funds', 'retained profit', 'sale of assets', 'share capital', 'loan capital', 'overdraft', 'trade credit', 'crowdfunding', 'leasing', 'microfinance', 'business angels'])
        expect(names.some((x) => x.startsWith(s)), s).toBe(true);
    }
  });
});

describe('the catalogue', () => {
  it('lists every diagram once, by group', () => {
    const order = diagramsInOrder();
    expect(order.map(([id]) => id).sort()).toEqual(Object.keys(DIAGRAMS).sort());
  });

  it('says what a reader can do with each interactive diagram', () => {
    expect(interactionLabel(DIAGRAMS['cash-flow-timeline']!)).toBe('Change the figures');
    expect(interactionLabel(DIAGRAMS['entity-comparison']!)).toBe('Compare two side by side');
    expect(interactionLabel(DIAGRAMS['triple-bottom-line']!)).toBe('Explore each part');
    expect(interactionLabel(DIAGRAMS['swot']!)).toBe('');
  });

  it('records where a diagram is used: its subtopics, the notes that teach with it and the frameworks that draw it', () => {
    const slug = (t: string) => t.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const ctx = {
      notes: c.notes,
      subtopicTitle: (code: string) => subtopics.find((s) => s.code === code)?.title ?? code,
      subtopicHref: (code: string) => `/topics/${slug(subtopics.find((s) => s.code === code)?.title ?? '')}/`,
      frameworks: { 'swot-analysis': { name: 'SWOT analysis', diagram: 'swot' } },
    };
    const uses = diagramUses('swot', ctx);
    expect(uses.frameworks).toEqual([{ id: 'swot-analysis', name: 'SWOT analysis', href: '/frameworks/swot-analysis/' }]);
    expect(uses.subtopics.map((s) => s.code)).toEqual(DIAGRAMS.swot!.syllabus);
    for (const id of IDS) for (const s of diagramUses(id, ctx).subtopics) expect(s.href).toMatch(/^\/topics\/[a-z0-9-]+\/$/);
    // A diagram a notes section teaches with is listed with that section's address.
    const [noteId, note] = Object.entries(c.notes).find(([, n]) => n.sections.some((s) => s.diagram)) ?? [];
    if (note) {
      const section = note.sections.find((s) => s.diagram)!;
      const u = diagramUses(section.diagram!, ctx);
      expect(u.notes, noteId).toContainEqual({ code: note.code, subtopic: ctx.subtopicTitle(note.code), section: section.title, href: `${ctx.subtopicHref(note.code)}#${section.id}` });
      expect(u.subtopics.find((s) => s.code === note.code)?.inNotes ?? true).toBe(true);
    }
  });
});
