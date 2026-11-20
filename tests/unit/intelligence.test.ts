/**
 * The Business Intelligence Briefing: every item validates against its schema
 * and passes the integrity check, every fact rests on a complete, dated
 * source, every one of the hub's twelve themes is covered, and the check
 * catches each kind of breach of the sourcing rules (a broken copy of a real
 * item is built for each).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { asCorpus, loadCorpus } from './helpers/corpus';
import { BRIEFING_BEGAN, EARLIEST_YEAR, checkIntelligence, factLists, linkTargets, quotations, type BriefingLibrary } from '../../src/lib/integrity-intelligence';
import { onOrBefore, uncoveredThemes } from '../../src/lib/briefing';
import { frameworkSchema } from '../../src/lib/framework-schema';
import { INTEL_THEMES, intelligenceSchema, type Intelligence } from '../../src/lib/schemas';

const DIR = new URL('../../src/content/intelligence/', import.meta.url).pathname;
const FRAMEWORKS = new URL('../../src/content/frameworks/', import.meta.url).pathname;
const STUDIO = new URL('../../src/content/studio/', import.meta.url).pathname;

const yamlFiles = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((x) => x.endsWith('.yaml')).sort() : []);

function loadBriefing(): Record<string, Intelligence> {
  const out: Record<string, Intelligence> = {};
  for (const f of yamlFiles(DIR)) {
    const r = intelligenceSchema.safeParse(parse(readFileSync(join(DIR, f), 'utf8')));
    if (!r.success) throw new Error(`intelligence/${f}: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    out[f.replace(/\.yaml$/, '')] = r.data;
  }
  return out;
}

/** The frameworks library and the Strategy Studio's tools, read as the build reads them. */
function loadLibrary(): BriefingLibrary {
  const frameworks = Object.fromEntries(
    yamlFiles(FRAMEWORKS).map((f) => {
      const r = frameworkSchema.safeParse(parse(readFileSync(join(FRAMEWORKS, f), 'utf8')));
      if (!r.success) throw new Error(`frameworks/${f}: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      return [f.replace(/\.yaml$/, ''), r.data];
    }),
  );
  const studio = yamlFiles(STUDIO)
    .map((f) => parse(readFileSync(join(STUDIO, f), 'utf8')) as { type?: string; slug?: string })
    .filter((d) => d.type === 'tool' && d.slug)
    .map((d) => d.slug as string);
  return { frameworks, studio };
}

const corpus = asCorpus(loadCorpus());
const items = loadBriefing();
const library = loadLibrary();
const messages = (list: Record<string, Intelligence>) => checkIntelligence(list, corpus, library).map((p) => `${p.where}: ${p.message}`);

/** A deep copy of the lead item, changed by `edit`, as the only item. */
function broken(edit: (it: Intelligence) => void): string[] {
  const [id, lead] = Object.entries(items).find(([, it]) => it.lead) ?? [];
  if (!id || !lead) throw new Error('no lead item');
  const copy = structuredClone(lead);
  edit(copy);
  return messages({ [id]: copy });
}

describe('the briefing', () => {
  it('publishes at least ten items', () => {
    expect(Object.keys(items).length).toBeGreaterThanOrEqual(10);
    expect(Object.keys(items).length).toBeLessThanOrEqual(30);
  });

  it('passes every integrity check', () => {
    expect(messages(items)).toEqual([]);
  });

  it('dates every source on or after the day the briefing began, and links every one with https', () => {
    for (const it of Object.values(items)) {
      for (const s of it.sources) {
        expect(s.accessed >= BRIEFING_BEGAN).toBe(true);
        expect(s.url.startsWith('https://')).toBe(true);
      }
    }
  });

  it('ties every fact to a complete, dated source that could report it', () => {
    for (const [id, it] of Object.entries(items)) {
      const byId = new Map(it.sources.map((s) => [s.id, s]));
      for (const [part, list] of factLists(it)) {
        list.forEach((f, i) => {
          const where = `${id} ${part} ${i + 1}`;
          expect(f.sources.length, where).toBeGreaterThan(0);
          const cited = f.sources.map((sid) => byId.get(sid));
          for (const s of cited) {
            expect(s, where).toBeDefined();
            if (!s) continue;
            expect(s.url, where).toMatch(/^https:\/\//);
            expect(s.publisher.trim(), where).not.toBe('');
            expect(s.title.trim(), where).not.toBe('');
            expect(s.accessed, where).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            // Dated, or saying why the page carries no date.
            expect(Boolean(s.published) !== Boolean(s.undated), where).toBe(true);
            expect(s.supports.length, where).toBeGreaterThan(0);
          }
          expect(
            cited.some((s) => s && onOrBefore(f.date, s.published ?? s.accessed)),
            `${where}: no source it cites is dated on or after ${f.date}`,
          ).toBe(true);
        });
      }
    }
  });

  it('covers every one of the twelve themes', () => {
    expect(uncoveredThemes(Object.values(items))).toEqual([]);
    for (const theme of INTEL_THEMES) expect(Object.values(items).some((it) => it.categories.includes(theme)), theme).toBe(true);
  });

  it('still covers every kind of development the first edition covered', () => {
    const kinds = new Set(Object.values(items).flatMap((it) => it.categories));
    for (const k of ['corporate-strategy', 'mergers-and-acquisitions', 'leadership', 'marketing', 'restructuring', 'financial-results', 'innovation', 'entrepreneurship', 'sustainability', 'global-trend']) {
      expect(kinds.has(k as Intelligence['categories'][number]), k).toBe(true);
    }
  });

  it(`keeps every development within ${EARLIEST_YEAR} to 2026`, () => {
    for (const it of Object.values(items)) expect(['2024', '2025', '2026']).toContain(it.date.slice(0, 4));
  });

  it('names the issuing organization as the publisher of a document read on a site that republishes it, and says where it was read', () => {
    // Investegate republishes the London Stock Exchange's regulatory announcements; PR Newswire and GlobeNewswire distribute releases.
    const republishers: Array<[RegExp, RegExp]> = [
      [/^https:\/\/www\.investegate\.co\.uk\//, /Investegate/],
      [/^https:\/\/www\.prnewswire\.com\//, /PR Newswire/],
    ];
    for (const [id, it] of Object.entries(items)) {
      for (const s of it.sources) {
        const where = `${id} ${s.id}`;
        expect(s.publisher, where).not.toMatch(/investegate|newswire/i);
        for (const [host, named] of republishers) if (host.test(s.url)) expect(s.note ?? '', where).toMatch(named);
      }
    }
  });

  it('marks every fact that rests only on undated pages as at the day they were read', () => {
    for (const [id, it] of Object.entries(items)) {
      const byId = new Map(it.sources.map((s) => [s.id, s]));
      for (const [part, list] of factLists(it)) {
        list.forEach((f, i) => {
          const cited = f.sources.map((sid) => byId.get(sid));
          if (cited.length && cited.every((s) => s && !s.published)) expect(f.asAt, `${id} ${part} ${i + 1}`).toBe(true);
        });
      }
    }
  });

  it('links every item to a toolkit tool, a framework or a platform tool, and keeps frameworks beyond the course labelled by the library', () => {
    for (const [id, it] of Object.entries(items)) {
      expect(it.concepts.tools.length + it.concepts.frameworks.length + it.concepts.apply.length, id).toBeGreaterThan(0);
      for (const f of it.concepts.frameworks) {
        const fw = library.frameworks[f.id];
        expect(fw, `${id} ${f.id}`).toBeDefined();
        expect(fw?.status, `${id} ${f.id}`).not.toBe('toolkit');
      }
    }
  });
});

describe('the briefing integrity check', () => {
  it('finds quotations and link targets', () => {
    expect(quotations('He said “not now” and "later".')).toEqual(['not now', 'later']);
    expect(linkTargets('See [cash flow](/topics/cash-flow/) and [the guide](https://example.org/a).')).toEqual(['/topics/cash-flow/', 'https://example.org/a']);
  });

  it('rejects a fact that cites a source the item does not list', () => {
    expect(broken((it) => it.happened[0]?.sources.push('nowhere')).join('\n')).toMatch(/cites source "nowhere", which the item does not list/);
  });

  it('rejects a source that supports nothing on the page', () => {
    expect(broken((it) => it.sources.push({ ...it.sources[0]!, id: 'spare' })).join('\n')).toMatch(/source "spare" supports nothing on the page/);
  });

  it('rejects a source with no publication date that does not say why', () => {
    expect(broken((it) => (it.sources = it.sources.map((s) => ({ ...s, published: undefined })))).join('\n')).toMatch(/has no publication date/);
  });

  it('rejects a source read before the briefing began, or before it was published', () => {
    expect(broken((it) => (it.sources[0]!.accessed = '2026-10-01')).join('\n')).toMatch(/before the briefing began/);
    expect(broken((it) => (it.sources[0]!.published = '2026-11-04')).join('\n')).toMatch(/before it was published/);
  });

  it('rejects an address that is not https', () => {
    expect(broken((it) => (it.sources[0]!.url = 'http://www.oracle.com/')).join('\n')).toMatch(/needs an https address/);
  });

  it('rejects business press presented as a primary source', () => {
    expect(broken((it) => (it.sources[0]!.kind = 'press')).join('\n')).toMatch(/cannot be a primary source/);
  });

  it('rejects an item whose own date is not the date of any fact', () => {
    expect(broken((it) => (it.date = '2026-06-11')).join('\n')).toMatch(/no fact under "what happened" carries the item's own date/);
  });

  it(`rejects a development from before ${EARLIEST_YEAR}, and a fact dated after the check`, () => {
    expect(broken((it) => (it.date = '2023-12-31')).join('\n')).toMatch(new RegExp(`from ${EARLIEST_YEAR} onwards`));
    expect(broken((it) => (it.happened[0]!.date = '2026-12-01')).join('\n')).toMatch(/after the item was checked/);
  });

  it('rejects a fact dated later than every source it cites', () => {
    const out = broken((it) => {
      const f = it.happened[it.happened.length - 1]!;
      const s = it.sources.find((x) => x.id === f.sources[0])!;
      f.date = '2026-11-02';
      f.sources = [s.id];
      s.published = '2026-06-10';
      s.accessed = '2026-11-03';
    }).join('\n');
    expect(out).toMatch(/is dated 2026-11-02, but every source it cites is dated before then/);
  });

  it('rejects facts out of date order', () => {
    expect(
      broken((it) => {
        it.happened.reverse();
        it.happened[0]!.date = '2026-06-10';
        it.happened[1]!.date = '2026-06-09';
      }).join('\n'),
    ).toMatch(/keep facts in date order/);
  });

  it('rejects background dated after the development, and background that cites an unlisted source', () => {
    const out = broken((it) => {
      it.background = [
        { date: '2026-06-30', asAt: false, text: 'A later fact filed as background.', sources: [it.sources[0]!.id] },
        { date: '2026-07-01', asAt: false, text: 'Another.', sources: ['nowhere'] },
      ];
    }).join('\n');
    expect(out).toMatch(/background 1 is dated 2026-06-30, after the development itself/);
    expect(out).toMatch(/background 2 cites source "nowhere"/);
  });

  it('rejects a fact marked as at a day its source was not read', () => {
    expect(broken((it) => (it.since[0]! = { ...it.since[0]!, asAt: true })).join('\n')).toMatch(/is marked as at/);
  });

  it('rejects a quotation longer than 25 words', () => {
    const long = `"${Array.from({ length: 26 }, (_, i) => `word${i}`).join(' ')}"`;
    expect(broken((it) => (it.context = `${it.context} ${long}`)).join('\n')).toMatch(/business context: a quotation of 26 words/);
    expect(broken((it) => (it.implications = `${it.implications} ${long}`)).join('\n')).toMatch(/implications: a quotation of 26 words/);
  });

  it('rejects links to pages that do not exist, and links without https', () => {
    expect(broken((it) => (it.implications = `${it.implications} [x](/topics/no-such-subtopic/)`)).join('\n')).toMatch(/does not lead to a page/);
    expect(broken((it) => (it.context = `${it.context} [x](http://example.org/)`)).join('\n')).toMatch(/must use https/);
    expect(broken((it) => (it.context = `${it.context} [x](/intelligence/themes/no-such-theme/)`)).join('\n')).toMatch(/does not lead to a page/);
  });

  it('accepts links to theme pages, frameworks, studio tools and other items', () => {
    const out = broken((it) => {
      it.context = `${it.context} [a](/intelligence/themes/business-failures/) [b](/frameworks/value-chain/) [c](/strategy-studio/swot/) [d](/finance-desk/lab/gearing-ratio/)`;
    }).join('\n');
    expect(out).not.toMatch(/does not lead to a page/);
  });

  it('rejects concepts, terms, tools and command terms that do not exist, and unmarked HL subtopics', () => {
    const out = broken((it) => {
      it.concepts.subtopics.push({ code: '9.9', note: 'x', level: 'SL/HL' }, { code: '5.8', note: 'x', level: 'SL/HL' });
      it.concepts.terms.push('no-such-term');
      it.concepts.tools.push({ id: 'no-such-tool', note: 'x' });
      it.question.command = 'ponder';
    }).join('\n');
    expect(out).toMatch(/subtopic "9.9" is not in the IB course/);
    expect(out).toMatch(/subtopic 5.8 is HL only/);
    expect(out).toMatch(/glossary term "no-such-term" does not exist/);
    expect(out).toMatch(/toolkit tool "no-such-tool" does not exist/);
    expect(out).toMatch(/command term "ponder" is not in the command term register/);
  });

  it('rejects frameworks missing from the library, and toolkit tools named as frameworks', () => {
    const out = broken((it) => {
      it.concepts.frameworks.push({ id: 'no-such-framework', note: 'x' }, { id: 'swot-analysis', note: 'x' });
    }).join('\n');
    expect(out).toMatch(/framework "no-such-framework" is not in the frameworks library/);
    expect(out).toMatch(/framework "swot-analysis" is an IB toolkit tool: name it under tools as "swot-analysis"/);
  });

  it('cannot pass frameworks without the library', () => {
    const [id, lead] = Object.entries(items).find(([, it]) => it.lead)!;
    const copy = structuredClone(lead);
    copy.concepts.frameworks = [{ id: 'value-chain', note: 'x' }];
    const out = checkIntelligence({ [id]: copy }, corpus).map((p) => `${p.where}: ${p.message}`);
    expect(out.join('\n')).toMatch(/framework "value-chain" cannot be checked: the frameworks library was not supplied/);
  });

  it('rejects platform tools that are not pages, and an item that links to no tool or framework', () => {
    expect(broken((it) => it.concepts.apply.push({ href: '/finance-desk/lab/no-such-calculator/', label: 'x', note: 'x' })).join('\n')).toMatch(/platform tool \/finance-desk\/lab\/no-such-calculator\/ is not a page/);
    expect(
      broken((it) => {
        it.concepts.tools = [];
        it.concepts.frameworks = [];
        it.concepts.apply = [];
      }).join('\n'),
    ).toMatch(/links to no toolkit tool, framework or platform tool/);
  });

  it('requires exactly one lead story', () => {
    const none = Object.fromEntries(Object.entries(items).map(([id, it]) => [id, { ...it, lead: false }]));
    expect(messages(none).join('\n')).toMatch(/exactly one item must be the lead story; found 0/);
  });

  it('requires every theme to be covered', () => {
    const [id, lead] = Object.entries(items).find(([, it]) => it.lead)!;
    const out = messages({ [id]: { ...lead, categories: ['financial-results'] } }).join('\n');
    expect(out).toMatch(/no item covers these themes: Corporate strategy, Mergers and acquisitions/);
    expect(out).toMatch(/Industry developments; every one of the twelve themes needs at least one item/);
    expect(messages(items).join('\n')).not.toMatch(/no item covers these themes/);
  });
});
