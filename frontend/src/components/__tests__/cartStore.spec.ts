import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import axios from 'axios'
import { useCartStore } from '@/stores/cartStore'
import { makeProduct, makeCartItem, makePrices } from './fixtures'

vi.mock('axios')
vi.mock('@/i18n/i18n', () => ({
  getCurrentCurrency: () => 'huf',
  default: {},
}))

const mockedGet = vi.mocked(axios.get)

describe('CartStore tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds a product to the cart', () => {
    const store = useCartStore()

    store.addToCart(makeProduct({ id: 1, name: 'Test Product' }))

    expect(store.items).toHaveLength(1)
    expect(store.items[0]!.name).toBe('Test Product')
    expect(store.items[0]!.quantity).toBe(1)
  })

  it('adds a product with the specified quantity', () => {
    const store = useCartStore()

    store.addToCart({ ...makeProduct(), quantity: 3 })

    expect(store.items[0]!.quantity).toBe(3)
  })

  it('increases only the quantity when the same product is added multiple times', () => {
    const store = useCartStore()
    const product = makeProduct()

    store.addToCart(product)
    store.addToCart(product)

    expect(store.items).toHaveLength(1)
    expect(store.items[0]!.quantity).toBe(2)
  })

  it('uses the latest price list when the product is added again', () => {
    const store = useCartStore()

    store.addToCart(makeProduct({ prices: makePrices(1000, 3) }))
    store.addToCart(makeProduct({ prices: makePrices(1100, 3.3) }))

    expect(store.items[0]!.prices?.huf?.final).toBe(1100)
  })

  it('removeFromCart decreases the quantity or removes the product', () => {
    const store = useCartStore()
    const product = makeProduct({ id: 1 })

    store.addToCart(product)
    store.addToCart(product)

    store.removeFromCart(1)
    expect(store.items[0]!.quantity).toBe(1)

    store.removeFromCart(1)
    expect(store.items).toHaveLength(0)
  })

  it('removing an unknown product does not change anything', () => {
    const store = useCartStore()
    store.addToCart(makeProduct({ id: 1 }))

    store.removeFromCart(99)

    expect(store.items).toHaveLength(1)
  })

  it('removeAllOfItem removes the entire quantity', () => {
    const store = useCartStore()
    store.addToCart({ ...makeProduct({ id: 1 }), quantity: 5 })
    store.addToCart(makeProduct({ id: 2 }))

    store.removeAllOfItem(1)

    expect(store.items.map((item) => item.id)).toEqual([2])
  })

  it('clearCart and resetCart empty the cart and clear notifications', () => {
    const store = useCartStore()
    store.addToCart(makeProduct())

    store.clearCart()

    expect(store.items).toHaveLength(0)
    expect(store.lastAddedProduct).toBeNull()
    expect(store.showNotification).toBe(false)

    store.addToCart(makeProduct())
    store.resetCart()
    expect(store.items).toHaveLength(0)
  })

  it('calculates the total from server-side unit prices and quantities', () => {
    const store = useCartStore()
    store.items = [
      makeCartItem({ id: 1, quantity: 2, prices: makePrices(900, 2.7, { huf: 1000, eur: 3 }) }),
      makeCartItem({ id: 2, quantity: 3, prices: makePrices(250, 0.7) }),
    ]

    expect(store.totalAmount).toBe(2550)
    expect(store.totalQuantity).toBe(5)
    expect(store.getTotalInCurrency()).toBe(2550)
  })

  it('a line item without a price list does not affect the total', () => {
    const store = useCartStore()
    store.items = [
      makeCartItem({ id: 1, quantity: 1, prices: makePrices(900, 2.7) }),
      makeCartItem({ id: 2, quantity: 4, prices: undefined }),
    ]

    expect(store.totalAmount).toBe(900)
  })

  it('sums the total in integer minor units', () => {
    const store = useCartStore()
    store.items = [
      makeCartItem({
        id: 1,
        quantity: 3,
        prices: { huf: { list: 20, final: 19.99, list_minor: 2000, final_minor: 1999 } } as any,
      }),
      makeCartItem({
        id: 2,
        quantity: 2,
        prices: { huf: { list: 5, final: 5, list_minor: 500, final_minor: 500 } } as any,
      }),
    ]

    expect(store.totalMinor).toBe(6997)
    expect(store.totalAmount).toBe(69.97)
  })

  it('prefers the minor unit values over the display values', () => {
    const store = useCartStore()
    store.items = [
      makeCartItem({
        id: 1,
        quantity: 3,
        prices: { huf: { list: 0.1, final: 0.1, list_minor: 10, final_minor: 10 } } as any,
      }),
    ]

    expect(store.totalMinor).toBe(30)
    expect(store.totalAmount).toBe(0.3)
  })

  it('falls back to the display price when the minor values are missing', () => {
    const store = useCartStore()
    store.items = [
      makeCartItem({
        id: 1,
        quantity: 2,
        prices: { huf: { list: 20, final: 19.99 } } as any,
      }),
    ]

    expect(store.totalMinor).toBe(3998)
  })

  it('shows an add-to-cart notification that disappears after 4 seconds', () => {
    vi.useFakeTimers()
    const store = useCartStore()

    store.addToCart(makeProduct({ name: 'Notification Product' }))

    expect(store.showNotification).toBe(true)
    expect(store.lastAddedProduct?.name).toBe('Notification Product')

    vi.advanceTimersByTime(4000)

    expect(store.showNotification).toBe(false)
  })

  describe('refreshPrices', () => {
    it('overwrites cart prices with the server price list', async () => {
      const store = useCartStore()
      store.items = [makeCartItem({ id: 1, quantity: 2, prices: makePrices(900, 2.7) })]

      mockedGet.mockResolvedValueOnce({
        data: { '1': { prices: makePrices(950, 2.9) } },
      })

      await store.refreshPrices()

      expect(mockedGet).toHaveBeenCalledWith('/api/products/prices', { params: { ids: '1' } })
      expect(store.items[0]!.prices?.huf?.final).toBe(950)
      expect(store.totalAmount).toBe(1900)
    })

    it('uses the minor unit values returned by the server', async () => {
      const store = useCartStore()
      store.items = [makeCartItem({ id: 1, quantity: 2, prices: makePrices(900, 2.7) })]

      mockedGet.mockResolvedValueOnce({
        data: {
          '1': {
            prices: { huf: { list: 1000, final: 950, list_minor: 100000, final_minor: 95000 } },
          },
        },
      })

      await store.refreshPrices()

      expect(store.totalMinor).toBe(190000)
    })

    it('fetches all IDs in a single request', async () => {
      const store = useCartStore()
      store.items = [makeCartItem({ id: 1 }), makeCartItem({ id: 2 }), makeCartItem({ id: 3 })]

      mockedGet.mockResolvedValueOnce({
        data: {
          '1': { prices: makePrices(1) },
          '2': { prices: makePrices(2) },
          '3': { prices: makePrices(3) },
        },
      })

      await store.refreshPrices()

      expect(mockedGet).toHaveBeenCalledTimes(1)
      expect(mockedGet).toHaveBeenCalledWith('/api/products/prices', { params: { ids: '1,2,3' } })
    })

    it('removes products that no longer exist from the cart', async () => {
      const store = useCartStore()
      store.items = [makeCartItem({ id: 1 }), makeCartItem({ id: 2 })]

      mockedGet.mockResolvedValueOnce({ data: { '1': { prices: makePrices(900) } } })

      await store.refreshPrices()

      expect(store.items.map((item) => item.id)).toEqual([1])
    })

    it('keeps the cart unchanged when a network error occurs', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const store = useCartStore()
      store.items = [makeCartItem({ id: 1, prices: makePrices(900) })]

      mockedGet.mockRejectedValueOnce(new Error('Network Error'))

      await store.refreshPrices()

      expect(store.items).toHaveLength(1)
      expect(store.items[0]!.prices?.huf?.final).toBe(900)
      errorSpy.mockRestore()
    })

    it('does not send a request when the cart is empty', async () => {
      const store = useCartStore()

      await store.refreshPrices()

      expect(mockedGet).not.toHaveBeenCalled()
    })
  })
})