/*
  # Add Lexware-style Quittung fields to receipts table

  ## Summary
  Extends the receipts table with fields needed for a proper German Quittung (receipt):

  ## New Columns
  - `issuer_name` - Aussteller (who issues the receipt / company name)
  - `issuer_address` - Aussteller Adresse
  - `recipient_name` - Empfänger (who receives the receipt / payer name)
  - `recipient_address` - Empfänger Adresse
  - `amount_net` - Nettobetrag (net amount before VAT)
  - `vat_rate` - MwSt-Satz in % (VAT rate, e.g. 19)
  - `vat_amount` - MwSt-Betrag (calculated VAT amount)
  - `amount_gross` - Bruttobetrag (total gross amount incl. VAT)
  - `purpose` - Verwendungszweck (purpose/reason for payment)
  - `signature_data` - Unterschrift as base64 data URL
  - `currency` - Währung (default EUR)
  - `vat_enabled` - whether VAT is shown (default false)
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'issuer_name') THEN
    ALTER TABLE receipts ADD COLUMN issuer_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'issuer_address') THEN
    ALTER TABLE receipts ADD COLUMN issuer_address text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'recipient_name') THEN
    ALTER TABLE receipts ADD COLUMN recipient_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'recipient_address') THEN
    ALTER TABLE receipts ADD COLUMN recipient_address text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'amount_net') THEN
    ALTER TABLE receipts ADD COLUMN amount_net numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'vat_rate') THEN
    ALTER TABLE receipts ADD COLUMN vat_rate numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'vat_amount') THEN
    ALTER TABLE receipts ADD COLUMN vat_amount numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'amount_gross') THEN
    ALTER TABLE receipts ADD COLUMN amount_gross numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'purpose') THEN
    ALTER TABLE receipts ADD COLUMN purpose text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'signature_data') THEN
    ALTER TABLE receipts ADD COLUMN signature_data text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'currency') THEN
    ALTER TABLE receipts ADD COLUMN currency text DEFAULT 'EUR';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'vat_enabled') THEN
    ALTER TABLE receipts ADD COLUMN vat_enabled boolean DEFAULT false;
  END IF;
END $$;
