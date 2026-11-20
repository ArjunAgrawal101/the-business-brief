/**
 * Every file the platform offers as a download, and the facts a reader needs
 * before taking one: its format, its size and, for a PDF, its pages. A file is
 * either in public/ (the creator's four assessment guides) or written by the
 * build from the content (the glossary and checklist spreadsheets, the mindmap
 * and diagram SVGs). The endpoints in src/pages/downloads/ call the writers
 * below, and the Resources Library measures a written file by running the same
 * writer, so the size it shows is the size of the file served. Nothing here is
 * typed by hand: a size or page count comes from the file itself.
 *
 * Node only, with no astro:content import, so the unit tests use it as it is.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Corpus } from '../integrity';
import type { Curriculum } from '../schemas';
import { DIAGRAMS, standalone } from '../diagrams';
import { brandedSvg } from '../mindmap-export';
import { checklistsCsv } from '../teachers/checklists';
import { glossaryCsv } from './glossary-csv';

export type FileFormat = 'PDF' | 'CSV' | 'SVG';

export interface FileFacts {
  format: FileFormat;
  bytes: number;
  /** Pages, for a PDF. */
  pages?: number;
  /** The drawing's size, for an SVG: its preview keeps the same shape. */
  width?: number;
  height?: number;
  /** Where the file comes from: public/ on disk, or written by the build. */
  origin: 'public' | 'build';
}

/** The width and height on an SVG file's root element. */
export function svgSize(svg: string): { width: number; height: number } | null {
  const root = /<svg\b[^>]*>/.exec(svg)?.[0] ?? '';
  const w = Number(/\swidth="([\d.]+)"/.exec(root)?.[1]);
  const h = Number(/\sheight="([\d.]+)"/.exec(root)?.[1]);
  return w > 0 && h > 0 ? { width: Math.round(w), height: Math.round(h) } : null;
}

/** The page a written mindmap file names in its footer: absolute when the build knows the site's address. */
const pageUrl = (path: string, site?: string | URL) => (site ? new URL(path, site).href : path);

/* ---------- The writers, shared with the endpoints ---------- */

export const mindmapFile = (c: Corpus, id: string, site?: string | URL): string | null => {
  const map = c.mindmaps[id];
  return map ? brandedSvg(id, map, { page: pageUrl(`/mindmaps/${id}/`, site) }) : null;
};

export const enrichmentMapFile = (c: Corpus, id: string, site?: string | URL): string | null => {
  const map = c.enrichmentMaps[id];
  return map ? brandedSvg(`enrichment-${id}`, map, { page: pageUrl(`/mindmaps/enrichment/${id}/`, site) }) : null;
};

export const diagramFile = (id: string): string | null => (DIAGRAMS[id] ? standalone(id) : null);

export const GLOSSARY_CSV = '/downloads/glossary.csv';
export const CHECKLISTS_CSV = '/downloads/topic-checklists.csv';

export interface DownloadContext {
  c: Corpus;
  /** The site's address, when the build knows it (it changes the address printed in a mindmap file's footer). */
  site?: string | URL;
  /** The project root; public/ is read from here. */
  root?: string;
}

/** What writes a file the build produces, by its address; null when the address is not one the build writes. */
export function writtenFile(href: string, ctx: DownloadContext): string | null {
  const cur = ctx.c.curricula['ib-dp-bm'] as Curriculum | undefined;
  if (href === GLOSSARY_CSV) return glossaryCsv(ctx.c);
  if (href === CHECKLISTS_CSV) return cur ? checklistsCsv(cur) : null;
  let m = /^\/downloads\/mindmaps\/enrichment\/([a-z0-9-]+)\.svg$/.exec(href);
  if (m) return enrichmentMapFile(ctx.c, m[1]!, ctx.site);
  m = /^\/downloads\/mindmaps\/([a-z0-9-]+)\.svg$/.exec(href);
  if (m) return mindmapFile(ctx.c, m[1]!, ctx.site);
  m = /^\/downloads\/diagrams\/([a-z0-9-]+)\.svg$/.exec(href);
  if (m) return diagramFile(m[1]!);
  return null;
}

const FORMAT_OF: Record<string, FileFormat> = { pdf: 'PDF', csv: 'CSV', svg: 'SVG' };

/** The pages of a PDF, counted from its page objects. */
export function pdfPages(bytes: Buffer): number {
  return (bytes.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
}

/**
 * The facts about a download, or null when no such file exists. A written
 * file is measured as UTF-8, which is how the server sends it.
 */
export function fileFacts(href: string, ctx: DownloadContext): FileFacts | null {
  const ext = /\.([a-z0-9]+)$/.exec(href)?.[1] ?? '';
  const format = FORMAT_OF[ext];
  if (!format || !href.startsWith('/downloads/')) return null;
  const written = writtenFile(href, ctx);
  if (written !== null) return { format, bytes: Buffer.byteLength(written, 'utf8'), origin: 'build', ...(format === 'SVG' ? (svgSize(written) ?? {}) : {}) };
  const path = join(ctx.root ?? process.cwd(), 'public', href);
  if (!existsSync(path) || !statSync(path).isFile()) return null;
  const facts: FileFacts = { format, bytes: statSync(path).size, origin: 'public' };
  if (format === 'PDF') facts.pages = pdfPages(readFileSync(path));
  return facts;
}

/** A size as a reader expects it: 712 bytes, 7 KB, 1.0 MB (decimal units, as file managers show them). */
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} bytes`;
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/** "PDF, 5 pages, 1.0 MB": the format, the pages of a PDF and the size, in the order a reader weighs them. */
export function factsLine(f: Pick<FileFacts, 'format' | 'bytes' | 'pages'>): string {
  return [f.format, f.pages ? `${f.pages} ${f.pages === 1 ? 'page' : 'pages'}` : '', formatBytes(f.bytes)].filter(Boolean).join(', ');
}
