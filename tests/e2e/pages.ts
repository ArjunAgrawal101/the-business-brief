import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Every page in the built site, as a path such as /topics/costs-and-revenues/,
 * except the redirect stubs the build writes for moved addresses. Glossary
 * term pages all come from one template, so a fixed sample of them is checked
 * (every page of every other kind is).
 */
export function builtPages(): string[] {
  const dist = new URL('../../dist/', import.meta.url).pathname;
  const out: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (f === 'index.html' && !/<meta http-equiv="refresh"/i.test(readFileSync(p, 'utf8').slice(0, 400))) out.push(`/${relative(dist, d)}${relative(dist, d) ? '/' : ''}`);
    }
  };
  walk(dist);
  const terms = out.filter((x) => /^\/glossary\/[^/]+\/$/.test(x)).sort();
  const sample = new Set(terms.filter((_, i) => i % 25 === 0));
  return out.filter((x) => !/^\/glossary\/[^/]+\/$/.test(x) || sample.has(x)).sort();
}
