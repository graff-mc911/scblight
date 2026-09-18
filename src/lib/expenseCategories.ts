export const EXPENSE_CATEGORIES = [
  'food',
  'auto',
  'entertainment',
  'materials',
  'utilities',
  'health',
  'travel',
  'office',
  'other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export function normalizeExpenseCategory(raw: unknown): ExpenseCategory {
  const value = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  const aliases: Record<string, ExpenseCategory> = {
    food: 'food',
    groceries: 'food',
    restaurant: 'food',
    cafe: 'food',
    auto: 'auto',
    car: 'auto',
    fuel: 'auto',
    gas: 'auto',
    transport: 'auto',
    entertainment: 'entertainment',
    leisure: 'entertainment',
    materials: 'materials',
    material: 'materials',
    construction: 'materials',
    utilities: 'utilities',
    bills: 'utilities',
    health: 'health',
    medical: 'health',
    pharmacy: 'health',
    travel: 'travel',
    hotel: 'travel',
    office: 'office',
    supplies: 'office',
    other: 'other',
  };

  if ((EXPENSE_CATEGORIES as readonly string[]).includes(value)) {
    return value as ExpenseCategory;
  }
  return aliases[value] || 'other';
}

export function categoryI18nKey(category: string): string {
  return `expenseCat_${normalizeExpenseCategory(category)}`;
}
