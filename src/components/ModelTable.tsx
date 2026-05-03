import { useState } from 'react';
import { Copy, GripVertical, Plus, Trash2 } from 'lucide-react';
import { supabase, type Model, type Settings } from '../lib/supabase';
import {
  costPerSecond,
  creditsAtCost,
  creditsWithMarkup,
  dollarsAfterMarkup,
  fmt,
  fmtNum,
} from '../lib/calc';

type Props = {
  models: Model[];
  settings: Settings;
  onChange: () => void;
  onSettingsChange: (rate: number) => void;
};

export default function ModelTable({ models, settings, onChange, onSettingsChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const updateModel = async (id: string, patch: Partial<Model>) => {
    await supabase.from('models').update(patch).eq('id', id);
    onChange();
  };

  const duplicateModel = async (m: Model) => {
    await supabase.from('models').insert({
      provider: m.provider,
      name: m.name,
      spec_label: m.spec_label,
      base_unit: m.base_unit,
      base_cost: m.base_cost,
      markup_pct: m.markup_pct,
      sort_order: m.sort_order + 1,
    });
    onChange();
  };

  const deleteModel = async (id: string) => {
    await supabase.from('models').delete().eq('id', id);
    onChange();
  };

  const addModel = async () => {
    setAdding(true);
    const maxOrder = models.reduce((m, x) => Math.max(m, x.sort_order), 0);
    await supabase.from('models').insert({
      provider: 'New',
      name: 'Model',
      spec_label: '15 sec 720',
      base_unit: 15,
      base_cost: 1.0,
      markup_pct: 80,
      sort_order: maxOrder + 10,
    });
    setAdding(false);
    onChange();
  };

  const onDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const reordered = [...models];
    const from = reordered.findIndex((x) => x.id === dragId);
    const to = reordered.findIndex((x) => x.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    await Promise.all(
      reordered.map((m, i) =>
        supabase
          .from('models')
          .update({ sort_order: (i + 1) * 10 })
          .eq('id', m.id)
      )
    );
    setDragId(null);
    setOverId(null);
    onChange();
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Model Cost Catalog</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Base cost per spec unit. Drag the handle to reorder rows.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span className="font-medium">Conversion rate</span>
            <input
              type="number"
              value={settings.conversion_rate}
              onChange={(e) => onSettingsChange(parseFloat(e.target.value) || 0)}
              className="w-20 px-2 py-1 border border-slate-300 rounded text-right font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-slate-500">credits / $1</span>
          </label>
          <button
            onClick={addModel}
            disabled={adding}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add model
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="w-8"></th>
              <th className="px-4 py-3 text-left font-semibold">Provider</th>
              <th className="px-4 py-3 text-left font-semibold">Model</th>
              <th className="px-4 py-3 text-left font-semibold">Spec</th>
              <th className="px-4 py-3 text-right font-semibold">Time interval (s)</th>
              <th className="px-4 py-3 text-right font-semibold">$ at cost</th>
              <th className="px-4 py-3 text-right font-semibold">$ / sec</th>
              <th className="px-4 py-3 text-right font-semibold">SP credits at cost</th>
              <th className="px-4 py-3 text-right font-semibold">Markup %</th>
              <th className="px-4 py-3 text-right font-semibold">SP credits w/ markup</th>
              <th className="px-4 py-3 text-right font-semibold">$ after markup</th>
              <th className="px-4 py-3 text-right font-semibold">Profit</th>
              <th className="px-4 py-3 text-right font-semibold">Margin %</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {models.map((m) => (
              <tr
                key={m.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragId && dragId !== m.id) setOverId(m.id);
                }}
                onDragLeave={() => {
                  if (overId === m.id) setOverId(null);
                }}
                onDrop={() => onDrop(m.id)}
                className={`hover:bg-slate-50/50 transition-colors ${
                  dragId === m.id ? 'opacity-40' : ''
                } ${overId === m.id ? 'bg-teal-50' : ''}`}
              >
                <td
                  className="px-1 text-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700"
                  draggable
                  onDragStart={() => setDragId(m.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                >
                  <GripVertical className="w-4 h-4 mx-auto" />
                </td>
                <td className="px-4 py-2">
                  <input
                    defaultValue={m.provider}
                    onBlur={(e) => updateModel(m.id, { provider: e.target.value })}
                    className="w-full bg-transparent px-1 py-1 rounded focus:bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </td>
                <td className="px-4 py-2 min-w-[8rem]">
                  <textarea
                    rows={1}
                    defaultValue={m.name}
                    onBlur={(e) => updateModel(m.id, { name: e.target.value })}
                    className="w-full bg-transparent px-1 py-1 rounded resize-none whitespace-normal break-words leading-tight focus:bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    style={{ minHeight: '1.75rem' }}
                    onInput={(e) => {
                      const t = e.currentTarget;
                      t.style.height = 'auto';
                      t.style.height = `${t.scrollHeight}px`;
                    }}
                    ref={(el) => {
                      if (el) {
                        el.style.height = 'auto';
                        el.style.height = `${el.scrollHeight}px`;
                      }
                    }}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    defaultValue={m.spec_label}
                    onBlur={(e) => updateModel(m.id, { spec_label: e.target.value })}
                    className="w-full bg-transparent px-1 py-1 rounded focus:bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </td>
                <td className="px-4 py-2 text-right font-mono">
                  <input
                    type="number"
                    key={`unit-${m.sort_order}-${m.base_unit}`}
                    defaultValue={m.base_unit}
                    onBlur={(e) => {
                      const newUnit = parseFloat(e.target.value) || 0;
                      if (newUnit === m.base_unit) return;
                      const perSec = m.base_unit > 0 ? m.base_cost / m.base_unit : 0;
                      updateModel(m.id, {
                        base_unit: newUnit,
                        base_cost: parseFloat((perSec * newUnit).toFixed(4)),
                      });
                    }}
                    className="w-16 bg-transparent px-1 py-1 rounded text-right focus:bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </td>
                <td className="px-4 py-2 text-right font-mono">
                  <input
                    type="number"
                    step="0.01"
                    key={`cost-${m.base_cost}-${m.base_unit}`}
                    defaultValue={m.base_cost}
                    onBlur={(e) =>
                      updateModel(m.id, { base_cost: parseFloat(e.target.value) || 0 })
                    }
                    className="w-20 bg-transparent px-1 py-1 rounded text-right text-blue-700 focus:bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </td>
                <td className="px-4 py-2 text-right font-mono text-slate-500">
                  {fmt(costPerSecond(m))}
                </td>
                <td className="px-4 py-2 text-right font-mono text-slate-700">
                  {fmtNum(creditsAtCost(m, settings), 2)}
                </td>
                <td className="px-4 py-2 text-right font-mono">
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      defaultValue={m.markup_pct}
                      onBlur={(e) =>
                        updateModel(m.id, { markup_pct: parseFloat(e.target.value) || 0 })
                      }
                      className="w-16 bg-amber-50 px-1 py-1 rounded text-right focus:bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-right font-mono text-slate-900 font-medium">
                  {fmtNum(Math.ceil(creditsWithMarkup(m, settings)))}
                </td>
                <td className="px-4 py-2 text-right font-mono text-slate-900 font-medium">
                  {fmt(dollarsAfterMarkup(m))}
                </td>
                {(() => {
                  const revenue = dollarsAfterMarkup(m);
                  const profit = revenue - m.base_cost;
                  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
                  const cls = profit >= 0 ? 'text-emerald-700' : 'text-red-700';
                  return (
                    <>
                      <td className={`px-4 py-2 text-right font-mono font-semibold ${cls}`}>
                        {fmt(profit)}
                      </td>
                      <td className={`px-4 py-2 text-right font-mono font-semibold ${cls}`}>
                        {revenue > 0 ? `${fmtNum(margin, 1)}%` : '—'}
                      </td>
                    </>
                  );
                })()}
                <td className="px-2 py-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => duplicateModel(m)}
                      className="p-1 text-slate-400 hover:text-teal-600 transition-colors"
                      title="Duplicate row"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteModel(m.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {models.length === 0 && (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-center text-slate-400">
                  No models yet. Click "Add model" to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
