import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import axios from 'axios'
import { useProductStore } from '@/stores/productStore'
import { makeProduct } from './fixtures'

vi.mock('axios')

const mockedGet = vi.mocked(axios.get)

describe('ProductStore tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const mockProducts = [
    makeProduct({ id: 1, slug: 'smartphone', name: 'Smartphone', description: 'Great for any office', category: 'electronics' }),
    makeProduct({ id: 2, slug: 'office-chair', name: 'Office Chair', description: 'Ergonomic', category: 'furniture' }),
    makeProduct({ id: 3, slug: 'desk-lamp', name: 'Desk Lamp', description: 'Bright light', category: 'furniture' }),
  ]

  describe('search', () => {
    it('filters and returns the correct results by name', () => {
      const store = useProductStore()
      store.products = mockProducts
      store.searchQuery = 'desk'

      expect(store.filteredProducts).toHaveLength(1)
      expect(store.filteredProducts[0]?.name).toBe('Desk Lamp')
    })

    it('relevance: results whose names start with the query appear first', () => {
      const store = useProductStore()
      store.products = mockProducts
      store.searchQuery = 'of'

      const results = store.filteredProducts
      expect(results).toHaveLength(2)
      expect(results[0]?.name).toBe('Office Chair')
      expect(results[1]?.name).toBe('Smartphone')
    })

    it('searches category names and descriptions', () => {
      const store = useProductStore()
      store.products = mockProducts

      store.searchQuery = 'furniture'
      expect(store.filteredProducts).toHaveLength(2)

      store.searchQuery = 'ergonomic'
      expect(store.filteredProducts.map((product) => product.name)).toEqual(['Office Chair'])
    })

    it('also searches multilingual (object-based) descriptions', () => {
      const store = useProductStore()
      store.products = [makeProduct({ name: 'Phone', description: { hu: 'Great camera', en: 'Great camera' } })]
      store.searchQuery = 'camera'

      expect(store.filteredProducts).toHaveLength(1)
    })

    it('returns all products when the search query is empty', () => {
      const store = useProductStore()
      store.products = mockProducts

      expect(store.filteredProducts).toHaveLength(3)
      expect(store.hasSearchActive).toBe(false)
    })

    it('updateSearchQuery updates the search query after the debounce delay', () => {
      const store = useProductStore()
      store.updateSearchQuery('apple')

      expect(store.searchQuery).toBe('')

      vi.advanceTimersByTime(300)
      expect(store.searchQuery).toBe('apple')
      expect(store.hasSearchActive).toBe(true)
    })

    it('a newer query cancels the previous delayed update', () => {
      const store = useProductStore()
      store.updateSearchQuery('app')
      vi.advanceTimersByTime(200)
      store.updateSearchQuery('apple')
      vi.advanceTimersByTime(200)

      expect(store.searchQuery).toBe('')

      vi.advanceTimersByTime(100)
      expect(store.searchQuery).toBe('apple')
    })

    it('clearSearch clears the search query and any pending update', () => {
      const store = useProductStore()
      store.updateSearchQuery('something')
      store.clearSearch()
      vi.advanceTimersByTime(500)

      expect(store.searchQuery).toBe('')
    })
  })

  describe('fetching data', () => {
    it('fetchProducts successfully loads products from the API', async () => {
      const store = useProductStore()
      mockedGet.mockResolvedValueOnce({ data: { products: mockProducts } })

      await store.fetchProducts()

      expect(store.products).toEqual(mockProducts)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(mockedGet).toHaveBeenCalledWith(expect.stringContaining('/api/products'))
    })

    it('fetchProducts sets a translation key when the request fails', async () => {
      const store = useProductStore()
      mockedGet.mockRejectedValueOnce(new Error('Network Error'))

      await store.fetchProducts()

      expect(store.products).toEqual([])
      expect(store.error).toBe('errors.products.loadFailed')
      expect(store.isLoading).toBe(false)
    })

    it('fetchCategories converts the returned string array into categories', async () => {
      const store = useProductStore()
      mockedGet.mockResolvedValueOnce({ data: ['electronics', 'furniture'] })

      await store.fetchCategories()

      expect(store.categories).toHaveLength(2)
      expect(store.categories[0]).toEqual({ id: 0, name: 'electronics', slug: 'electronics' })
    })

    it('fetchCategories does not fetch again when categories are already loaded', async () => {
      const store = useProductStore()
      mockedGet.mockResolvedValue({ data: ['electronics'] })

      await store.fetchCategories()
      await store.fetchCategories()

      expect(mockedGet).toHaveBeenCalledTimes(1)
    })

    it('fetchCategories sets a translation key when the request fails', async () => {
      const store = useProductStore()
      mockedGet.mockRejectedValueOnce(new Error('Network Error'))

      await store.fetchCategories()

      expect(store.categories).toEqual([])
      expect(store.error).toBe('errors.products.categoriesFailed')
    })

    it('fetchProductBySlug fetches and returns the product by slug', async () => {
      const store = useProductStore()
      const product = mockProducts[0]!
      mockedGet.mockResolvedValueOnce({ data: product })

      const result = await store.fetchProductBySlug('smartphone')

      expect(result).toEqual(product)
      expect(mockedGet).toHaveBeenCalledWith(expect.stringContaining('/api/products/smartphone'))
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('fetchProductBySlug encodes special characters', async () => {
      const store = useProductStore()
      mockedGet.mockResolvedValueOnce({ data: mockProducts[0] })

      await store.fetchProductBySlug('shoes & socks')

      expect(mockedGet).toHaveBeenCalledWith(expect.stringContaining('/api/products/shoes%20%26%20socks'))
    })

    it('fetchProductBySlug returns null and sets a translation key when the request fails', async () => {
      const store = useProductStore()
      mockedGet.mockRejectedValueOnce(new Error('Request failed with status code 404'))

      const result = await store.fetchProductBySlug('non-existent-product')

      expect(result).toBeNull()
      expect(store.error).toBe('errors.products.detailsFailed')
      expect(store.isLoading).toBe(false)
    })

    it('fetchProductBySlug does not call the server when the slug is empty', async () => {
      const store = useProductStore()

      expect(await store.fetchProductBySlug('')).toBeNull()
      expect(store.error).toBe('errors.products.slugMissing')
      expect(mockedGet).not.toHaveBeenCalled()
    })

    it('fetchProductsByCategory loads products for the category', async () => {
      const store = useProductStore()
      mockedGet.mockResolvedValueOnce({ data: [mockProducts[1], mockProducts[2]] })

      await store.fetchProductsByCategory('furniture')

      expect(store.products).toHaveLength(2)
      expect(mockedGet).toHaveBeenCalledWith(expect.stringContaining('/api/products/category/furniture'))
    })

    it('fetchProductsByCategory clears the list and sets a translation key when the request fails', async () => {
      const store = useProductStore()
      store.products = mockProducts
      mockedGet.mockRejectedValueOnce(new Error('404'))

      await store.fetchProductsByCategory('unknown-category')

      expect(store.products).toEqual([])
      expect(store.error).toBe('errors.products.categoryFailed')
    })

    it('fetchNewArrivals and fetchDiscountedProducts use the limit parameter', async () => {
      const store = useProductStore()
      mockedGet
        .mockResolvedValueOnce({ data: [mockProducts[0]] })
        .mockResolvedValueOnce({ data: [mockProducts[1]] })

      await store.fetchNewArrivals(4)
      await store.fetchDiscountedProducts(6)

      expect(mockedGet).toHaveBeenNthCalledWith(1, expect.stringContaining('/api/products/new?limit=4'))
      expect(mockedGet).toHaveBeenNthCalledWith(2, expect.stringContaining('/api/products/discounted?limit=6'))
      expect(store.newArrivals).toEqual([mockProducts[0]])
      expect(store.discountedProducts).toEqual([mockProducts[1]])
      expect(store.specialsLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('fetchNewArrivals sets a translation key when the request fails', async () => {
      const store = useProductStore()
      mockedGet.mockRejectedValueOnce(new Error('Network Error'))

      await store.fetchNewArrivals()

      expect(store.error).toBe('errors.products.loadFailed')
      expect(store.specialsLoading).toBe(false)
    })

    it('fetchDiscountedProducts sets a translation key when the request fails', async () => {
      const store = useProductStore()
      mockedGet.mockRejectedValueOnce(new Error('Network Error'))

      await store.fetchDiscountedProducts()

      expect(store.error).toBe('errors.products.loadFailed')
      expect(store.specialsLoading).toBe(false)
    })

    it('a successful request clears a previous error', async () => {
      const store = useProductStore()
      mockedGet.mockRejectedValueOnce(new Error('Network Error'))
      await store.fetchNewArrivals()
      expect(store.error).not.toBeNull()

      mockedGet.mockResolvedValueOnce({ data: [mockProducts[0]] })
      await store.fetchNewArrivals()

      expect(store.error).toBeNull()
    })
  })
})