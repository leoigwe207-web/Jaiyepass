ALTER TABLE public.inventory_holds ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
