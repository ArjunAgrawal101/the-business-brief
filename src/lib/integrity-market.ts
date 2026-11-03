/**
 * Integrity checks for the Market Studio instruments: each instrument in
 * src/lib/market-tools.ts has its entry, at its address; the guide statements
 * it quotes are exactly the curriculum's; its glossary terms exist; its worked
 * example passes the instrument's own validation; and the figures the worked
 * examples share agree with each other. Called from checkIntegrity.
 */
import type { Corpus, Problem } from './integrity';
import type { Interactive } from './schemas';
import { MARKET_TOOLS, toolHref } from './market-tools';
import { validateClv, validateMetrics } from './market-metrics';
import { questionChecks } from './market-research';
import { validateMap } from './market-map';
import { validatePlc } from './market-plc';
import { campaignChecks, funnel } from './market-campaign';
import { validateBudget } from './market-budget';

type MarketIx = Extract<Interactive, { guide: { exampleTitle: string } }>;
const isTool = (it: Interactive): it is MarketIx => 'guide' in it;
const dupes = (ids: string[]) => ids.filter((x, i) => ids.indexOf(x) !== i);

export function checkMarketTools(c: Corpus): Problem[] {
  const out: Problem[] = [];
  const statements = new Map<string, Set<string>>();
  for (const cu of Object.values(c.curricula)) for (const u of cu.units) for (const s of u.subtopics) statements.set(s.code, new Set(s.content.map((x) => x.text)));

  for (const t of MARKET_TOOLS) {
    const w = `interactives/${t.ix}`;
    const add = (message: string) => out.push({ where: w, message });
    const it = c.interactives[t.ix];
    if (!it) {
      out.push({ where: 'src/lib/market-tools.ts', message: `instrument "${t.slug}" names "${t.ix}", which is not in src/content/interactives` });
      continue;
    }
    if (it.component !== t.component) add(`is a ${it.component}, but the Market Studio expects a ${t.component}`);
    if (it.page !== toolHref(t.slug)) add(`lives at ${it.page ?? 'no page'}, but the instrument's address is ${toolHref(t.slug)}`);
    for (const cid of t.cases ?? []) {
      const ci = c.interactives[cid];
      if (!ci) out.push({ where: 'src/lib/market-tools.ts', message: `the case interaction "${cid}" does not exist` });
      else if (ci.page !== toolHref(t.slug)) out.push({ where: `interactives/${cid}`, message: `is shown on ${toolHref(t.slug)}, so its page must be that address` });
    }
    if (!isTool(it)) continue;
    for (const s of it.guide.serves) {
      if (!it.syllabus.includes(s.code)) add(`serves ${s.code}, which is not in its syllabus list`);
      if (!statements.get(s.code)?.has(s.statement)) add(`quotes "${s.statement}" for ${s.code}, which is not a statement of that subtopic in the curriculum`);
    }
    for (const term of it.guide.terms) if (!c.glossary[term]) add(`names glossary term "${term}", which does not exist`);

    // Each worked example passes its instrument's own checks.
    if (it.component === 'market-metrics') {
      validateMetrics(it.state).forEach((p) => add(`worked example: ${p.where}: ${p.message}`));
      validateClv(it.state.clv).forEach((p) => add(`worked example: ${p.where}: ${p.message}`));
      dupes(it.state.firms.map((f) => f.id)).forEach((d) => add(`seller "${d}" appears twice`));
    }
    if (it.component === 'questionnaire-builder') {
      const s = it.state;
      dupes(s.questions.map((q) => q.id)).forEach((d) => add(`question "${d}" appears twice`));
      it.flawed.forEach((id) => s.questions.some((q) => q.id === id) || add(`the flawed question "${id}" is not in the questionnaire`));
      s.questions.forEach((q, i) => {
        const flagged = questionChecks(q, i + 1).some((k) => k.level === 'conflict' || k.level === 'tension');
        if (flagged && !it.flawed.includes(q.id)) add(`question ${i + 1} (${q.id}) trips a check but is not listed as flawed`);
        if (!flagged && it.flawed.includes(q.id)) add(`question ${i + 1} (${q.id}) is listed as flawed but trips no check`);
      });
      if (s.method === 'quota' && Math.abs(s.quotas.reduce((n, q) => n + q.share, 0) - 100) > 0.05) add('the quota shares do not add up to 100%');
    }
    if (it.component === 'stp-planner') {
      dupes(it.state.segments.map((g) => g.id)).forEach((d) => add(`segment "${d}" appears twice`));
      if (!it.state.segments.some((g) => g.target)) add('the worked example targets no segment');
    }
    if (it.component === 'competitor-map') validateMap(it.state).forEach((p) => add(`worked example: ${p.where}: ${p.message}`));
    if (it.component === 'plc-simulator') {
      validatePlc(it.state).forEach((p) => add(`worked example: ${p.where}: ${p.message}`));
      dupes(it.state.extensions.map((e) => e.id)).forEach((d) => add(`extension "${d}" appears twice`));
    }
    if (it.component === 'campaign-planner') {
      const s = it.state;
      dupes([...s.channels.map((x) => x.id), ...s.tasks.map((x) => x.id)]).forEach((d) => add(`timeline item "${d}" appears twice`));
      dupes(s.kpis.map((k) => k.id)).forEach((d) => add(`KPI "${d}" appears twice`));
      campaignChecks(s)
        .filter((k) => k.level === 'conflict')
        .forEach((k) => add(`worked example has a problem: ${k.about}: ${k.text}`));
    }
    if (it.component === 'budget-allocator') {
      validateBudget(it.state).forEach((p) => add(`worked example: ${p.where}: ${p.message}`));
      dupes(it.state.channels.map((x) => x.id)).forEach((d) => add(`channel "${d}" appears twice`));
      if (it.state.channels.reduce((n, x) => n + x.spend, 0) > it.state.budget + 0.005) add('the worked example spends more than its budget');
    }
  }

  // The worked examples tell one story: the lifetime value's acquisition cost is what the campaign spends on winning
  // customers (every channel except loyalty, which serves customers already won) per regular customer it expects.
  const metrics = c.interactives['market-metrics-corner-brew'];
  const campaign = c.interactives['market-campaign-corner-brew'];
  if (metrics?.component === 'market-metrics' && campaign?.component === 'campaign-planner') {
    const regulars = funnel(campaign.state).regulars;
    const promo = campaign.state.channels.filter((x) => x.role !== 'loyalty').reduce((n, x) => n + x.cost, 0);
    const cac = regulars > 0 ? Math.round((promo / regulars) * 100) / 100 : 0;
    if (Math.abs(cac - metrics.state.clv.cac) > 0.005) out.push({ where: 'interactives/market-metrics-corner-brew', message: `the acquisition cost should be the campaign's spending on winning customers per regular customer, ${cac.toFixed(2)}, not ${metrics.state.clv.cac}` });
  }

  // Every instrument entry is listed, so none can be published without a page.
  for (const [id, it] of Object.entries(c.interactives)) {
    if (isTool(it) && !MARKET_TOOLS.some((t) => t.ix === id)) out.push({ where: `interactives/${id}`, message: 'is a Market Studio instrument but is not listed in src/lib/market-tools.ts' });
  }
  return out;
}
