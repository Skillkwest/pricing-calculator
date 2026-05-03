/*
  # Add sort_order to models

  1. Changes
    - Adds `sort_order` int column to `models` for stable row ordering
    - Backfills existing rows with sequential values based on created_at
  2. Notes
    - Fixes row shuffling when multiple rows share created_at timestamps
    - Enables drag-and-drop reordering
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'models' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE models ADD COLUMN sort_order int NOT NULL DEFAULT 0;
  END IF;
END $$;

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) * 10 AS rn
  FROM models
)
UPDATE models SET sort_order = ranked.rn
FROM ranked
WHERE models.id = ranked.id AND models.sort_order = 0;
