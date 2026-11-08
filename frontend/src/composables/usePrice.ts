import { getCurrentCurrency } from '../i18n/i18n'

export interface PriceEntry {
  list: number
  final: number
  list_minor?: number
  final_minor?: number
}

export type ProductPrices = Record<string, PriceEntry>

interface Priced {
  prices?: ProductPrices | null
  quantity?: number
}

interface ResolvedEntry {
  listMinor: number
  finalMinor: number
}

const toMinor = (minor: unknown, display: number): number => {
  if (typeof minor === 'number' && Number.isSafeInteger(minor)) {
    return minor
  }

  return Math.round(display * 100)
}

const fromMinor = (minor: number): number => minor / 100

const resolveEntry = (
  product: Priced | null | undefined,
  currency?: string,
): ResolvedEntry | null => {
  const code = (currency || getCurrentCurrency()).toLowerCase()
  const entry = product?.prices?.[code]

  if (!entry) return null

  const final = Number(entry.final)
  const list = Number(entry.list)

  if (!Number.isFinite(final) || !Number.isFinite(list)) return null

  return {
    listMinor: toMinor(entry.list_minor, list),
    finalMinor: toMinor(entry.final_minor, final),
  }
}

const resolveStoredMinor = (minor: unknown, display: unknown): number => {
  if (typeof minor === 'number' && Number.isSafeInteger(minor)) {
    return minor
  }

  const value = Number(display)

  return Number.isFinite(value) ? Math.round(value * 100) : 0
}

export const usePrice = () => {
  const hasPrices = (product: Priced | null | undefined, currency?: string): boolean => {
    return resolveEntry(product, currency) !== null
  }

  const unitMinor = (product: Priced | null | undefined, currency?: string): number => {
    return resolveEntry(product, currency)?.finalMinor ?? 0
  }

  const listMinor = (product: Priced | null | undefined, currency?: string): number => {
    return resolveEntry(product, currency)?.listMinor ?? 0
  }

  const lineMinor = (item: Priced | null | undefined, currency?: string): number => {
    return unitMinor(item, currency) * (item?.quantity || 1)
  }

  const listLineMinor = (item: Priced | null | undefined, currency?: string): number => {
    return listMinor(item, currency) * (item?.quantity || 1)
  }

  const sumMinor = (items: Priced[], currency?: string): number => {
    return items.reduce((sum, item) => sum + lineMinor(item, currency), 0)
  }

  const unitPrice = (product: Priced | null | undefined, currency?: string): number => {
    return fromMinor(unitMinor(product, currency))
  }

  const listPrice = (product: Priced | null | undefined, currency?: string): number => {
    return fromMinor(listMinor(product, currency))
  }

  const lineTotal = (item: Priced | null | undefined, currency?: string): number => {
    return fromMinor(lineMinor(item, currency))
  }

  const listLineTotal = (item: Priced | null | undefined, currency?: string): number => {
    return fromMinor(listLineMinor(item, currency))
  }

  const sumLines = (items: Priced[], currency?: string): number => {
    return fromMinor(sumMinor(items, currency))
  }

  const orderAmount = (minor: unknown, display: unknown): number => {
    return fromMinor(resolveStoredMinor(minor, display))
  }

  const orderLineAmount = (minor: unknown, display: unknown, quantity: number): number => {
    return fromMinor(resolveStoredMinor(minor, display) * (Number(quantity) || 0))
  }

  return {
    hasPrices,
    unitMinor,
    listMinor,
    lineMinor,
    listLineMinor,
    sumMinor,
    unitPrice,
    listPrice,
    lineTotal,
    listLineTotal,
    sumLines,
    orderAmount,
    orderLineAmount,
  }
}