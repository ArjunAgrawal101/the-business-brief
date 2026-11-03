/**
 * Every Strategy Studio tool's library behind one interface, for the pages
 * (server render of the worked example) and the integrity check (the example
 * must survive the tool's reader unchanged and pass its checks). The browser
 * scripts import only their own tool's library, so each page ships one.
 */
import type { StudioKind } from '../schemas-strategy';
import { deepEqual, firstDifference } from './common';
import * as ansoff from './ansoff';
import * as appraisal from './appraisal';
import * as bcg from './bcg';
import * as forces from './forces';
import * as forcefield from './forcefield';
import * as porter from './porter';
import * as stakeholders from './stakeholders';
import * as steeple from './steeple';
import * as swot from './swot';
import * as tree from './tree';

/** What every tool library provides. */
export interface ToolModule<S> {
  normalize(raw: unknown): S;
  blank(): S;
  editorHtml(s: S, uid: string): string;
  outputsHtml(s: S, uid: string): string;
  headline(s: S): string;
  toText(s: S): string;
  toCsvText(s: S): string;
  fileName(s: S): string;
  problems(s: S): string[];
}

export interface ToolView {
  editor: string;
  outputs: string;
  headline: string;
  text: string;
}

export interface ToolEntry {
  view(raw: unknown, uid: string): ToolView;
  headline(raw: unknown): string;
  /** Why the data is not a valid worked example: it changes when read back, or fails the tool's checks. */
  verify(raw: unknown): string[];
}

function entry<S>(m: ToolModule<S>): ToolEntry {
  return {
    view(raw, uid) {
      const s = m.normalize(raw);
      return { editor: m.editorHtml(s, uid), outputs: m.outputsHtml(s, uid), headline: m.headline(s), text: m.toText(s) };
    },
    headline: (raw) => m.headline(m.normalize(raw)),
    verify(raw) {
      const s = m.normalize(raw);
      const out: string[] = [];
      if (!deepEqual(s, raw)) out.push(`the example changes when read back by the tool, first at "${firstDifference(s, raw)}"`);
      out.push(...m.problems(s));
      return out;
    },
  };
}

export const TOOL_LIBS: Record<StudioKind, ToolEntry> = {
  swot: entry(swot),
  steeple: entry(steeple),
  'five-forces': entry(forces),
  ansoff: entry(ansoff),
  bcg: entry(bcg),
  porter: entry(porter),
  stakeholders: entry(stakeholders),
  'decision-tree': entry(tree),
  'force-field': entry(forcefield),
  appraisal: entry(appraisal),
};

export function lib(kind: StudioKind): ToolEntry {
  const l = TOOL_LIBS[kind];
  if (!l) throw new Error(`Strategy Studio: no library for the tool kind "${kind}"`);
  return l;
}
