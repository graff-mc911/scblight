/** Parse material cost from a line-item material field (numeric text or number). */
export function parseMaterialAmount(material: string | number | null | undefined): number {
  if (typeof material === 'number') {
    return Number.isFinite(material) ? material : 0;
  }

  if (material == null) return 0;

  const normalized = String(material)
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.');

  if (!normalized || !/^-?\d+(\.\d+)?$/.test(normalized)) {
    return 0;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

/** Line total = quantity × price + material cost. */
export function calculateLineTotal(
  quantity: number | string | null | undefined,
  price: number | string | null | undefined,
  material: string | number | null | undefined
): number {
  const qty = Number(quantity) || 0;
  const unitPrice = Number(price) || 0;
  return qty * unitPrice + parseMaterialAmount(material);
}

export function calculateItemsNetTotal(
  items: Array<{ total?: number | null; quantity?: number; price?: number; material?: string | number | null }>
): number {
  return items.reduce((sum, item) => {
    if (item.total != null && Number.isFinite(Number(item.total))) {
      return sum + Number(item.total);
    }
    return sum + calculateLineTotal(item.quantity, item.price, item.material);
  }, 0);
}
