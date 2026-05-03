/*
  # Add credits_included to plans

  1. Changes
    - Adds `credits_included` numeric column to `plans` for the credit allotment sold
  2. Notes
    - Used to derive $-per-credit collected (money kept / credits_included)
    - Default 0 so existing plans remain safe until edited
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'credits_included'
  ) THEN
    ALTER TABLE plans ADD COLUMN credits_included numeric NOT NULL DEFAULT 0;
  END IF;
END $$;
