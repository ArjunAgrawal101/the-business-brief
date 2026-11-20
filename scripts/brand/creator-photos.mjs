/**
 * Prepares the creator's photographs for the web: crops chosen by eye (see
 * assets/creator/README.md), resized to a few widths, saved as AVIF and WebP.
 * Nothing is retouched: no background changes, no generated pixels, no change
 * to faces or proportions. One photograph (the conference table) has a light
 * tonal correction, brightness +3% and contrast +5%, because the window behind
 * it washes the room out; every other file is cropped and resized only.
 *
 *   node scripts/brand/creator-photos.mjs
 *
 * Each named crop can have a companion crop for narrow screens (art
 * direction); CreatorPhoto.astro takes both and writes a <picture>.
 */
import sharp from 'sharp';
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';

const SRC = 'assets/creator/originals';
const OUT = 'public/images/creator';
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (/\.(webp|avif)$/.test(f)) unlinkSync(`${OUT}/${f}`);

/** Brightness +3%, contrast +5%: the only correction, and only where noted. */
const lift = (img) => img.modulate({ brightness: 1.03 }).linear(1.05, -6);

const JOBS = [
  // Image 1. The awards portrait: the About page hero (4:5) and a square
  // head-and-shoulders crop for small frames.
  { name: 'portrait-awards', file: 'arjun-agrawal-awards-portrait.webp', box: { left: 10, top: 0, width: 668, height: 835 }, widths: [480, 668] },
  { name: 'portrait-awards-square', file: 'arjun-agrawal-awards-portrait.webp', box: { left: 21, top: 0, width: 620, height: 620 }, widths: [320, 620] },
  // Image 2. Teaching a class in front of a screen: the room, 3:2, and a 4:5
  // crop centred on the speaker.
  { name: 'audience-wide', file: 'arjun-agrawal-addressing-an-audience.jpg', box: { left: 60, top: 60, width: 1440, height: 960 }, widths: [640, 960, 1440] },
  { name: 'audience-portrait', file: 'arjun-agrawal-addressing-an-audience.jpg', box: { left: 330, top: 60, width: 760, height: 950 }, widths: [440, 760] },
  // Image 3. At a conference table: 3:2 for wide screens, 4:3 closer in for phones.
  { name: 'conference-wide', file: 'arjun-agrawal-conference-table.jpg', box: { left: 100, top: 340, width: 1680, height: 1120 }, widths: [640, 960, 1440], tone: lift },
  { name: 'conference-close', file: 'arjun-agrawal-conference-table.jpg', box: { left: 200, top: 420, width: 1400, height: 1050 }, widths: [560, 840], tone: lift },
  // Traditional attire, the full frame.
  { name: 'traditional', file: 'arjun-agrawal-traditional-attire.jpg', box: { left: 0, top: 0, width: 795, height: 1280 }, widths: [440, 795] },
];

const manifest = {};
for (const job of JOBS) {
  const entry = { width: job.box.width, height: job.box.height, files: [] };
  for (const w of job.widths) {
    const h = Math.round((w * job.box.height) / job.box.width);
    const base = `${OUT}/arjun-agrawal-${job.name}-${w}`;
    const make = () => {
      let img = sharp(`${SRC}/${job.file}`).extract(job.box).resize({ width: w, height: h });
      if (job.tone) img = job.tone(img);
      return img;
    };
    await make().webp({ quality: 80 }).toFile(`${base}.webp`);
    await make().avif({ quality: 52 }).toFile(`${base}.avif`);
    entry.files.push({ w, h, src: `${base}.webp`.replace(/^public/, ''), avif: `${base}.avif`.replace(/^public/, '') });
  }
  manifest[job.name] = entry;
}
writeFileSync(`${OUT}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(Object.keys(manifest).join(', '));
