/**
 * The default report of every calculator, for the server render. The browser
 * scripts import only their own family's module, so a page never loads the
 * code for calculators it does not show.
 */
import { BREAK_EVEN_BUILDERS, BREAK_EVEN_DEFAULTS, type BreakEvenId } from './breakeven';
import { BUDGET_DEFAULTS, buildBudget } from './budget';
import { buildCash, CASH_DEFAULTS } from './cash';
import { SETTINGS } from './business';
import { labEntry } from './catalogue';
import { INVESTMENT_BUILDERS, INVESTMENT_DEFAULTS, type InvestmentId } from './investment';
import { buildRatio, ratioDefaults, type RatioLabId } from './ratios';
import { buildStatement, STATEMENT_DEFAULTS } from './statement';
import type { LabReport, Settings } from './types';

export function defaultReport(id: string, s: Settings = SETTINGS): LabReport {
  const e = labEntry(id);
  switch (e.family) {
    case 'breakeven':
      return BREAK_EVEN_BUILDERS[id as BreakEvenId](BREAK_EVEN_DEFAULTS, s);
    case 'ratios':
      return buildRatio(id as RatioLabId, ratioDefaults(id as RatioLabId), s);
    case 'statement':
      return buildStatement(STATEMENT_DEFAULTS, s);
    case 'cash':
      return buildCash(CASH_DEFAULTS, s);
    case 'budget':
      return buildBudget(BUDGET_DEFAULTS, s);
    case 'investment':
      return INVESTMENT_BUILDERS[id as InvestmentId](INVESTMENT_DEFAULTS, s);
  }
}
