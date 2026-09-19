/*
  # Align invoice date index with live schema

  Preview/prod may use `invoices.date` while an older migration expected
  `invoice_date`. Ensure a usable date index exists without failing deploy.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_date'
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'date'
  ) THEN
    CREATE INDEX idx_invoices_date ON invoices(date);
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'invoice_date'
  ) THEN
    CREATE INDEX idx_invoices_date ON invoices(invoice_date);
  END IF;
END $$;
