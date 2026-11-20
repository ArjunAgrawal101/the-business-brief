/**
 * The first-page images of the creator's PDF guides, rendered once from the
 * PDFs by scripts/brand/guide-covers.mjs and committed under
 * public/images/resources/, with a manifest this module reads at build time.
 * Node only, so the unit tests can check that every image exists.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ImageSource {
  /** The smallest WebP, for the src attribute. */
  src: string;
  /** Every width, as srcset lists, in WebP and in AVIF. */
  webp: string;
  avif: string;
  width: number;
  height: number;
  /** Each file's address under public/, to check it exists. */
  files: string[];
}

interface ManifestEntry {
  width: number;
  height: number;
  files: Array<{ w: number; h: number; webp: string; avif: string }>;
}

export const PREVIEW_MANIFEST = 'public/images/resources/manifest.json';

/** The first-page image of each PDF, by the PDF's address. */
export function pdfPreviews(root = process.cwd()): Record<string, ImageSource> {
  const path = join(root, PREVIEW_MANIFEST);
  if (!existsSync(path)) return {};
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as Record<string, ManifestEntry>;
  const out: Record<string, ImageSource> = {};
  for (const [href, e] of Object.entries(manifest)) {
    const files = [...e.files].sort((a, b) => a.w - b.w);
    const first = files[0];
    if (!first) continue;
    out[href] = {
      src: first.webp,
      webp: files.map((f) => `${f.webp} ${f.w}w`).join(', '),
      avif: files.map((f) => `${f.avif} ${f.w}w`).join(', '),
      width: first.w,
      height: first.h,
      files: files.flatMap((f) => [f.webp, f.avif]),
    };
  }
  return out;
}
