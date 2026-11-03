/**
 * The search index: one entry for everything a reader might look for,
 * built from the content itself, so a new subtopic, note, term, formula,
 * case, question or diagram is found without anyone listing it. Every link
 * in the site's navigation (src/lib/navigation.ts) is indexed as well, so a
 * new room or tool is searchable as soon as it is in the menu.
 *
 * The builder takes the content and the address helpers as arguments rather
 * than importing them, so it runs in the unit tests without Astro.
 */
import type { Corpus } from './integrity';
import type { NavGroup } from './navigation';
import type { SearchEntry, SearchKind } from './search';
import { normalize } from './search';

export interface SearchLinks {
  subtopic(code: string): string;
  topic(id: string): string;
  case(id: string): string;
  decision(id: string): string;
  /** A tool's guide, or its entry in the toolkit when the guide is planned. */
  toolEntry(id: string): string;
  question(id: string): string;
  glossary(id: string): string;
  mindmap(id: string): string;
  commandTerm(term: string): string;
  concept(id: string): string;
  revision(id: string): string;
  calculation(id: string, page: string): string;
  pathway(id: string): string;
}

export interface IndexInput {
  c: Corpus;
  nav: readonly NavGroup[];
  links: SearchLinks;
  /** The rooms (data/modules.yaml), with the pages each one lists. */
  modules?: ReadonlyArray<{ name: string; purpose: string; href?: string; items: ReadonlyArray<{ kind: string; title: string; href: string; text: string; level?: string }> }>;
  /** The curated part of the Resources Library. */
  library?: ReadonlyArray<{ title: string; summary: string; typeLabel: string; level: string; units: number[]; subtopics: string[]; href: string }>;
  diagrams?: Readonly<Record<string, { title: string; caption?: string; syllabus: string[]; level: string; group: string }>>;
  pathways?: ReadonlyArray<{ id: string; name: string; promise: string }>;
}

/** Pages that are not content and not in the menu, written out once. */
const STATIC_PAGES: Array<{ kind: SearchKind; type: string; url: string; title: string; text: string; hl?: boolean }> = [
  { kind: 'pages', type: 'Assessment', url: '/assessment/internal-assessment/', title: 'Internal assessment: the business research project', text: 'The research question, the key concept, supporting documents, the criteria, word count and submission, with tools for each part.' },
  { kind: 'pages', type: 'Assessment', url: '/assessment/paper-1/', title: 'Paper 1: the case study paper', text: 'The pre-released statement, Section A and Section B, command terms and application to the case, with practice.' },
  { kind: 'pages', type: 'Assessment', url: '/assessment/paper-2/', title: 'Paper 2: the quantitative paper', text: 'Reading the stimulus, formulas, working and rounding, evaluation and constructions, with an answer builder.' },
  { kind: 'pages', type: 'Assessment', url: '/assessment/paper-3/', title: 'Paper 3: the Strategic Planning Centre (HL)', text: 'The social enterprise paper: the human need, the challenges and a plan of action marked on criteria A to D.', hl: true },
  { kind: 'tools', type: 'Calculator', url: '/finance-desk/costs-and-revenue/', title: 'Costs and revenue', text: 'Classify costs by behaviour and traceability, then calculate revenue, total cost and profit.' },
  { kind: 'tools', type: 'Calculator', url: '/finance-desk/break-even/', title: 'Break-even workspace', text: 'A live break-even chart with margin of safety and target profit, every calculation worked in full.' },
  { kind: 'tools', type: 'Calculator', url: '/finance-desk/contribution/', title: 'Contribution decisions', text: 'Judge a special order on contribution, and see when the rule fails because the order displaces regular sales.' },
  { kind: 'tools', type: 'Calculator', url: '/finance-desk/cash-flow/', title: 'Cash flow forecast', text: 'A six-month forecast in the IB layout: the month the cash runs out, why profit is not cash, ways to pay for a kiln.' },
  { kind: 'tools', type: 'Calculator', url: '/finance-desk/ratios/', title: 'Ratio analysis', text: 'Profitability, liquidity and (HL) efficiency ratios from two years of accounts, with every working shown.' },
  { kind: 'tools', type: 'Calculator', url: '/finance-desk/investment-appraisal/', title: 'Investment appraisal', text: 'Payback period, average rate of return and (HL) net present value on two projects you can change.' },
  { kind: 'tools', type: 'Planner', url: '/ia-studio/', title: 'IA Studio planner', text: 'The internal assessment as the guide sets it out, with a ten-step planner that checks your supporting documents.' },
  { kind: 'resources', type: 'Printable sheet', url: '/resources/formula-sheet/', title: 'Formula sheet', text: 'Every formula on one printable page: the ones the examination provides and the ones to learn.' },
  { kind: 'pages', type: 'Course', url: '/ib/', title: 'IB DP Business Management: the course', text: 'The course unit by unit: subtopics, content statements, depth of teaching, SL and HL, teaching hours.' },
  { kind: 'pages', type: 'Course', url: '/ib/coverage/', title: 'Coverage tracker', text: 'What the platform has for each subtopic: complete, partly built or planned, and verified against the guide.' },
  { kind: 'pages', type: 'Platform', url: '/rooms/', title: 'All rooms', text: 'Every room of the platform, what each is for and what works in it now.' },
  { kind: 'pages', type: 'Platform', url: '/dashboard/', title: 'Your dashboard', text: 'What you have read, practised and saved here, kept on this device only.' },
  { kind: 'pages', type: 'Platform', url: '/platform/', title: 'The platform', text: 'How the platform is organized: its modules, learning architecture, interactions and content governance.' },
  { kind: 'pages', type: 'Platform', url: '/accessibility/', title: 'Accessibility', text: 'The accessibility standard the platform aims for, how it was tested, and the known limits.' },
  { kind: 'pages', type: 'Platform', url: '/privacy/', title: 'Privacy', text: 'No accounts, no analytics, no cookies: what is kept on your device, and how to clear it.' },
];

const PAPER_LABELS: Record<string, string> = { 'paper-1': 'Paper 1 style', 'paper-2': 'Paper 2 style', 'paper-3': 'Paper 3 style', 'ia-skill': 'IA skill', general: 'Practice' };

/** Markdown-light text as plain words (the platform's markdown is small: links, bold, italic, code). */
function plain(text: string | undefined): string {
  return (text ?? '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** At most `max` characters, cut at a word, with an ellipsis when cut. */
export function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.]+$/, '')}…`;
}

const unitOf = (code: string) => (code === 'toolkit' ? 'toolkit' : (code.split('.')[0] ?? ''));
const unitsOf = (codes: readonly string[]) => [...new Set(codes.map(unitOf).filter(Boolean))];
const codeKey = (code: string) => {
  const [a, b] = code.split('.').map(Number);
  return (a ?? 0) * 100 + (b ?? 0);
};

/** The kind of a menu link, from its group and address. */
export function navKind(group: NavGroup['id'], href: string): SearchKind {
  if (group === 'tools') return 'tools';
  if (/^\/topics\/$/.test(href)) return 'subtopics';
  if (/^\/(frameworks|toolkit)\//.test(href)) return 'frameworks';
  if (/^\/(glossary|examiner-lens)\//.test(href)) return 'definitions';
  if (/^\/(cases|case-room|case-vault|decision-room|boardroom)\//.test(href)) return 'cases';
  if (/^\/exam-desk\/practice\/|question-bank/.test(href)) return 'questions';
  if (/^\/(resources|mindmaps|diagrams|revision)\//.test(href)) return 'resources';
  return 'pages';
}

export function buildSearchIndex(input: IndexInput): SearchEntry[] {
  const { c, links } = input;
  const out: SearchEntry[] = [];
  const keys = new Set<string>();
  const urls = new Set<string>();
  /** Adds an entry unless the same entry is there already; `global` also skips an address any entry has. */
  const add = (e: SearchEntry, global = false) => {
    const k = `${e.kind}|${e.url}|${e.title}`;
    if (keys.has(k) || (global && urls.has(e.url))) return;
    keys.add(k);
    urls.add(e.url);
    out.push({ ...e, text: clip(e.text, 170), keys: clip(e.keys, 240) });
  };
  const cur = c.curricula['ib-dp-bm'];
  const subtopics = (cur?.units ?? []).flatMap((u) => u.subtopics.map((s) => ({ u, s })));
  const topicCodes = (ids: readonly string[]) => ids.map((id) => c.topics[id]?.code).filter((x): x is string => Boolean(x));

  // Subtopics: one entry each, at the subtopic's own page.
  for (const { u, s } of subtopics) {
    const brief = s.topic && c.topics[s.topic]?.code === s.code ? c.topics[s.topic] : undefined;
    const note = Object.values(c.notes).find((n) => n.code === s.code);
    const status = brief ? 'Complete brief' : note ? 'Full notes' : 'Notes planned';
    add({
      kind: 'subtopics',
      type: `Subtopic · ${status}`,
      title: `${s.code} ${s.title}`,
      url: links.subtopic(s.code),
      text: brief ? brief.summary : s.content.map((x) => x.text).join('; '),
      keys: `${s.content.map((x) => x.text).join(' ')} ${brief?.decisionQuestion ?? ''} ${note ? plain(note.introduction) : ''}`,
      units: [String(u.number)],
      codes: [s.code],
      hl: s.level === 'HL',
    });
  }

  // Notes: the sections of every set of notes and every brief, in course order.
  for (const n of Object.values(c.notes).sort((a, b) => codeKey(a.code) - codeKey(b.code))) {
    const base = links.subtopic(n.code);
    for (const sec of n.sections)
      add({
        kind: 'notes',
        type: 'Notes',
        title: sec.title,
        url: `${base}#${sec.id}`,
        text: plain(sec.body),
        keys: [...sec.points.map((p) => p.term), ...sec.formulas.map((f) => f.name)].join(' '),
        units: [unitOf(n.code)],
        codes: [n.code],
        hl: sec.level === 'HL' || n.level === 'HL',
      });
  }
  for (const [id, t] of Object.entries(c.topics).sort((a, b) => codeKey(a[1].code) - codeKey(b[1].code)))
    for (const sec of t.sections)
      add({
        kind: 'notes',
        type: 'Brief',
        title: sec.title,
        url: `${links.topic(id)}#${sec.id}`,
        text: plain(sec.dek ?? t.summary),
        keys: t.title,
        units: [unitOf(t.code)],
        codes: [t.code],
        hl: t.level === 'HL',
      });

  // Definitions: the glossary, the command terms and the four concepts.
  for (const [id, g] of Object.entries(c.glossary).sort((a, b) => a[1].term.localeCompare(b[1].term, 'en', { sensitivity: 'base' })))
    add({
      kind: 'definitions',
      type: 'Glossary term',
      title: g.term,
      url: links.glossary(id),
      text: plain(g.definition),
      keys: `${g.aliases.join(' ')} ${g.formula ?? ''}`,
      units: unitsOf(g.subtopics),
      codes: g.subtopics.filter((x) => x !== 'toolkit'),
      hl: g.level === 'HL',
    });
  for (const ct of Object.values(c.commandTerms).sort((a, b) => a.order - b.order))
    add({ kind: 'definitions', type: `Command term · ${ct.ao}`, title: ct.term, url: links.commandTerm(ct.term), text: ct.definition, keys: plain(ct.guidance), units: [], codes: [], hl: false });
  for (const [id, k] of Object.entries(c.concepts).sort((a, b) => a[1].order - b[1].order))
    add({ kind: 'definitions', type: 'Key concept', title: k.name, url: links.concept(id), text: plain(k.summary), keys: k.questions.join(' '), units: [], codes: [], hl: false });

  // Formulas, by name: the calculators first, then the formulas in the notes, then the glossary's. One entry per name.
  const named = new Set<string>();
  const formula = (e: Omit<SearchEntry, 'kind'>) => {
    const n = normalize(e.title);
    if (named.has(n)) return;
    named.add(n);
    add({ kind: 'formulas', ...e });
  };
  for (const [id, k] of Object.entries(c.calculations).sort((a, b) => a[1].order - b[1].order)) {
    const codes = k.syllabus.map((x) => x.code);
    formula({ type: 'Formula · with a calculator', title: k.name, url: links.calculation(id, k.page), text: k.formula, keys: k.variables.map((v) => `${v.symbol} ${v.meaning}`).join(' '), units: unitsOf(codes), codes, hl: k.level === 'HL' });
  }
  for (const n of Object.values(c.notes).sort((a, b) => codeKey(a.code) - codeKey(b.code)))
    for (const sec of n.sections)
      for (const f of sec.formulas)
        formula({ type: 'Formula · in the notes', title: f.name, url: `${links.subtopic(n.code)}#${sec.id}`, text: f.expression, keys: plain(f.note), units: [unitOf(n.code)], codes: [n.code], hl: sec.level === 'HL' || n.level === 'HL' });
  for (const [id, g] of Object.entries(c.glossary).sort((a, b) => a[1].term.localeCompare(b[1].term)))
    if (g.formula) formula({ type: 'Formula · in the glossary', title: g.term, url: links.glossary(id), text: g.formula, keys: g.aliases.join(' '), units: unitsOf(g.subtopics), codes: g.subtopics.filter((x) => x !== 'toolkit'), hl: g.level === 'HL' });

  // Cases: the case files, the Decision Rooms and the case labs.
  for (const [id, cs] of Object.entries(c.cases).sort((a, b) => a[1].title.localeCompare(b[1].title))) {
    const codes = cs.syllabus?.length ? cs.syllabus : topicCodes(cs.topics);
    add({ kind: 'cases', type: cs.kind === 'fictional' ? 'Case file · fictional' : 'Case file', title: cs.title, url: links.case(id), text: cs.dek, keys: `${cs.organization.name} ${cs.organization.sector} ${cs.organization.location} ${cs.decision}`, units: unitsOf(codes), codes, hl: false });
  }
  for (const [id, d] of Object.entries(c.decisions).sort((a, b) => a[1].title.localeCompare(b[1].title))) {
    const cs = c.cases[d.case];
    const codes = cs?.syllabus?.length ? cs.syllabus : topicCodes(cs?.topics ?? []);
    add({ kind: 'cases', type: 'Decision Room', title: d.title, url: links.decision(id), text: d.dek, keys: `${d.role} ${d.objectives.join(' ')}`, units: unitsOf(codes), codes, hl: false });
  }
  for (const [id, it] of Object.entries(c.interactives))
    if (it.page && it.component === 'case-lab') add({ kind: 'cases', type: 'Case lab', title: it.title, url: `${it.page}#ix-${id}`, text: plain(it.purpose), keys: '', units: unitsOf(it.syllabus), codes: it.syllabus, hl: false });

  // Frameworks: the toolkit, tool by tool.
  for (const [id, t] of Object.entries(c.tools).sort((a, b) => a[1].order - b[1].order))
    add({
      kind: 'frameworks',
      type: t.status === 'complete' ? 'Toolkit guide' : 'Toolkit · guide planned',
      title: t.name,
      url: links.toolEntry(id),
      text: t.summary,
      keys: t.includes.join(' '),
      units: [...t.units.map(String), 'toolkit'],
      codes: [],
      hl: t.level === 'HL',
    });

  // Questions: the practice questions, then the exam-style questions in the notes.
  for (const [id, q] of Object.entries(c.questions).sort((a, b) => a[1].order - b[1].order))
    add({ kind: 'questions', type: `Practice question · ${PAPER_LABELS[q.paperStyle] ?? 'Practice'} · ${q.marks} marks`, title: q.title, url: links.question(id), text: `${q.commandTerm}. ${plain(q.prompt)}`, keys: q.skills.join(' '), units: unitsOf(q.syllabus), codes: q.syllabus, hl: q.level === 'HL' });
  for (const n of Object.values(c.notes).sort((a, b) => codeKey(a.code) - codeKey(b.code)))
    n.exam.forEach((q) => {
      const term = c.commandTerms[q.command]?.term ?? '';
      add({
        kind: 'questions',
        type: `Exam-style question · ${q.paper ? `Paper ${q.paper} style · ` : ''}${q.marks} ${q.marks === 1 ? 'mark' : 'marks'}`,
        title: clip(plain(q.q), 110),
        url: `${links.subtopic(n.code)}#nv-exam-h`,
        text: `${term ? `${term}. ` : ''}${n.code} ${n.title}`,
        keys: plain(q.q),
        units: [unitOf(n.code)],
        codes: [n.code],
        hl: q.level === 'HL' || n.level === 'HL',
      });
    });

  // Calculators and tools: every interaction placed on a page.
  for (const [id, it] of Object.entries(c.interactives))
    if (it.page && it.component !== 'case-lab') add({ kind: 'tools', type: 'Interaction', title: it.title, url: `${it.page}#ix-${id}`, text: plain(it.purpose), keys: it.component.replace(/-/g, ' '), units: unitsOf(it.syllabus), codes: it.syllabus, hl: false });

  // Resources: the curated library, the mindmaps, the diagrams and the revision briefs.
  for (const r of input.library ?? [])
    add({ kind: 'resources', type: r.typeLabel, title: r.title, url: r.href, text: r.summary, keys: r.subtopics.join(' '), units: r.units.map(String), codes: r.subtopics, hl: r.level === 'HL' });
  // In course order: each unit's own map, then its subtopics' maps.
  const mapOrder = (m: { unit: number; scope: string; code: string }) => m.unit * 1000 + (m.scope === 'unit' ? 0 : codeKey(m.code) % 100 + 1);
  for (const [id, m] of Object.entries(c.mindmaps).sort((a, b) => mapOrder(a[1]) - mapOrder(b[1])))
    add({
      kind: 'resources',
      type: 'Mindmap',
      title: m.scope === 'unit' ? `Unit ${m.unit}: ${m.title}` : `${m.code} ${m.title}`,
      url: links.mindmap(id),
      text: m.summary,
      keys: m.branches.map((b) => b.label).join(' '),
      units: [String(m.unit)],
      codes: m.scope === 'subtopic' ? [m.code] : [],
      hl: m.level === 'HL',
    });
  for (const [id, d] of Object.entries(input.diagrams ?? {}))
    add({ kind: 'resources', type: 'Diagram', title: d.title, url: `/diagrams/#diagram-${id}`, text: d.caption ?? '', keys: '', units: d.group === 'toolkit' ? ['toolkit', ...unitsOf(d.syllabus)] : unitsOf(d.syllabus), codes: d.syllabus.filter((x) => x !== 'toolkit'), hl: d.level === 'HL' });
  for (const [id, t] of Object.entries(c.topics).sort((a, b) => codeKey(a[1].code) - codeKey(b[1].code)))
    add({ kind: 'resources', type: 'Revision brief', title: `Revision brief: ${t.code} ${t.title}`, url: links.revision(id), text: 'The key points, the traps, the formulas and retrieval questions on one printable page.', keys: t.title, units: [unitOf(t.code)], codes: [t.code], hl: t.level === 'HL' });

  // Every link in the menu, then the rooms' own pages, the pathways and the other pages: each once.
  for (const g of input.nav)
    for (const l of g.links) add({ kind: navKind(g.id, l.href), type: g.label, title: l.label, url: l.href, text: l.text, keys: '', units: [], codes: [], hl: Boolean(l.hl) }, true);
  for (const m of input.modules ?? []) {
    if (m.href) add({ kind: 'pages', type: 'Room', title: m.name, url: m.href, text: m.purpose, keys: '', units: [], codes: [], hl: false }, true);
    for (const it of m.items) {
      const kind: SearchKind =
        it.kind === 'Case' || it.kind === 'Case lab' || it.kind === 'Decision Room'
          ? 'cases'
          : it.kind === 'Guide'
            ? 'frameworks'
            : it.kind === 'Brief'
              ? it.href.startsWith('/topics/')
                ? 'subtopics'
                : 'notes'
              : it.kind === 'Practice'
                ? 'questions'
                : it.kind === 'Calculation'
                  ? 'formulas'
                  : 'tools';
      add({ kind, type: `${it.kind} · ${m.name}`, title: it.title, url: it.href, text: it.text, keys: '', units: [], codes: [], hl: it.level === 'HL' }, true);
    }
  }
  for (const p of input.pathways ?? []) add({ kind: 'pages', type: 'Learning pathway', title: p.name, url: links.pathway(p.id), text: p.promise, keys: '', units: [], codes: [], hl: false }, true);
  for (const p of STATIC_PAGES) add({ kind: p.kind, type: p.type, title: p.title, url: p.url, text: p.text, keys: '', units: [], codes: [], hl: Boolean(p.hl) }, true);

  return out;
}
