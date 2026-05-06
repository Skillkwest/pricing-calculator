import { useEffect, useState } from 'react';
import { BookLock, ChevronDown, RotateCcw } from 'lucide-react';
import { supabase, type CatalogPreset } from '../lib/supabase';

type Props = {
  onRestored: () => void;
};

export default function CatalogPresets({ onRestored }: Props) {
  const [presets, setPresets] = useState<CatalogPreset[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('catalog_presets')
      .select('*')
      .order('created_at', { ascending: true });
    setPresets((data ?? []) as CatalogPreset[]);
  };

  useEffect(() => {
    load();
  }, []);

  const restore = async (preset: CatalogPreset) => {
    if (
      !confirm(
        `Restore catalog to "${preset.name}"? This will replace all current models and the conversion rate.`
      )
    ) {
      return;
    }
    setRestoringId(preset.id);
    await supabase.from('models').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const rows = preset.models.map((m) => ({
      provider: m.provider,
      name: m.name,
      spec_label: m.spec_label,
      base_unit: m.base_unit,
      base_cost: m.base_cost,
      markup_pct: m.markup_pct,
      sort_order: m.sort_order,
    }));
    if (rows.length > 0) {
      await supabase.from('models').insert(rows);
    }
    await supabase
      .from('settings')
      .update({ conversion_rate: preset.conversion_rate })
      .eq('id', 1);
    setRestoringId(null);
    onRestored();
  };

  if (presets.length === 0) return null;

  return (
    <section className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200">
        <BookLock className="w-4 h-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-900">Catalog presets</h2>
        <span className="text-xs text-slate-500">Locked baseline reference</span>
      </div>

      <div className="divide-y divide-slate-100">
        {presets.map((preset) => {
          const isOpen = openId === preset.id;
          return (
            <div key={preset.id}>
              <div className="flex items-center justify-between px-5 py-3">
                <button
                  onClick={() => setOpenId(isOpen ? null : preset.id)}
                  className="flex items-center gap-2 text-left flex-1 min-w-0"
                >
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform ${
                      isOpen ? '' : '-rotate-90'
                    }`}
                  />
                  <span className="text-sm font-semibold text-slate-900">{preset.name}</span>
                  <span className="text-xs text-slate-500 truncate">
                    {preset.models.length} models &middot; {preset.conversion_rate} credits / $
                  </span>
                </button>
                <button
                  onClick={() => restore(preset)}
                  disabled={restoringId === preset.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-md transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {restoringId === preset.id ? 'Restoring...' : 'Restore'}
                </button>
              </div>

              {isOpen && (
                <div className="px-5 pb-4">
                  {preset.description && (
                    <p className="text-xs text-slate-500 mb-3">{preset.description}</p>
                  )}
                  <div className="overflow-x-auto border border-slate-200 rounded-md">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 uppercase tracking-wide text-[10px] text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Provider</th>
                          <th className="px-3 py-2 text-left font-semibold">Model</th>
                          <th className="px-3 py-2 text-left font-semibold">Spec</th>
                          <th className="px-3 py-2 text-right font-semibold">Time (s)</th>
                          <th className="px-3 py-2 text-right font-semibold">$ at cost</th>
                          <th className="px-3 py-2 text-right font-semibold">Markup %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {preset.models.map((m, i) => (
                          <tr key={i} className="text-slate-700">
                            <td className="px-3 py-2">{m.provider}</td>
                            <td className="px-3 py-2">{m.name}</td>
                            <td className="px-3 py-2">{m.spec_label}</td>
                            <td className="px-3 py-2 text-right font-mono">{m.base_unit}</td>
                            <td className="px-3 py-2 text-right font-mono">
                              ${Number(m.base_cost).toFixed(4)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">{m.markup_pct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
