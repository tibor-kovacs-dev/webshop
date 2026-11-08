import type { Product } from '@/stores/productStore'
import type { CartItem } from '@/stores/cartStore'
import type { ProductPrices } from '@/composables/usePrice'

export const makePrices = (huf = 1000, eur = 3, list?: { huf?: number; eur?: number }): ProductPrices => ({
  huf: { list: list?.huf ?? huf, final: huf },
  eur: { list: list?.eur ?? eur, final: eur },
  usd: { list: list?.eur ?? eur, final: eur },
})

export const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 1,
  slug: 'test-product',
  name: 'Test Product',
  price: 100,
  discount: 0,
  image: 'test.jpg',
  category: 'electronics',
  description: 'Test description',
  prices: makePrices(),
  ...overrides,
})

export const makeCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  ...makeProduct(),
  quantity: 1,
  ...overrides,
})