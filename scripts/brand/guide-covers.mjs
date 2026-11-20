/**
 * Renders the first page of each of the creator's PDF guides as a preview for
 * the Resources Library, once, to commit: the page exactly as printed, resized
 * to two widths and saved as AVIF with a WebP fallback. Nothing is drawn or
 * retouched. Run again only when a guide changes:
 *
 *   node scripts/brand/guide-covers.mjs
 *
 * Needs pdftoppm (Poppler) on the path, and sharp, which Astro already
 * installs. Writes public/images/resources/ and a manifest that the library
 * reads (src/lib/library/previews.ts).
 */
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SRC = 'public/downloads/guides';
const OUT = 'public/images/resources';
const WIDTHS = [240, 480];
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (/\.(webp|avif)$/.test(f)) unlinkSync(`${OUT}/${f}`);

const work = mkdtempSync(join(tmpdir(), 'guide-covers-'));
const manifest = {};
try {
  for (const file of readdirSync(SRC).filter((f) => f.endsWith('.pdf')).sort()) {
    const base = file.replace(/\.pdf$/, '');
    // The first page at 150 dpi: about 1,240 pixels wide for A4, enough for the larger preview.
    execFileSync('pdftoppm', ['-f', '1', '-l', '1', '-r', '150', '-png', '-singlefile', join(SRC, file), join(work, base)]);
    const png = join(work, `${base}.png`);
    const { width, height } = await sharp(png).metadata();
    const entry = { width, height, files: [] };
    for (const w of WIDTHS) {
      const h = Math.round((w * height) / width);
      const out = `${OUT}/${base}-p1-${w}`;
      await sharp(png).resize({ width: w, height: h }).webp({ quality: 82 }).toFile(`${out}.webp`);
      await sharp(png).resize({ width: w, height: h }).avif({ quality: 56 }).toFile(`${out}.avif`);
      entry.files.push({ w, h, webp: `${out}.webp`.replace(/^public/, ''), avif: `${out}.avif`.replace(/^public/, '') });
    }
    manifest[`/downloads/guides/${file}`] = entry;
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
writeFileSync(`${OUT}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(Object.keys(manifest).join('\n'));
