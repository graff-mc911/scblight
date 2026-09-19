/*
  # Update invoice_items table structure

  1. Changes
    - Ensure `invoice_items` exists (created outside early migrations on prod)
    - Add `material` column (text)
    - Add `sort_order` column (integer)
    - Add `updated_at` column (timestamptz)

  2. Notes
    - Preview/fresh DBs may not have invoice_items yet — create it first
    - Copy data from `position` to `sort_order` when present
*/

DO $$
BEGIN
  IF to_regclass('public.invoice_items') IS NULL THEN
    CREATE TABLE invoice_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description text DEFAULT '',
      material text DEFAULT '',
      quantity numeric DEFAULT 0,
      unit text DEFAULT '',
      price numeric DEFAULT 0,
      total numeric DEFAULT 0,
      sort_order integer DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'invoice_items' AND policyname = 'Users manage own invoice items'
    ) THEN
      CREATE POLICY "Users manage own invoice items"
        ON invoice_items FOR ALL
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_items.invoice_id
              AND invoices.user_id = auth.uid()
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_items.invoice_id
              AND invoices.user_id = auth.uid()
          )
        );
    END IF;

    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoice_items' AND column_name = 'material'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN material text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoice_items' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN sort_order integer DEFAULT 0;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'invoice_items' AND column_name = 'position'
    ) THEN
      UPDATE invoice_items SET sort_order = COALESCE(position, 0);
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoice_items' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;
