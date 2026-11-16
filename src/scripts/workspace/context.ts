/**
 * What the workspace's parts share: the page's root, its configuration, the
 * latest view of what this browser keeps, a polite message, a confirmation
 * and a way to draw everything again. Built once by src/scripts/dashboard.ts.
 */
import type { WorkspaceConfig, WorkspaceView } from '../../lib/workspace';

export interface AskOptions {
  title: string;
  /** HTML, escaped by the caller. */
  body: string;
  confirm: string;
  choice?: boolean;
}

export interface Ctx {
  root: HTMLElement;
  cfg: WorkspaceConfig;
  /** The view drawn last. */
  view(): WorkspaceView;
  /** Announce a message in the workspace's polite live region. */
  say(text: string): void;
  ask(opts: AskOptions): Promise<{ ok: boolean; scope: string }>;
  /** Read storage again and draw every part. */
  refresh(): void;
}

/** Shorthand for an element inside the workspace. */
export const $in = <T extends HTMLElement>(root: HTMLElement, sel: string): T | null => root.querySelector<T>(sel);

export const n = (x: number): string => x.toLocaleString('en-GB');
export const plural = (x: number, one: string, many: string): string => `${n(x)} ${x === 1 ? one : many}`;
