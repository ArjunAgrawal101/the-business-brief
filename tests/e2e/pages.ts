import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Every page in the built site, as a path such as /topics/costs-and-revenues/. */
export function builtPages(): string[] {
  const dist = new URL('../../dist/', import.meta.url).pathname;
  const out: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (f === 'index.html') out.push(`/${relative(dist, d)}${relative(dist, d) ? '/' : ''}`);
    }
  };
  walk(dist);
  return out.sort();
}
