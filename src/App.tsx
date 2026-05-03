import { useEffect, useState } from 'react';
import { Calculator, Plus } from 'lucide-react';
import { supabase, type Model, type Plan, type Settings } from './lib/supabase';
import ModelTable from './components/ModelTable';
import PlanSimulator from './components/PlanSimulator';
import CatalogPresets from './components/CatalogPresets';

export default function App() {
  const [settings, setSettings] = useState<Settings>({ id: 1, conversion_rate: 30 });
  const [models, setModels] = useState<Model[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [s, m, p] = await Promise.all([
      supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('models').select('*').order('sort_order'),
      supabase.from('plans').select('*').order('created_at'),
    ]);
    if (s.data) setSettings(s.data);
    setModels(m.data ?? []);
    setPlans(p.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateConversionRate = async (rate: number) => {
    setSettings({ ...settings, conversion_rate: rate });
    await supabase.from('settings').update({ conversion_rate: rate }).eq('id', 1);
  };

  const addPlan = async () => {
    await supabase
      .from('plans')
      .insert({ name: `Plan ${plans.length + 1}`, price: 49, credits_included: 1500 });
    load();
  };

  const deletePlan = async (id: string) => {
    await supabase.from('plans').delete().eq('id', id);
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Margin Lab</h1>
              <p className="text-xs text-slate-500">
                Credit pricing & plan profitability calculator
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <ModelTable
          models={models}
          settings={settings}
          onChange={load}
          onSettingsChange={updateConversionRate}
        />

        <CatalogPresets onRestored={load} />

        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Plan Margin Simulator</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Model how pricing, discounts, affiliate cuts, and usage affect margin.
              </p>
            </div>
            <button
              onClick={addPlan}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              New plan
            </button>
          </div>

          <div className="space-y-6">
            {plans.map((p) => (
              <PlanSimulator
                key={p.id}
                plan={p}
                models={models}
                settings={settings}
                onChange={load}
                onDelete={() => deletePlan(p.id)}
              />
            ))}
            {plans.length === 0 && (
              <div className="bg-white rounded-lg border border-dashed border-slate-300 p-12 text-center">
                <p className="text-slate-500 mb-3">No plans yet.</p>
                <button
                  onClick={addPlan}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md"
                >
                  <Plus className="w-4 h-4" /> Create your first plan
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
