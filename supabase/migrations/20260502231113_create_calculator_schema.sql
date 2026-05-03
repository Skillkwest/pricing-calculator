/*
  # Business Calculator Schema

  1. New Tables
    - `settings` - global config (conversion rate credits per $1)
    - `models` - provider/model catalog with base cost, spec, markup
    - `plans` - subscription plans (price, discount, affiliate, processor fee)
    - `plan_usage` - per-plan usage mix (model + spec multiplier + runs)

  2. Security
    - RLS enabled on all tables
    - Anon read/write policies (no auth requested by user; single-user tool)

  3. Notes
    - Seeds initial conversion rate (30) and sample models from screenshot
*/

CREATE TABLE IF NOT EXISTS settings (
  id int PRIMARY KEY DEFAULT 1,
  conversion_rate numeric NOT NULL DEFAULT 30,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  spec_label text NOT NULL DEFAULT '',
  base_unit numeric NOT NULL DEFAULT 1,
  base_cost numeric NOT NULL DEFAULT 0,
  markup_pct numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'New Plan',
  price numeric NOT NULL DEFAULT 49,
  discount_pct numeric NOT NULL DEFAULT 0,
  affiliate_pct numeric NOT NULL DEFAULT 0,
  processor_pct numeric NOT NULL DEFAULT 2.9,
  processor_flat numeric NOT NULL DEFAULT 0.30,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  spec_multiplier numeric NOT NULL DEFAULT 1,
  runs_per_month numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read settings" ON settings FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert settings" ON settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update settings" ON settings FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon read models" ON models FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert models" ON models FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update models" ON models FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete models" ON models FOR DELETE TO anon USING (true);

CREATE POLICY "anon read plans" ON plans FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert plans" ON plans FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update plans" ON plans FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete plans" ON plans FOR DELETE TO anon USING (true);

CREATE POLICY "anon read plan_usage" ON plan_usage FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert plan_usage" ON plan_usage FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update plan_usage" ON plan_usage FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete plan_usage" ON plan_usage FOR DELETE TO anon USING (true);

INSERT INTO settings (id, conversion_rate) VALUES (1, 30) ON CONFLICT (id) DO NOTHING;

INSERT INTO models (provider, name, spec_label, base_unit, base_cost, markup_pct)
SELECT * FROM (VALUES
  ('Kie', 'Kling 3.0', '15 sec 720', 15, 1.50, 80),
  ('Kie', 'Kling 3.0', '15 sec 1080', 15, 2.03, 80),
  ('Kie', 'Seedance 2.0', '15 sec 720', 15, 3.50, 80),
  ('Kie', 'Seedance 2.0', '15 sec 1080', 15, 8.68, 80),
  ('Kie', 'Seedance 2.0 FAST', '15 sec 720', 15, 2.48, 80)
) AS v(provider, name, spec_label, base_unit, base_cost, markup_pct)
WHERE NOT EXISTS (SELECT 1 FROM models);
