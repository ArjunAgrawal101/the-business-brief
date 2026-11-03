/**
 * Integrity checks for the Boardroom scenarios (src/content/boardroom/*.yaml).
 *
 * The references resolve (subtopic codes, glossary terms, command terms,
 * channels, assets, KPIs, narrative tokens), the structure holds (an event
 * between every pair of rounds and none after the last, paths of the right
 * length), and the engine is run over every path through every scenario:
 * each period must satisfy the accounting identities, every event variant
 * must be reachable, and every option must make a difference. The pages that
 * show the scenarios call this and fail the build on any problem; so does
 * tests/unit/boardroom.test.ts.
 */
import { identityErrors, type KpiId } from './boardroom/engine';
import { isKpi } from './boardroom/kpis';
import { FLAG_WORDS, narrateContext, unknownTokens } from './boardroom/narrate';
import { allPaths, runHistory, runPath } from './boardroom/scenario';
import type { Condition, Effects, Scenario } from './boardroom/schema';
import { ROLE_IDS } from './boardroom/roles';

export interface BoardroomRefs {
  subtopics: Set<string>;
  glossary: Set<string>;
  commandTerms: Set<string>;
}

interface Problem {
  where: string;
  message: string;
}

/** Every effects object in a scenario, with where it is. */
function effectsOf(sc: Scenario): Array<{ where: string; e: Effects }> {
  const out: Array<{ where: string; e: Effects }> = [];
  const visit = (where: string, e: Effects | undefined) => {
    if (!e) return;
    out.push({ where, e });
    for (const p of e.capex ?? []) visit(`${where}, investment ${p.id}`, p.effects);
    for (const l of e.later ?? []) visit(`${where}, later`, l.effects);
  };
  sc.history.forEach((x) => visit(`history ${x.label}`, x.effects));
  for (const r of sc.rounds) {
    visit(`round ${r.id}, given`, r.given?.effects);
    for (const o of r.options) {
      visit(`round ${r.id}, option ${o.id}`, o.effects);
      o.when.forEach((w, i) => visit(`round ${r.id}, option ${o.id}, condition ${i + 1}`, w.effects));
    }
    r.event?.variants.forEach((v) => visit(`round ${r.id}, event ${v.id}`, v.effects));
  }
  return out;
}

function conditionsOf(sc: Scenario): Array<{ where: string; c: Condition }> {
  const out: Array<{ where: string; c: Condition }> = [];
  const visit = (where: string, c: Condition | undefined) => {
    if (!c) return;
    out.push({ where, c });
    if ('all' in c) c.all.forEach((x) => visit(where, x));
    if ('any' in c) c.any.forEach((x) => visit(where, x));
    if ('not' in c) visit(where, c.not);
  };
  for (const r of sc.rounds) {
    for (const o of r.options) o.when.forEach((w) => visit(`round ${r.id}, option ${o.id}`, w.if));
    r.event?.variants.forEach((v) => visit(`round ${r.id}, event ${v.id}`, v.if));
  }
  return out;
}

/** Flags the engine sets by itself. */
const ENGINE_FLAGS = new Set(['overdraftBreached']);

export function checkBoardroom(scenarios: Record<string, Scenario>, refs: BoardroomRefs): Problem[] {
  const problems: Problem[] = [];
  for (const [id, sc] of Object.entries(scenarios)) {
    const w = `boardroom/${id}`;
    const add = (message: string, where = w) => problems.push({ where, message });
    const ctx = narrateContext(sc);
    const R = sc.rounds.length;

    /* References to the rest of the platform */
    sc.syllabus.forEach((code) => refs.subtopics.has(code) || add(`subtopic ${code} is not in the curriculum`));
    sc.debrief.theory.forEach((t) => t.syllabus.forEach((code) => refs.subtopics.has(code) || add(`theory "${t.title}" names subtopic ${code}, which is not in the curriculum`)));
    sc.debrief.terms.forEach((t) => refs.glossary.has(t) || add(`glossary term "${t}" does not exist`));
    sc.debrief.practice.forEach((p) => refs.commandTerms.has(p.command) || add(`practice prompt uses command term "${p.command}", which does not exist`));

    /* Structure */
    const roundIds = sc.rounds.map((r) => r.id);
    roundIds.forEach((r, i) => roundIds.indexOf(r) !== i && add(`round id "${r}" is repeated`));
    sc.rounds.forEach((r, i) => {
      const ids = r.options.map((o) => o.id);
      ids.forEach((o, j) => ids.indexOf(o) !== j && add(`option id "${o}" is repeated`, `${w}, round ${r.id}`));
      const last = i === R - 1;
      if (last && r.event) add('the last round cannot have an event after it', `${w}, round ${r.id}`);
      if (!last && !r.event) add('every round but the last needs an event before the next', `${w}, round ${r.id}`);
      const vs = r.event?.variants ?? [];
      if (vs.length && vs[vs.length - 1]?.if) add('the last event variant must have no condition, so that something always happens', `${w}, round ${r.id}`);
      const vids = vs.map((v) => v.id);
      vids.forEach((v, j) => vids.indexOf(v) !== j && add(`event variant "${v}" is repeated`, `${w}, round ${r.id}`));
    });
    const validPath = (picks: string[], what: string) => {
      if (picks.length !== R) add(`${what} has ${picks.length} picks for ${R} rounds`);
      picks.forEach((p, i) => sc.rounds[i]?.options.some((o) => o.id === p) || add(`${what}: "${p}" is not an option in round ${i + 1}`));
    };
    validPath(sc.walkthrough.picks, 'the walkthrough');
    const pathIds = sc.debrief.paths.map((p) => p.id);
    pathIds.forEach((p, i) => pathIds.indexOf(p) !== i && add(`debrief path "${p}" is repeated`));
    sc.debrief.paths.forEach((p) => validPath(p.picks, `debrief path "${p.id}"`));
    const memoIds = sc.memo.fields.map((f) => f.id);
    memoIds.forEach((m, i) => memoIds.indexOf(m) !== i && add(`memo field "${m}" is repeated`));

    /* Measures */
    sc.dashboard.forEach((k) => isKpi(k) || add(`dashboard measure "${k}" is not a KPI`));
    for (const r of ROLE_IDS) {
      sc.roles[r].pinned.forEach((k) => isKpi(k) || add(`role ${r} pins "${k}", which is not a KPI`));
      sc.roles[r].goals.forEach((g) => isKpi(g.metric.split(':')[1] ?? '') || add(`role ${r} has a goal on "${g.metric}", which is not a KPI`));
    }
    const mentions = (k: KpiId) => sc.dashboard.includes(k) || ROLE_IDS.some((r) => sc.roles[r].pinned.includes(k) || sc.roles[r].goals.some((g) => g.metric.endsWith(`:${k}`)));
    if (!sc.model.defects && mentions('defectRate')) add('the scenario uses the defect rate but its model has no defect measure');
    if (!sc.sustainability && (mentions('emissionsPerUnit') || mentions('emissions'))) add('the scenario uses emissions but declares no sustainability measure');
    if (sc.sustainability && !(sc.start.emissionsPerUnit > 0)) add('a scenario with a sustainability measure needs emissions per unit at the start');

    /* Tokens */
    const texts: Array<[string, string]> = [
      ['walkthrough intro', sc.walkthrough.intro],
      ['walkthrough outro', sc.walkthrough.outro],
    ];
    for (const r of sc.rounds) {
      for (const o of r.options) texts.push([`round ${r.id}, option ${o.id} narrative`, o.outcome.narrative]);
      r.event?.variants.forEach((v) => texts.push([`round ${r.id}, event ${v.id}`, v.text]));
    }
    sc.background.forEach((t, i) => texts.push([`background ${i + 1}`, t]));
    sc.context.forEach((t, i) => texts.push([`context ${i + 1}`, t]));
    sc.challenges.forEach((t, i) => texts.push([`challenge ${i + 1}`, t]));
    texts.push(['market summary', sc.market.summary]);
    const first = sc.rounds[0];
    if (first) {
      texts.push([`round ${first.id} situation`, first.situation]);
      for (const [role, t] of Object.entries(first.perspectives)) texts.push([`round ${first.id}, ${role}'s view`, t]);
    }
    for (const [where, t] of texts) unknownTokens(t).forEach((tok) => add(`unknown token ${tok}`, `${w}, ${where}`));
    // After the first round the figures depend on the path, so situations and views cannot quote them.
    for (const r of sc.rounds.slice(1)) {
      for (const [where, t] of [['situation', r.situation], ...Object.entries(r.perspectives).map(([role, v]) => [`${role}'s view`, v])] as Array<[string, string]>) {
        if (/\{\{/.test(t)) add('only the first round can quote figures; later rounds depend on the path', `${w}, round ${r.id} ${where}`);
      }
    }

    /* Channels, assets and flags */
    const setFlags = new Set<string>(ENGINE_FLAGS);
    for (const { where, e } of effectsOf(sc)) {
      const chans = [
        ...Object.keys(e.prices ?? {}),
        ...Object.keys(e.demand ?? {}),
        ...Object.keys(e.channelDays ?? {}),
        ...Object.keys(e.channelCost ?? {}),
        ...(e.removeChannels ?? []),
        ...(e.factoring ? [e.factoring.channel] : []),
        ...(e.writeOff ? [e.writeOff.channel] : []),
      ];
      chans.forEach((c) => ctx.channels[c] || add(`channel "${c}" is never defined`, `${w}, ${where}`));
      if (e.sellAsset && !ctx.assets[e.sellAsset.asset]) add(`asset "${e.sellAsset.asset}" does not exist`, `${w}, ${where}`);
      Object.keys(e.flags ?? {}).forEach((f) => setFlags.add(f));
    }
    for (const { where, c } of conditionsOf(sc)) {
      if ('flag' in c) {
        if (!setFlags.has(c.flag)) add(`condition on flag "${c.flag}", which nothing sets`, `${w}, ${where}`);
        if (!FLAG_WORDS[c.flag]) add(`flag "${c.flag}" has no wording in FLAG_WORDS (src/lib/boardroom/narrate.ts) for the casebook`, `${w}, ${where}`);
      }
      if ('kpi' in c && !isKpi(c.kpi)) add(`condition on "${c.kpi}", which is not a KPI`, `${w}, ${where}`);
      if ('channel' in c && !ctx.channels[c.channel]) add(`condition on channel "${c.channel}", which is never defined`, `${w}, ${where}`);
    }

    /* The market: the company's share and its competitors' cannot exceed the whole */
    try {
      const { history } = runHistory(sc);
      const last = history[history.length - 1];
      if (last) {
        const total = last.kpis.marketShare + sc.market.competitors.reduce((a, c) => a + c.share, 0);
        if (total > 100 + 1e-9) add(`the company's share (${last.kpis.marketShare.toFixed(1)}%) and its competitors' add up to more than 100%`);
      }
      history.forEach((r) => identityErrors(r).forEach((m) => add(`history ${r.label}: ${m}`)));
    } catch (err) {
      add(`the history could not be run: ${String(err)}`);
      continue;
    }

    /* Every path through the engine */
    const reached = new Map<string, Set<string>>(sc.rounds.map((r) => [r.id, new Set<string>()]));
    const finals = new Map<string, Map<string, string>>();
    for (const picks of allPaths(sc)) {
      let run;
      try {
        run = runPath(sc, picks);
      } catch (err) {
        add(`path ${picks.join(' > ')} could not be run: ${String(err)}`);
        continue;
      }
      if (run.rounds.length !== R) add(`path ${picks.join(' > ')} stopped after ${run.rounds.length} rounds`);
      for (const rr of run.rounds) {
        identityErrors(rr.result).forEach((m) => add(`path ${picks.join(' > ')}, ${rr.round.period}: ${m}`));
        if (rr.event) reached.get(rr.round.id)?.add(rr.event.id);
      }
      // For each round, options compared on the same earlier choices must differ somewhere.
      run.rounds.forEach((rr, k) => {
        const key = `${k}:${picks.slice(0, k).join('>')}`;
        const sig = JSON.stringify(rr.result.kpis);
        const m = finals.get(key) ?? new Map<string, string>();
        m.set(rr.option.id, sig);
        finals.set(key, m);
      });
    }
    for (const r of sc.rounds) {
      for (const v of r.event?.variants ?? []) if (!reached.get(r.id)?.has(v.id)) add(`event variant "${v.id}" is never reached on any path`, `${w}, round ${r.id}`);
    }
    for (const [key, m] of finals) {
      const sigs = [...m.values()];
      if (new Set(sigs).size < sigs.length) add(`two options in round ${Number(key.split(':')[0]) + 1} give identical results after ${key.split(':')[1] || 'no earlier choices'}`);
    }
  }
  return problems;
}
