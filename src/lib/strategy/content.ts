/**
 * The Strategy Studio's content for pages: the engagement and the tools in
 * order, loaded once per build and checked by src/lib/integrity-strategy.ts.
 * A broken reference or an invalid worked example stops the build.
 */
import { getCollection } from 'astro:content';
import { corpus } from '../content';
import { checkStudio } from '../integrity-strategy';
import type { StudioEngagement, StudioTool } from '../schemas-strategy';
import { STAGE_IDS, type Stage } from './common';

export interface Studio {
  engagement: StudioEngagement;
  tools: StudioTool[];
  /** Tools in the order of the engagement: by stage, then by order. */
  sequence: StudioTool[];
}

let loaded: Promise<Studio> | null = null;

export function studio(): Promise<Studio> {
  loaded ??= (async () => {
    const entries = await getCollection('studio');
    const c = await corpus();
    const problems = checkStudio(
      entries.map((e) => [e.id, e.data]),
      c,
    );
    if (problems.length) throw new Error(`Strategy Studio integrity check failed (${problems.length}):\n${problems.map((p) => `  ${p.where}: ${p.message}`).join('\n')}`);
    const engagement = entries.map((e) => e.data).find((d): d is StudioEngagement => d.type === 'engagement');
    if (!engagement) throw new Error('Strategy Studio: no engagement entry');
    const tools = entries
      .map((e) => e.data)
      .filter((d): d is StudioTool => d.type === 'tool')
      .sort((a, b) => a.order - b.order);
    const sequence = [...tools].sort((a, b) => STAGE_IDS.indexOf(a.stage) - STAGE_IDS.indexOf(b.stage) || a.order - b.order);
    return { engagement, tools, sequence };
  })();
  return loaded;
}

export const studioHref = (slug: string) => `/strategy-studio/${slug}/`;

export function toolsIn(s: Studio, stage: Stage): StudioTool[] {
  return s.sequence.filter((t) => t.stage === stage);
}

/** The words for a tool's standing in the IB course, for tags and tables. */
export function statusLabel(t: StudioTool): { text: string; level: string; css: string } {
  if (t.status.kind === 'ib-toolkit') return { text: 'IB toolkit tool', level: t.status.level === 'HL' ? 'HL only' : 'SL and HL', css: t.status.level === 'HL' ? 'tag--hl' : 'tag--sl' };
  return { text: 'Enrichment', level: 'Not in the guide', css: 'tag--enrichment' };
}
