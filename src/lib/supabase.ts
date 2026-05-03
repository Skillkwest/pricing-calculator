import { createClient } from '@supabase/supabase-js';

export type Model = {
  id: string;
  provider: string;
  name: string;
  spec_label: string;
  base_unit: number;
  base_cost: number;
  markup_pct: number;
  sort_order: number;
};

export type Plan = {
  id: string;
  name: string;
  price: number;
  credits_included: number;
  discount_pct: number;
  affiliate_pct: number;
  processor_pct: number;
  processor_flat: number;
};

export type PlanUsage = {
  id: string;
  plan_id: string;
  model_id: string;
  spec_multiplier: number;
  runs_per_month: number;
  markup_pct: number;
};

export type Settings = {
  id: number;
  conversion_rate: number;
};

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
