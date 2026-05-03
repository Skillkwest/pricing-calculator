/*
  # Catalog Presets - "Scotts Settings"

  1. New Tables
    - `catalog_presets`
      - `id` (uuid, primary key)
      - `name` (text, unique) - human-readable preset name
      - `description` (text) - optional notes
      - `conversion_rate` (numeric) - locked conversion rate snapshot
      - `models` (jsonb) - array of model rows snapshotted at creation time
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `catalog_presets`
    - Public read (presets act as shared reference documents)
    - Authenticated users can insert/update/delete their own presets

  3. Data
    - Seeds a preset named "scotts settings" containing the current catalog
      defaults (all models with base_unit, base_cost, markup_pct) and the
      current conversion_rate.
*/

CREATE TABLE IF NOT EXISTS catalog_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  conversion_rate numeric NOT NULL DEFAULT 30,
  models jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE catalog_presets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'catalog_presets' AND policyname = 'Anyone can view catalog presets'
  ) THEN
    CREATE POLICY "Anyone can view catalog presets"
      ON catalog_presets FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'catalog_presets' AND policyname = 'Authenticated can insert catalog presets'
  ) THEN
    CREATE POLICY "Authenticated can insert catalog presets"
      ON catalog_presets FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'catalog_presets' AND policyname = 'Authenticated can update catalog presets'
  ) THEN
    CREATE POLICY "Authenticated can update catalog presets"
      ON catalog_presets FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'catalog_presets' AND policyname = 'Authenticated can delete catalog presets'
  ) THEN
    CREATE POLICY "Authenticated can delete catalog presets"
      ON catalog_presets FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

INSERT INTO catalog_presets (name, description, conversion_rate, models)
SELECT
  'scotts settings',
  'Locked-in default catalog numbers (baseline reference).',
  (SELECT conversion_rate FROM settings WHERE id = 1),
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'provider', m.provider,
          'name', m.name,
          'spec_label', m.spec_label,
          'base_unit', m.base_unit,
          'base_cost', m.base_cost,
          'markup_pct', m.markup_pct,
          'sort_order', m.sort_order
        )
        ORDER BY m.sort_order, m.provider, m.name
      )
      FROM models m
    ),
    '[]'::jsonb
  )
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_presets WHERE name = 'scotts settings'
);
