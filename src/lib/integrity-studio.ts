/**
 * Integrity checks for the Market Studio and Operations Floor interactions:
 * the references inside each one resolve, and its figures are consistent with
 * themselves. Called from checkIntegrity in src/lib/integrity.ts.
 */
import { mapModel, QUADRANTS } from './market';
import { validateStock } from './operations';
import type { Interactive } from './schemas';

interface Problem {
  where: string;
  message: string;
}

const dupes = (ids: string[]) => ids.filter((x, i) => ids.indexOf(x) !== i);

export function checkStudioInteractives(interactives: Record<string, Interactive>): Problem[] {
  const out: Problem[] = [];
  for (const [id, it] of Object.entries(interactives)) {
    const w = `interactives/${id}`;
    const add = (message: string) => out.push({ where: w, message });

    if (it.component === 'market-share-workspace') {
      const ids = it.firms.map((f) => f.id);
      dupes(ids).forEach((d) => add(`firm "${d}" appears twice`));
      const focus = it.firms.find((f) => f.id === it.focus);
      if (!focus) add(`the focus firm "${it.focus}" is not in the list`);
      else if (focus.group) add('the focus firm cannot be a group line');
      for (const s of it.scenarios) Object.keys(s.set).forEach((k) => ids.includes(k) || add(`scenario "${s.id}" changes "${k}", which is not a firm`));
      if (it.firms.reduce((n, f) => n + f.last, 0) <= 0 || it.firms.reduce((n, f) => n + f.now, 0) <= 0) add('the market needs sales in both periods');
    }

    if (it.component === 'position-map') {
      const attrs = it.attributes.map((a) => a.id);
      dupes(attrs).forEach((d) => add(`attribute "${d}" appears twice`));
      dupes(it.brands.map((b) => b.id)).forEach((d) => add(`seller "${d}" appears twice`));
      if (!attrs.includes(it.defaults.x) || !attrs.includes(it.defaults.y)) add('the default axes must be attributes');
      if (it.defaults.x === it.defaults.y) add('the default axes must differ');
      if (!it.brands.some((b) => b.id === it.focus)) add(`the focus seller "${it.focus}" is not in the list`);
      const mid = (it.scale.min + it.scale.max) / 2;
      for (const b of it.brands) {
        for (const a of attrs) {
          const v = b.scores[a];
          if (v === undefined) add(`${b.name} has no score for "${a}"`);
          else if (v < it.scale.min || v > it.scale.max) add(`${b.name}'s score for "${a}" is outside the scale`);
          else if (v === mid) add(`${b.name}'s score for "${a}" is exactly the middle of the scale, so its part of the map is ambiguous`);
        }
        Object.keys(b.scores).forEach((k) => attrs.includes(k) || add(`${b.name} has a score for "${k}", which is not an attribute`));
      }
      // Each gap note must describe a part of the map that is empty on that pair of axes.
      for (const g of it.gaps) {
        const keys = Object.keys(g.poles);
        if (keys.length !== 2 || keys.some((k) => !attrs.includes(k))) {
          add('a gap note must name exactly two attributes');
          continue;
        }
        const [xa, ya] = keys as [string, string];
        const m = mapModel(it.brands, xa, ya, it.scale);
        const q = `${g.poles[xa]}-${g.poles[ya]}` as (typeof QUADRANTS)[number];
        if (!m.empty.includes(q)) add(`the gap note for ${xa} ${g.poles[xa]} and ${ya} ${g.poles[ya]} describes a part of the map that is not empty`);
      }
    }

    if (it.component === 'capacity-productivity') {
      for (const mo of it.months) {
        const v = mo.values;
        if (v.output > v.capacity) add(`${mo.label}: output is above capacity`);
        if (v.rejected > v.made) add(`${mo.label}: more units failed than were made`);
        if (v.made - v.rejected !== v.output) add(`${mo.label}: units made minus units rejected (${v.made - v.rejected}) is not the output (${v.output})`);
        if (v.fixedCosts > v.inputCost) add(`${mo.label}: fixed costs are more than total input costs`);
      }
    }

    if (it.component === 'stock-control') {
      const p = validateStock(it.defaults);
      p.forEach((x) => add(`the default plan: ${x.field}: ${x.message}`));
      if (!it.scenarios.some((s) => s.id === it.rushScenario)) add(`the buffer question's scenario "${it.rushScenario}" does not exist`);
      for (const s of it.scenarios) {
        if (!s.usage && !s.late) add(`scenario "${s.id}" changes nothing`);
        s.usage?.forEach((u) => (u.from > u.to || u.to > it.weeks) && add(`scenario "${s.id}" uses weeks outside 1 to ${it.weeks}`));
      }
    }

    if (it.component === 'location-scoring') {
      const fs = it.factors.map((f) => f.id);
      dupes(fs).forEach((d) => add(`factor "${d}" appears twice`));
      dupes(it.sites.map((s) => s.id)).forEach((d) => add(`site "${d}" appears twice`));
      it.factors.forEach((f) => f.weight > it.maxWeight && add(`factor "${f.id}" has a weight above the maximum`));
      for (const s of it.sites) {
        for (const f of fs) {
          const v = s.scores[f];
          if (v === undefined) add(`${s.name} has no score for "${f}"`);
          else if (v < 1 || v > it.maxScore || !Number.isInteger(v)) add(`${s.name}'s score for "${f}" must be a whole number from 1 to ${it.maxScore}`);
        }
        Object.keys(s.scores).forEach((k) => fs.includes(k) || add(`${s.name} has a score for "${k}", which is not a factor`));
      }
    }
  }
  return out;
}
