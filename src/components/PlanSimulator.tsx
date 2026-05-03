import { useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { supabase, type Model, type Plan, type Settings } from '../lib/supabase';
import { costPerSecond, fmt, fmtNum, scaledCost } from '../lib/calc';

type Props = {
  plan: Plan;
  models: Model[];
  settings: Settings;
  onChange: () => void;
  onDelete: () => void;
};

export default function PlanSimulator({
  plan,
  models,
  settings,
  onChange,
  onDelete,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const updatePlan = async (patch: Partial<Plan>) => {
    await supabase.from('plans').update(patch).eq('id', plan.id);
    onChange();
  };

  const discountMult = 1 - plan.discount_pct / 100;
  const affiliateMult = 1 - plan.affiliate_pct / 100;
  const priceAfterDiscount = plan.price * discountMult;
  const moneyKept = plan.price * discountMult * affiliateMult;
  const dollarPerCredit = plan.credits_included > 0 ? moneyKept / plan.credits_included : 0;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div
        className={`flex items-center justify-between px-5 py-4 ${
          collapsed ? '' : 'border-b border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
            aria-label={collapsed ? 'Expand plan' : 'Collapse plan'}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${collapsed ? '-rotate-90' : ''}`}
            />
          </button>
          <input
            defaultValue={plan.name}
            onBlur={(e) => updatePlan({ name: e.target.value })}
            className="text-lg font-semibold text-slate-900 bg-transparent focus:bg-slate-50 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-0 flex-1"
          />
          {collapsed && (
            <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
              {fmt(plan.price)} &middot; {fmtNum(plan.credits_included)} credits &middot;{' '}
              {models.length} model{models.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div
        className={`grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-6 p-5 ${
          collapsed ? 'hidden' : ''
        }`}
      >
        <aside className="space-y-4">
          <ParamInput
            label="Plan price"
            value={plan.price}
            prefix="$"
            step={1}
            onBlur={(v) => updatePlan({ price: v })}
          />
          <ParamInput
            label="Credits included"
            value={plan.credits_included}
            step={50}
            onBlur={(v) => updatePlan({ credits_included: v })}
          />
          <ParamInput
            label="Discount"
            value={plan.discount_pct}
            suffix="%"
            step={1}
            onBlur={(v) => updatePlan({ discount_pct: v })}
          />
          <ParamInput
            label="Affiliate cut"
            value={plan.affiliate_pct}
            suffix="%"
            step={1}
            onBlur={(v) => updatePlan({ affiliate_pct: v })}
          />

          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">Price after discount</span>
              <span className="font-mono text-sm font-semibold text-slate-900">
                {fmt(priceAfterDiscount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">Money kept</span>
              <span className="font-mono text-sm font-semibold text-slate-900">
                {fmt(moneyKept)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">$ / credit</span>
              <span className="font-mono text-xs text-slate-700">
                {plan.credits_included > 0 ? `$${dollarPerCredit.toFixed(4)}` : '—'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-snug pt-1 border-t border-slate-200">
              After {plan.discount_pct}% discount and {plan.affiliate_pct}% affiliate cut, you
              keep {fmt(moneyKept)} for {fmtNum(plan.credits_included)} credits.
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Model economics (auto-synced from catalog)
            </h3>
            <span className="text-[11px] text-slate-500">
              {models.length} model{models.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 uppercase tracking-wide text-[10px] text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Provider</th>
                  <th className="px-3 py-2 text-left font-semibold">Model</th>
                  <th className="px-3 py-2 text-left font-semibold">Spec</th>
                  <th className="px-3 py-2 text-right font-semibold">Time (s)</th>
                  <th className="px-3 py-2 text-right font-semibold">$ at cost</th>
                  <th className="px-3 py-2 text-right font-semibold">$ / sec</th>
                  <th className="px-3 py-2 text-right font-semibold">Credits at cost</th>
                  <th className="px-3 py-2 text-right font-semibold">Markup %</th>
                  <th className="px-3 py-2 text-right font-semibold">Credits w/ markup</th>
                  <th className="px-3 py-2 text-right font-semibold">$ after markup</th>
                  <th className="px-3 py-2 text-right font-semibold">$ after disc &amp; aff</th>
                  <th className="px-3 py-2 text-right font-semibold">Profit after disc &amp; aff</th>
                  <th className="px-3 py-2 text-right font-semibold">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {models.map((m) => {
                  const seconds = m.base_unit;
                  const rowCost = scaledCost(m, seconds);
                  const perSec = costPerSecond(m);
                  const creditsAtCostRow = rowCost * settings.conversion_rate;
                  const creditsWithMarkupRow = Math.ceil(
                    creditsAtCostRow * (1 + m.markup_pct / 100)
                  );
                  const dollarsAfterMarkupRow = rowCost * (1 + m.markup_pct / 100);
                  const dollarsAfterDiscAff = creditsWithMarkupRow * dollarPerCredit;
                  const profit = dollarsAfterDiscAff - rowCost;
                  const marginPct =
                    dollarsAfterDiscAff > 0 ? (profit / dollarsAfterDiscAff) * 100 : 0;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 text-slate-700">{m.provider}</td>
                      <td className="px-3 py-2 text-slate-700">{m.name}</td>
                      <td className="px-3 py-2 text-slate-700">{m.spec_label}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-700">
                        {fmtNum(seconds)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-blue-700">
                        {fmtNum(rowCost, 2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-500">
                        {fmt(perSec)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-700">
                        {fmtNum(creditsAtCostRow, 2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-700">
                        {fmtNum(m.markup_pct)}%
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-900 font-medium">
                        {fmtNum(creditsWithMarkupRow)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-900">
                        {fmt(dollarsAfterMarkupRow)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-900 font-semibold bg-emerald-50/60">
                        {fmt(dollarsAfterDiscAff)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono font-semibold ${
                          profit >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {fmt(profit)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono font-semibold ${
                          marginPct >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {dollarsAfterDiscAff > 0 ? `${fmtNum(marginPct, 1)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
                {models.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-slate-400">
                      No models in catalog. Add one to see simulated margins.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
            <span className="font-semibold text-slate-700">$ after disc &amp; aff</span> = credits
            w/ markup × ({fmt(moneyKept)} / {fmtNum(plan.credits_included)} credits included) ={' '}
            {plan.credits_included > 0 ? `$${dollarPerCredit.toFixed(4)}` : '—'} per credit.{' '}
            <span className="font-semibold text-slate-700">Profit</span> = $ after disc &amp; aff −
            $ at cost. Edit Time, $ at cost, or Markup % in the Model Cost Catalog above — changes
            flow into every plan automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

function ParamInput({
  label,
  value,
  prefix,
  suffix,
  step,
  onBlur,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  step: number;
  onBlur: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-600 font-medium">{label}</span>
      <div className="mt-1 flex items-center bg-slate-50 border border-slate-200 rounded-md focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500">
        {prefix && <span className="pl-2 text-slate-400 text-sm">{prefix}</span>}
        <input
          type="number"
          step={step}
          key={`${label}-${value}`}
          defaultValue={value}
          onBlur={(e) => onBlur(parseFloat(e.target.value) || 0)}
          className="w-full bg-transparent px-2 py-1.5 text-sm font-mono text-right focus:outline-none"
        />
        {suffix && <span className="pr-2 text-slate-400 text-sm">{suffix}</span>}
      </div>
    </label>
  );
}
