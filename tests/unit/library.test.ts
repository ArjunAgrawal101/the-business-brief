/**
 * The Resources Library's catalogue: every download it offers exists (a file
 * in public/, or one the build writes from an endpoint that lists it), with
 * its format, size and pages measured from the file; every category's count
 * is the number of items in it; a category with nothing real in it is labelled
 * "Not yet available" and counts nothing; the revision workstream's addresses
 * appear exactly when their pages do; and the search and filters behave.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { c, libraryInput } from './helpers/library';
import { DIAGRAMS } from '../../src/lib/diagrams';
import { buildCatalogue, catalogueDownloads, CATEGORY_DEFS, facetsOf, itemFormats, linkFacts, type LibraryItem } from '../../src/lib/library/catalogue';
import { LIBRARY_CATEGORIES } from '../../src/lib/library/categories';
import { factsLine, fileFacts, formatBytes, pdfPages, svgSize, writtenFile } from '../../src/lib/library/downloads';
import { pdfPreviews } from '../../src/lib/library/previews';
import { activeCount, countText, facetCounts, filterItems, filtersFromQuery, fold, NO_FILTERS, PAGE_SIZE, queryFromFilters, shownCount, sortFacets, type LibraryFilters } from '../../src/lib/library/filter';
import { subtopicRefs } from '../../src/lib/pathways';

const ROOT = new URL('../../', import.meta.url).pathname;
const cat = buildCatalogue(libraryInput());
const facets = cat.items.map(facetsOf);
const subs = subtopicRefs(c);
const byId = (id: string) => {
  const it = cat.items.find((x) => x.id === id);
  if (!it) throw new Error(`no item ${id}`);
  return it;
};

/** The ids each download endpoint in src/pages/downloads/ builds a file for. */
const ENDPOINTS: Array<{ source: string; pattern: RegExp; ids: string[] }> = [
  { source: 'src/pages/downloads/glossary.csv.ts', pattern: /^\/downloads\/(glossary)\.csv$/, ids: ['glossary'] },
  { source: 'src/pages/downloads/topic-checklists.csv.ts', pattern: /^\/downloads\/(topic-checklists)\.csv$/, ids: ['topic-checklists'] },
  { source: 'src/pages/downloads/mindmaps/enrichment/[id].svg.ts', pattern: /^\/downloads\/mindmaps\/enrichment\/([a-z0-9-]+)\.svg$/, ids: Object.keys(c.enrichmentMaps) },
  { source: 'src/pages/downloads/mindmaps/[id].svg.ts', pattern: /^\/downloads\/mindmaps\/([a-z0-9-]+)\.svg$/, ids: Object.keys(c.mindmaps) },
  { source: 'src/pages/downloads/diagrams/[id].svg.ts', pattern: /^\/downloads\/diagrams\/([a-z0-9-]+)\.svg$/, ids: Object.keys(DIAGRAMS) },
];

describe('the downloads', () => {
  const downloads = catalogueDownloads(cat);

  it('are offered for every real file: the four guides, both spreadsheets and every map and diagram', () => {
    const hrefs = downloads.map((d) => d.href);
    expect(hrefs.filter((h) => h.endsWith('.pdf'))).toHaveLength(4);
    expect(hrefs).toContain('/downloads/glossary.csv');
    expect(hrefs).toContain('/downloads/topic-checklists.csv');
    expect(hrefs.filter((h) => /^\/downloads\/mindmaps\/[a-z0-9-]+\.svg$/.test(h))).toHaveLength(Object.keys(c.mindmaps).length);
    expect(hrefs.filter((h) => h.startsWith('/downloads/mindmaps/enrichment/'))).toHaveLength(Object.keys(c.enrichmentMaps).length);
    expect(hrefs.filter((h) => h.startsWith('/downloads/diagrams/'))).toHaveLength(Object.keys(DIAGRAMS).length);
    expect(cat.downloads).toBe(downloads.length);
  });

  it('each exist: a file in public/, or a file the build writes from an endpoint that lists it', () => {
    for (const d of downloads) {
      const file = d.file!;
      if (file.origin === 'public') {
        expect(existsSync(join(ROOT, 'public', d.href)), d.href).toBe(true);
        expect(ENDPOINTS.some((e) => e.pattern.test(d.href)), `${d.href} is not also written by the build`).toBe(false);
      } else {
        const ep = ENDPOINTS.find((e) => e.pattern.test(d.href));
        expect(ep, `${d.href} has an endpoint`).toBeDefined();
        expect(existsSync(join(ROOT, ep!.source)), ep!.source).toBe(true);
        expect(ep!.ids, d.href).toContain(ep!.pattern.exec(d.href)![1]);
        expect(writtenFile(d.href, { c })?.length ?? 0, d.href).toBeGreaterThan(100);
      }
    }
  });

  it('carry their format, size and pages, measured from the file itself', () => {
    for (const d of downloads) {
      const f = d.file!;
      const bytes = f.origin === 'public' ? readFileSync(join(ROOT, 'public', d.href)).length : Buffer.byteLength(writtenFile(d.href, { c })!, 'utf8');
      expect(f.bytes, d.href).toBe(bytes);
      expect(f.format).toBe(d.href.split('.').pop()!.toUpperCase());
      if (f.format === 'PDF') {
        expect(f.pages, d.href).toBe(pdfPages(readFileSync(join(ROOT, 'public', d.href))));
        expect(f.pages).toBe(5);
        expect(linkFacts(d)).toMatch(/^PDF, 5 pages, 1\.\d MB$/);
      }
      if (f.format === 'SVG') expect(f.width && f.height, d.href).toBeGreaterThan(0);
    }
  });

  it('are refused when the file does not exist, which fails the build', () => {
    expect(fileFacts('/downloads/guides/no-such-guide.pdf', { c })).toBeNull();
    expect(fileFacts('/downloads/mindmaps/no-such-map.svg', { c })).toBeNull();
    expect(fileFacts('/downloads/diagrams/no-such-diagram.svg', { c })).toBeNull();
    const input = libraryInput();
    const first = input.curated[0]!;
    input.curated = [...input.curated, { id: 'ghost', data: { ...first.data, title: 'A ghost', access: { kind: 'download', href: '/downloads/guides/ghost.pdf' } } }];
    expect(() => buildCatalogue(input)).toThrow(/ghost.*does not exist/);
  });

  it('format their sizes as a file manager would', () => {
    expect(formatBytes(712)).toBe('712 bytes');
    expect(formatBytes(6_762)).toBe('7 KB');
    expect(formatBytes(1_049_088)).toBe('1.0 MB');
    expect(factsLine({ format: 'CSV', bytes: 471_653 })).toBe('CSV, 472 KB');
    expect(svgSize('<svg xmlns="x" width="720.5" height="400">')).toEqual({ width: 721, height: 400 });
  });
});

describe('the categories', () => {
  it('are the twelve of the brief, in its order', () => {
    expect(cat.categories.map((x) => x.title)).toEqual([
      'Topic notes',
      'Revision briefs',
      'Mindmaps',
      'Infographics and diagrams',
      'Formula sheets',
      'Assessment guides',
      'Practice questions',
      'Case studies',
      'Framework guides',
      'Teacher resources',
      'Lesson presentations',
      'Enrichment',
    ]);
  });

  it('each count exactly the items filed under them, and the total is their sum', () => {
    for (const k of cat.categories) expect(k.count, k.id).toBe(cat.items.filter((it) => it.category === k.id).length);
    expect(cat.total).toBe(cat.items.length);
    expect(cat.categories.reduce((n, k) => n + k.count, 0)).toBe(cat.total);
    for (const k of cat.categories.filter((x) => x.id !== 'presentations')) expect(k.count, k.id).toBeGreaterThan(0);
  });

  it('count what the content holds: a map for every subtopic and unit, every diagram, every framework and a checklist per subtopic', () => {
    const count = (id: string) => cat.categories.find((k) => k.id === id)!.count;
    expect(count('mindmaps')).toBe(Object.keys(c.mindmaps).length);
    expect(count('diagrams')).toBe(Object.keys(DIAGRAMS).length);
    expect(count('notes')).toBe(Object.keys(c.notes).length + Object.keys(c.topics).length);
    expect(cat.items.filter((it) => it.kind === 'Topic checklist')).toHaveLength(subs.length);
    expect(cat.items.filter((it) => it.kind === 'Case file')).toHaveLength(Object.keys(c.cases).length);
  });

  it('label lesson presentations "Not yet available" and never count anything there', () => {
    const p = cat.categories.find((k) => k.id === 'presentations')!;
    expect(p.available).toBe(false);
    expect(p.count).toBe(0);
    expect(p.missing?.note).toMatch(/^Not yet available\./);
    expect(cat.items.some((it) => it.category === 'presentations')).toBe(false);
    // Even a curated entry filed there is left out of the items and the total.
    const input = libraryInput();
    const first = input.curated.find((x) => x.data.access.kind === 'page')!;
    input.curated = [...input.curated, { id: 'slides', data: { ...first.data, title: 'Slides', category: 'presentations' } }];
    const withSlides = buildCatalogue(input);
    expect(withSlides.total).toBe(cat.total);
    expect(withSlides.items.some((it) => it.id === 'slides')).toBe(false);
    expect(withSlides.categories.find((k) => k.id === 'presentations')!.count).toBe(0);
  });

  it('have no item twice, and every item names only real subtopics', () => {
    expect(new Set(cat.items.map((it) => it.id)).size).toBe(cat.items.length);
    const codes = new Set(subs.map((s) => s.code));
    for (const it of cat.items) for (const s of it.subtopics) expect(codes.has(s), `${it.id}: ${s}`).toBe(true);
    for (const it of cat.items) expect(LIBRARY_CATEGORIES).toContain(it.category);
  });
});

describe('the items', () => {
  it('carry their level: HL-only material is marked, and mixed notes say HL parts are marked', () => {
    const hl = subs.filter((s) => s.level === 'HL');
    for (const s of hl) {
      const notes = cat.items.find((it) => it.id === `notes-${s.slug}`);
      if (notes) expect(notes.level, s.code).toBe('HL');
      expect(byId(`checklist-${s.slug}`).level, s.code).toBe('HL');
    }
    const mixed = subs.find((s) => s.level === 'SL/HL with HL-only content')!;
    expect(byId(`checklist-${mixed.slug}`).level).toBe('mixed');
  });

  it('mark what goes beyond the course, what is fictional and what is for teachers', () => {
    for (const it of cat.items.filter((x) => x.category === 'enrichment')) {
      expect(it.scope, it.id).toBe('enrichment');
      expect(it.standing, it.id).toBe('enrichment');
    }
    for (const it of cat.items.filter((x) => x.kind === 'Case file' || x.kind === 'Decision Room')) expect(it.standing, it.id).toBe('fictional');
    expect(byId('intelligence').standing).toBe('real-world');
    for (const it of cat.items.filter((x) => x.category === 'teaching' && !x.curated)) {
      expect(it.audiences, it.id).toEqual(['teachers']);
      expect(it.standing, it.id).toBe('teacher');
    }
    expect(cat.items.filter((x) => x.kind === 'Enrichment diagram').every((x) => x.scope === 'enrichment')).toBe(true);
  });

  it('preview what they hold: the real map, the real diagram, the first page of each guide, the sections of the notes', () => {
    const map = byId(`mindmap-${Object.keys(c.mindmaps)[0]}`);
    expect(map.preview).toMatchObject({ kind: 'image', src: map.more[0]!.href });
    const dg = byId(`diagram-${Object.keys(DIAGRAMS)[0]}`);
    expect(dg.preview).toMatchObject({ kind: 'image', src: dg.more[0]!.href });
    const previews = pdfPreviews();
    for (const g of cat.items.filter((it) => it.primary.format === 'pdf')) {
      expect(g.preview.kind, g.id).toBe('image');
      expect(previews[g.primary.href], g.id).toBeDefined();
      for (const f of previews[g.primary.href]!.files) expect(existsSync(join(ROOT, 'public', f)), f).toBe(true);
    }
    const n = Object.entries(c.notes)[0]![1];
    const s = subs.find((x) => x.code === n.code)!;
    expect(byId(`notes-${s.slug}`).preview).toMatchObject({ kind: 'contents', total: n.sections.length });
    // Every image preview is a file the library offers or a committed first-page image: no generated covers.
    for (const it of cat.items) {
      if (it.preview.kind !== 'image') continue;
      const own = [it.primary, ...it.more].some((l) => l.href === (it.preview as { src: string }).src);
      expect(own || (it.preview as { src: string }).src.startsWith('/images/resources/'), it.id).toBe(true);
    }
  });

  it('link the details page of each curated download, and open every other item where it lives', () => {
    expect(byId('guide-paper-1').details).toBe('/resources/guide-paper-1/');
    expect(byId('formula-sheet').details).toBeUndefined();
    for (const it of cat.items) expect(it.primary.href, it.id).toMatch(/^\/[a-z0-9/._#?=-]*$/);
  });
});

describe('the revision workstream’s addresses', () => {
  it('list the three revision briefs that exist until the new pages are built', () => {
    const rev = cat.items.filter((it) => it.category === 'revision' && !it.curated);
    expect(rev.map((it) => it.primary.href).sort()).toEqual(Object.keys(c.topics).map((id) => `/revision/${id}/`).sort());
    expect(cat.items.some((it) => it.primary.href === '/revision/flashcards/')).toBe(false);
  });

  it('list a sheet at /revision/<slug>/ for every subtopic, and the flashcards, once they are', () => {
    const merged = buildCatalogue(libraryInput({ sheets: 'every-subtopic', flashcards: true }));
    const sheets = merged.items.filter((it) => it.kind === 'Revision sheet');
    expect(sheets.map((it) => it.primary.href)).toEqual(subs.map((s) => `/revision/${s.slug}/`));
    expect(merged.items.find((it) => it.id === 'flashcards')?.primary.href).toBe('/revision/flashcards/');
    // The three revision briefs' addresses are subtopic addresses too, so no revision address is listed twice.
    const hrefs = merged.items.map((it) => it.primary.href).filter((h) => h.startsWith('/revision/'));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(merged.total).toBe(cat.total - Object.keys(c.topics).length + subs.length + 1);
  });
});

describe('finding things', () => {
  const all = sortFacets(facets, 'course');
  const run = (f: Partial<LibraryFilters>) => filterItems(all, { ...NO_FILTERS, ...f });

  it('searches every word, without accents, in titles, contents and section titles', () => {
    expect(run({ q: 'break-even' }).length).toBeGreaterThan(5);
    expect(run({ q: 'break-even chart' }).every((f) => f.text.includes('break-even') && f.text.includes('chart'))).toBe(true);
    expect(fold('Inês Carvalho')).toBe('ines carvalho');
    expect(run({ q: 'no such resource anywhere' })).toHaveLength(0);
  });

  it('filters by category, unit, subtopic, level, format, audience and scope', () => {
    expect(run({ category: 'mindmaps' })).toHaveLength(Object.keys(c.mindmaps).length);
    expect(run({ unit: '3' }).every((f) => f.units.includes(3))).toBe(true);
    expect(run({ subtopic: '5.5' }).some((f) => f.category === 'notes')).toBe(true);
    expect(run({ level: 'sl' }).some((f) => f.level === 'HL')).toBe(false);
    expect(run({ level: 'hl' }).every((f) => f.level === 'HL')).toBe(true);
    expect(run({ format: 'pdf' })).toHaveLength(4);
    expect(run({ format: 'csv' })).toHaveLength(2);
    expect(run({ audience: 'teachers', category: 'teaching' })).toHaveLength(cat.categories.find((k) => k.id === 'teaching')!.count);
    expect(run({ scope: 'enrichment' }).every((f) => f.scope === 'enrichment')).toBe(true);
  });

  it('counts what each choice would leave, given the others', () => {
    const counts = facetCounts(all, { ...NO_FILTERS, category: 'notes' }, 'unit', ['1', '2', '3', '4', '5']);
    for (const u of ['1', '2', '3', '4', '5']) expect(counts[u]).toBe(run({ category: 'notes', unit: u }).length);
    const byCat = facetCounts(all, NO_FILTERS, 'category', [...LIBRARY_CATEGORIES]);
    for (const k of cat.categories) expect(byCat[k.id], k.id).toBe(k.count);
  });

  it('keeps a selection in the address and reads it back, ignoring what the library does not offer', () => {
    const f: LibraryFilters = { ...NO_FILTERS, q: 'ratio', category: 'diagrams', level: 'hl', unit: '3' };
    const q = queryFromFilters(f, 'list', 'title');
    expect(q).toBe('?q=ratio&category=diagrams&unit=3&level=hl&sort=title&view=list');
    expect(filtersFromQuery(q, { subtopics: subs.map((s) => s.code) })).toEqual({ filters: f, view: 'list', sort: 'title' });
    expect(queryFromFilters(NO_FILTERS)).toBe('');
    const odd = filtersFromQuery('?category=slides&subtopic=9.9&format=docx&level=x&view=grid', { subtopics: ['5.5'] });
    expect(odd).toEqual({ filters: NO_FILTERS, view: 'cards', sort: 'course' });
    expect(activeCount({ ...NO_FILTERS, q: 'x', unit: '2', format: 'svg' })).toBe(2);
  });

  it('shows a few of each category, a page of a chosen one, and a page more each time', () => {
    expect(shownCount(90, 'cards', false, 0)).toBe(6);
    expect(shownCount(90, 'list', false, 0)).toBe(8);
    expect(shownCount(90, 'cards', true, 0)).toBe(PAGE_SIZE);
    expect(shownCount(90, 'cards', true, 1)).toBe(PAGE_SIZE * 2);
    expect(shownCount(90, 'cards', true, 9)).toBe(90);
    expect(shownCount(3, 'cards', false, 0)).toBe(3);
    expect(countText(cat.total, cat.total)).toBe(`All ${cat.total} resources`);
    expect(countText(12, cat.total)).toBe(`12 of ${cat.total} resources`);
  });

  it('lists formats an item really offers, and a printable page only where it prints', () => {
    const map = byId(`mindmap-${Object.keys(c.mindmaps)[0]}`);
    expect(itemFormats(map).sort()).toEqual(['page', 'print', 'svg']);
    const guide = byId('guide-paper-2');
    expect(itemFormats(guide)).toEqual(['pdf']);
  });
});

describe('the catalogue as the page shows it', () => {
  it('has a count in the lead that is the number of items, never typed', () => {
    const page = readFileSync(join(ROOT, 'src/pages/resources/index.astro'), 'utf8');
    expect(page).not.toMatch(/\b\d{2,} (resources|items|files)\b/);
    expect(page).toMatch(/cat\.total/);
  });

  it('gives every item a title, a summary and its kind', () => {
    for (const it of cat.items as LibraryItem[]) {
      expect(it.title.trim(), it.id).not.toBe('');
      expect(it.kind.trim(), it.id).not.toBe('');
      expect(it.summary, it.id).not.toMatch(/undefined|NaN|\[object Object\]/);
    }
    expect(Object.keys(CATEGORY_DEFS)).toEqual([...LIBRARY_CATEGORIES]);
  });
});
