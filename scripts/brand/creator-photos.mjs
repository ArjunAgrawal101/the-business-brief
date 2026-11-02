/**
 * Prepares the creator's photographs for the web: crops chosen by eye (see
 * assets/creator/README.md), resized to a few widths, saved as WebP. The
 * originals are not altered in any other way: no retouching, no background
 * changes, no generated pixels.
 *
 *   node scripts/brand/creator-photos.mjs
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const SRC = 'assets/creator/originals';
const OUT = 'public/images/creator';
mkdirSync(OUT, { recursive: true });

const JOBS = [
  // The formal portrait, 4:5. The crop stops above the lower edge.
  { name: 'portrait-formal', file: 'arjun-agrawal-formal-portrait.webp', box: { left: 20, top: 0, width: 856, height: 1070 }, widths: [440, 640, 856] },
  // Addressing an audience: the room, 3:2, and a 4:5 crop centred on the speaker.
  { name: 'audience-wide', file: 'arjun-agrawal-addressing-an-audience.jpg', box: { left: 60, top: 60, width: 1440, height: 960 }, widths: [640, 960, 1440] },
  { name: 'audience-portrait', file: 'arjun-agrawal-addressing-an-audience.jpg', box: { left: 330, top: 60, width: 760, height: 950 }, widths: [440, 760] },
  // Traditional attire, the full frame.
  { name: 'traditional', file: 'arjun-agrawal-traditional-attire.jpg', box: { left: 0, top: 0, width: 795, height: 1280 }, widths: [440, 795] },
];

const manifest = {};
for (const job of JOBS) {
  const entry = { width: job.box.width, height: job.box.height, files: [] };
  for (const w of job.widths) {
    const h = Math.round((w * job.box.height) / job.box.width);
    const out = `${OUT}/arjun-agrawal-${job.name}-${w}.webp`;
    await sharp(`${SRC}/${job.file}`).extract(job.box).resize({ width: w, height: h }).webp({ quality: 82 }).toFile(out);
    entry.files.push({ w, h, src: out.replace(/^public/, '') });
  }
  manifest[job.name] = entry;
}
writeFileSync(`${OUT}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(Object.keys(manifest).join(', '));
