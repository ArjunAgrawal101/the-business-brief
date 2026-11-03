/**
 * The working tools of People and Culture and the Operations Floor: which
 * interactions are tools with pages of their own, in what order, and where
 * they live. The room pages, the tool pages and the integrity checks all read
 * this, so a tool appears everywhere once its YAML file exists.
 */
import type { Corpus } from './integrity';
import type { Interactive } from './schemas';
import type { RoomToolGuide } from './schemas-room-tools';

export type RoomTool = Extract<Interactive, { guide: RoomToolGuide }>;
export type RoomId = RoomToolGuide['room'];

export const ROOM_INFO: Record<RoomId, { module: string; name: string; href: string; prefix: 'people' | 'ops' }> = {
  people: { module: 'people-and-culture', name: 'People and Culture', href: '/people-and-culture/', prefix: 'people' },
  operations: { module: 'operations-floor', name: 'Operations Floor', href: '/operations-floor/', prefix: 'ops' },
};

export const STATUS_LABEL: Record<RoomToolGuide['status'], string> = {
  'SL/HL': 'SL and HL',
  HL: 'HL only',
  enrichment: 'Enrichment, beyond the syllabus',
};

/**
 * Is this interaction one of the People and Culture or Operations Floor tools?
 * Other rooms' instruments (the Market Studio's) also carry a guide, so the
 * guide must name one of these rooms.
 */
export function isRoomTool(it: Interactive): it is RoomTool {
  if (!('guide' in it)) return false;
  const guide = (it as { guide?: unknown }).guide;
  if (typeof guide !== 'object' || guide === null || !('room' in guide)) return false;
  const room = (guide as { room: unknown }).room;
  return typeof room === 'string' && room in ROOM_INFO;
}

/** The tools of one room, in their order. */
export function roomTools(c: Pick<Corpus, 'interactives'>, room: RoomId): Array<[string, RoomTool]> {
  return Object.entries(c.interactives)
    .filter((e): e is [string, RoomTool] => isRoomTool(e[1]) && e[1].guide.room === room)
    .sort((a, b) => a[1].guide.order - b[1].guide.order);
}

export function toolHref(t: Pick<RoomTool, 'guide'>): string {
  return `${ROOM_INFO[t.guide.room].href}${t.guide.slug}/`;
}

/** The anchor of the tool on its page, which search and the subtopic pages link to. */
export const toolAnchor = (id: string): string => `ix-${id}`;

/** How each kind of tool uses the shared page frame: its script's data-ix name and its downloads. */
export interface ToolFrame {
  ix: string;
  csv?: boolean;
  open?: boolean;
  /** What the downloads contain, for the button labels. */
  what?: string;
  /** Show the SL and HL switch, for tools with HL-only parts. */
  levelSwitch?: boolean;
  /** The reset button's label, when it is not a return to a worked example. */
  reset?: string;
}

export const TOOL_FRAME: Record<RoomTool['component'], ToolFrame> = {
  'org-chart-builder': { ix: 'org-chart', csv: true, open: true, what: 'the chart' },
  'workforce-planner': { ix: 'workforce-planner', csv: true, open: true, what: 'the plan', levelSwitch: true },
  'motivation-analysis': { ix: 'motivation-analysis', csv: true, open: true, what: 'the analysis', levelSwitch: true },
  'change-planner': { ix: 'change-planner', csv: true, open: true, what: 'the plan', levelSwitch: true },
  'scenario-chooser': { ix: 'scenario-chooser', csv: true, open: true, what: 'your choices', reset: 'Clear my choices' },
  'capacity-calculator': { ix: 'capacity-calculator', csv: true, open: true, what: 'the figures' },
  'stock-simulator': { ix: 'stock-simulator', csv: true, open: true, what: 'the plan' },
  'eoq-calculator': { ix: 'eoq-calculator', csv: true, open: true, what: 'the figures' },
  'location-assessment': { ix: 'location-assessment', csv: true, open: true, what: 'the assessment' },
};
