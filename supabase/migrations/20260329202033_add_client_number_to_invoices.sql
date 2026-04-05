/*
  # Додати номер клієнта до рахунків

  1. Зміни
    - Додаємо колонку `client_number` (text) - номер клієнта
    - Ця колонка зберігає копію номера клієнта для відображення в рахунку

  2. Примітки
    - Поле може бути NULL для існуючих рахунків
    - Використовується для відображення "Kundennr." в PDF рахунку
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'client_number'
  ) THEN
    ALTER TABLE invoices ADD COLUMN client_number text;
  END IF;
END $$;