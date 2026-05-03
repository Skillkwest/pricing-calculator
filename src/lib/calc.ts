import type { Model, Plan, PlanUsage, Settings } from './supabase';

export const costPerSecond = (m: Model) => (m.base_unit > 0 ? m.base_cost / m.base_unit : 0);
export const creditsAtCost = (m: Model, s: Settings) => m.base_cost * s.conversion_rate;
export const creditsWithMarkup = (m: Model, s: Settings) =>
  creditsAtCost(m, s) * (1 + m.markup_pct / 100);
export const dollarsAfterMarkup = (m: Model) => m.base_cost * (1 + m.markup_pct / 100);
export const scaledCost = (m: Model, seconds: number) =>
  m.base_unit > 0 ? costPerSecond(m) * seconds : m.base_cost;
export const scaledCredits = (m: Model, s: Settings, seconds: number) =>
  scaledCost(m, seconds) * s.conversion_rate;

export type PlanMetrics = {
  gross: number;
  discountAmount: number;
  afterDiscount: number;
  processorFee: number;
  effectiveRevenue: number;
  affiliateCost: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number;
};

export function computePlan(
  plan: Plan,
  usages: PlanUsage[],
  models: Model[]
): PlanMetrics {
  const gross = plan.price;
  const discountAmount = gross * (plan.discount_pct / 100);
  const afterDiscount = gross - discountAmount;
  const processorFee =
    afterDiscount > 0 ? afterDiscount * (plan.processor_pct / 100) + plan.processor_flat : 0;
  const effectiveRevenue = afterDiscount - processorFee;
  const affiliateCost = effectiveRevenue * (plan.affiliate_pct / 100);
  const netRevenue = effectiveRevenue - affiliateCost;

  const cogs = usages.reduce((sum, u) => {
    const m = models.find((x) => x.id === u.model_id);
    if (!m) return sum;
    return sum + scaledCost(m, u.spec_multiplier) * u.runs_per_month;
  }, 0);

  const grossProfit = netRevenue - cogs;
  const marginPct = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

  return {
    gross,
    discountAmount,
    afterDiscount,
    processorFee,
    effectiveRevenue,
    affiliateCost,
    netRevenue,
    cogs,
    grossProfit,
    marginPct,
  };
}

export const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
export const fmtNum = (n: number, d = 0) =>
  n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
