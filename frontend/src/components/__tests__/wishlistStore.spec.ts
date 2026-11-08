import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'
import { useWishlistStore } from '@/stores/wishlistStore'
import { makeProduct, makePrices } from './fixtures'

vi.mock('axios')

const mockedGet = vi.mocked(axios.get)

describe('WishlistStore tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  const mockProduct = makeProduct({
    id: 10,
    slug: 'favorite-product',
    name: 'Favorite Product',
    price: 5000,
    prices: makePrices(5000, 14),
  })

  it('adding and removing products updates the list correctly', () => {
    const store = useWishlistStore()

    store.addToWishlist(mockProduct)
    expect(store.wishlistCount).toBe(1)
    expect(store.isInWishlist(10)).toBe(true)

    store.removeFromWishlist(10)
    expect(store.wishlistCount).toBe(0)
    expect(store.isInWishlist(10)).toBe(false)
  })

  it('does not add duplicate products', () => {
    const store = useWishlistStore()
    store.addToWishlist(mockProduct)
    store.addToWishlist(mockProduct)

    expect(store.wishlist).toHaveLength(1)
  })

  it('does not add an incomplete product', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = useWishlistStore()

    store.addToWishlist(undefined as any)
    store.addToWishlist({ name: 'without an ID' } as any)

    expect(store.wishlist).toHaveLength(0)
    warnSpy.mockRestore()
  })

  it('clearWhishlist empties the list', () => {
    const store = useWishlistStore()
    store.addToWishlist(mockProduct)

    store.clearWhishlist()

    expect(store.wishlistCount).toBe(0)
  })

  describe('refreshPrices', () => {
    it('updates saved products using the server price list', async () => {
      const store = useWishlistStore()
      store.addToWishlist(mockProduct)

      mockedGet.mockResolvedValueOnce({ data: { '10': { prices: makePrices(5500, 15) } } })

      await store.refreshPrices()

      expect(mockedGet).toHaveBeenCalledWith('/api/products/prices', { params: { ids: '10' } })
      expect(store.wishlist[0]!.prices?.huf?.final).toBe(5500)
      expect(store.wishlist[0]!.name).toBe('Favorite Product')
    })

    it('removes products that no longer exist from the list', async () => {
      const store = useWishlistStore()
      store.addToWishlist(mockProduct)
      store.addToWishlist(makeProduct({ id: 11, slug: 'another-product' }))

      mockedGet.mockResolvedValueOnce({ data: { '11': { prices: makePrices(100) } } })

      await store.refreshPrices()

      expect(store.wishlist.map((item) => item.id)).toEqual([11])
    })

    it('keeps the list unchanged when an error occurs', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const store = useWishlistStore()
      store.addToWishlist(mockProduct)

      mockedGet.mockRejectedValueOnce(new Error('Network Error'))

      await store.refreshPrices()

      expect(store.wishlist).toHaveLength(1)
      errorSpy.mockRestore()
    })

    it('does not send a request when the list is empty', async () => {
      const store = useWishlistStore()

      await store.refreshPrices()

      expect(mockedGet).not.toHaveBeenCalled()
    })
  })
})