
ALTER TABLE goal_account_links
  ADD COLUMN allocation_mode TEXT NOT NULL DEFAULT 'FIXED'
    CHECK (allocation_mode IN ('FIXED', 'ALL'));

ALTER TABLE goal_account_links ALTER COLUMN allocated_amount DROP NOT NULL;
ALTER TABLE goal_account_links DROP CONSTRAINT IF EXISTS goal_account_links_allocated_amount_check;

ALTER TABLE goal_account_links ADD CONSTRAINT goal_account_links_mode_amount_check CHECK (
  (allocation_mode = 'FIXED' AND allocated_amount IS NOT NULL AND allocated_amount > 0) OR
  (allocation_mode = 'ALL'   AND allocated_amount IS NULL)
);
