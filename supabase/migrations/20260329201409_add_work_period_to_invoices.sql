/*
  # Додати поля періоду робіт до рахунків

  1. Зміни
    - Додаємо колонку `work_period_start` (дата) - початок виконання робіт
    - Додаємо колонку `work_period_end` (дата) - кінець виконання робіт
    - Ці поля використовуються для відображення періоду робіт у рахунку (Leistungszeitraum)

  2. Примітки
    - Поля можуть бути NULL для існуючих рахунків
    - За замовчуванням використовується дата створення рахунку
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'work_period_start'
  ) THEN
    ALTER TABLE invoices ADD COLUMN work_period_start date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'work_period_end'
  ) THEN
    ALTER TABLE invoices ADD COLUMN work_period_end date;
  END IF;
END $$;