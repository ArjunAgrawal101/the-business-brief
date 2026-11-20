/**
 * The Business Scenario Generator's families, and the catalogue the page
 * filters by unit, subtopic and tool. Pure: the same module runs at build
 * time and in the browser.
 */
import { build, generate, MAX_SEED, parseCode } from './engine';
import { TOOLKIT } from './kit';
import { UNIT1 } from './families/unit1';
import { UNIT2 } from './families/unit2';
import { UNIT3 } from './families/unit3';
import type { Family, Scenario } from './types';

export const FAMILIES: Family[] = [...UNIT1, ...UNIT2, ...UNIT3];

export { UNITS } from './types';

/** The scenario every page opens on, and the one shown without JavaScript. */
export const DEFAULT_CODE = `${FAMILIES[0]!.id}-1`;

export const scenarioFor = (code: string): Scenario | null => generate(code, FAMILIES);
export const familyById = (id: string) => FAMILIES.find((f) => f.id === id);
export const codeOf = (f: Family, seed: number) => `${f.id}-${seed}`;
export { build, parseCode, MAX_SEED };

export interface Filters {
  unit?: string;
  subtopic?: string;
  tool?: string;
}

export function matches(f: Family, flt: Filters): boolean {
  if (flt.unit && String(f.unit) !== flt.unit) return false;
  if (flt.subtopic && !f.subtopics.includes(flt.subtopic)) return false;
  if (flt.tool && f.tool !== flt.tool) return false;
  return true;
}

export function filtered(flt: Filters): Family[] {
  return FAMILIES.filter((f) => matches(f, flt));
}

/** The subtopics and tools the families use, in course order, for the filters. */
export function facets(): { subtopics: string[]; tools: string[] } {
  const key = (c: string) => {
    const [a, b] = c.split('.').map(Number);
    return (a ?? 0) * 100 + (b ?? 0);
  };
  const subtopics = [...new Set(FAMILIES.flatMap((f) => f.subtopics))].sort((a, b) => key(a) - key(b));
  const order = Object.keys(TOOLKIT);
  const tools = [...new Set(FAMILIES.map((f) => f.tool))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return { subtopics, tools };
}

/** Read the filters from an address's query, keeping only values the catalogue knows. */
export function readFilters(q: URLSearchParams): Filters {
  const { subtopics, tools } = facets();
  const unit = q.get('unit') ?? '';
  const subtopic = q.get('subtopic') ?? '';
  const tool = q.get('tool') ?? '';
  return {
    unit: ['1', '2', '3', '4', '5'].includes(unit) ? unit : undefined,
    subtopic: subtopics.includes(subtopic) ? subtopic : undefined,
    tool: tools.includes(tool) ? tool : undefined,
  };
}
