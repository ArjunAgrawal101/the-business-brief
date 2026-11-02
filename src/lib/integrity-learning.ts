/**
 * Integrity checks for the 2.0 learning collections: the glossary, the
 * mindmaps and the topic notes. Every reference must resolve, every syllabus
 * code must exist, and HL-only material must be marked as HL, so that no page
 * can show a broken link or teach HL content as if it were for everyone.
 */
import type { Corpus, Problem } from './integrity';
import type { MindNode } from './schemas';

type Sub = { code: string; title: string; level: string; unit: number };

export function subtopicIndex(c: Corpus): Map<string, Sub> {
  const out = new Map<string, Sub>();
  for (const cur of Object.values(c.curricula)) {
    for (const u of cur.units) for (const s of u.subtopics) out.set(s.code, { code: s.code, title: s.title, level: s.level, unit: u.number });
  }
  return out;
}

/** Every node of a mindmap branch list, depth first. */
export function walk(nodes: MindNode[], visit: (n: MindNode, depth: number) => void, depth = 2): void {
  for (const n of nodes) {
    visit(n, depth);
    walk(n.children, visit, depth + 1);
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function checkLearning(c: Corpus): Problem[] {
  const out: Problem[] = [];
  const subs = subtopicIndex(c);
  const validCode = (code: string) => code === 'toolkit' || subs.has(code);
  const has = <T>(d: Record<string, T>, id: string) => Object.prototype.hasOwnProperty.call(d, id);

  /* ---------- Glossary ---------- */
  const names = new Map<string, string>();
  for (const [id, g] of Object.entries(c.glossary)) {
    const w = `glossary/${id}`;
    const add = (message: string) => out.push({ where: w, message });
    if (!g.topics.length && !g.subtopics.length) add('names no topic and no subtopic');
    g.subtopics.forEach((code) => validCode(code) || add(`subtopic "${code}" is not in the IB course`));
    g.related.forEach((r) => {
      if (r === id) add('lists itself as related');
    });
    for (const n of [g.term, ...g.aliases]) {
      const k = norm(n);
      const prev = names.get(k);
      if (prev && prev !== id) add(`"${n}" is also the name of ${prev}`);
      names.set(k, id);
    }
    const levels = g.subtopics.filter((code) => code !== 'toolkit').map((code) => subs.get(code)?.level);
    if (levels.length && levels.every((l) => l === 'HL') && g.level !== 'HL') add('every subtopic it belongs to is HL only, so the term must be marked HL');
  }

  /* ---------- Mindmaps ---------- */
  const seen = new Map<string, string>();
  for (const [id, m] of Object.entries(c.mindmaps)) {
    const w = `mindmaps/${id}`;
    const add = (message: string) => out.push({ where: w, message });
    const key = `${m.scope}:${m.code}`;
    if (seen.has(key)) add(`a second map for ${m.code} (also ${seen.get(key)})`);
    seen.set(key, id);
    if (m.scope === 'subtopic') {
      const s = subs.get(m.code);
      if (!s) add(`code "${m.code}" is not a subtopic`);
      else {
        if (s.unit !== m.unit) add(`unit ${m.unit} does not match subtopic ${m.code}, which is in unit ${s.unit}`);
        if (s.level === 'HL' && m.level !== 'HL') add('the subtopic is HL only, so the map must be marked HL');
        if (s.level !== 'HL' && m.level === 'HL') add('the subtopic is not HL only, so the map cannot be marked HL');
      }
    } else if (m.code !== `unit-${m.unit}`) add(`a unit map's code must be "unit-${m.unit}"`);
    m.connections.forEach((x) => subs.has(x.code) || add(`connection to "${x.code}", which is not a subtopic`));
    m.basis.forEach((b) => has(c.sources, b.source) || add(`basis source "${b.source}" is not in the sources register`));
    let count = 0;
    m.branches.forEach((b, i) => {
      const bw = `branch ${i + 1} ("${b.label}")`;
      if (m.scope === 'subtopic' && b.children.length < 2) add(`${bw} has fewer than two nodes`);
      if (!b.children.some((n) => n.core)) add(`${bw} has nothing in the revision view: mark its essentials core: true`);
      walk(b.children, (n) => {
        count += 1;
        if (n.term && !has(c.glossary, n.term)) add(`${bw}: node "${n.label}" names glossary term "${n.term}", which does not exist`);
        if (n.kind === 'formula' && !n.formula) add(`${bw}: formula node "${n.label}" has no formula`);
      });
    });
    if (m.scope === 'subtopic' && count < 16) add(`only ${count} nodes: a subtopic map needs enough detail to revise from (at least 16)`);
  }

  /* ---------- Notes ---------- */
  const noteFor = new Map<string, string>();
  for (const [id, n] of Object.entries(c.notes)) {
    const w = `notes/${id}`;
    const add = (message: string) => out.push({ where: w, message });
    const s = subs.get(n.code);
    if (!s) add(`code "${n.code}" is not a subtopic`);
    else {
      if (s.title !== n.title) add(`title "${n.title}" differs from the guide's subtopic title "${s.title}"`);
      if (s.level === 'HL' && n.level !== 'HL') add('the subtopic is HL only, so the notes must be marked HL');
    }
    if (noteFor.has(n.code)) add(`a second set of notes for ${n.code} (also ${noteFor.get(n.code)})`);
    noteFor.set(n.code, id);
    n.terms.forEach((t) => has(c.glossary, t) || add(`glossary term "${t}" does not exist`));
    n.questions.forEach((q) => has(c.questions, q) || add(`question "${q}" does not exist`));
    n.connections.forEach((x) => subs.has(x.code) || add(`connection to "${x.code}", which is not a subtopic`));
    n.basis.forEach((b) => has(c.sources, b.source) || add(`basis source "${b.source}" is not in the sources register`));
    const ids = n.sections.map((x) => x.id);
    ids.filter((x, i) => ids.indexOf(x) !== i).forEach((d) => add(`section id "${d}" appears twice`));
  }

  return out;
}
