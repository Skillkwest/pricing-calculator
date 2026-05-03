/*
  # Add markup override to plan_usage

  1. Changes
    - Adds `markup_pct` numeric column to `plan_usage` (default -1 = inherit from model)
  2. Notes
    - Lets simulator override catalog markup for what-if scenarios
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plan_usage' AND column_name = 'markup_pct'
  ) THEN
    ALTER TABLE plan_usage ADD COLUMN markup_pct numeric NOT NULL DEFAULT -1;
  END IF;
END $$;
