import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useProductStore } from '@/stores/productStore'
import axios from 'axios'

vi.mock('axios')

describe('ProductStore Specifikáció', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers() 
  })

  const mockProducts = [
    { id: 1, name: 'Smartphone', description: 'Great for any office', price: 100, discount: 0, image: '', category: 'electronics' },
    { id: 2, name: 'Office Chair', description: 'Ergonomic', price: 200, discount: 0, image: '', category: 'furniture' },
    { id: 3, name: 'Desk Lamp', description: 'Bright light', price: 50, discount: 0, image: '', category: 'furniture' }
  ]

  it('a szűrés helyesen adja vissza a találatokat név alapján', () => {
  const store = useProductStore()
  store.products = mockProducts
  store.searchQuery = 'desk'
  
  expect(store.filteredProducts).toHaveLength(1)
  expect(store.filteredProducts[0]?.name).toBe('Desk Lamp') 
})

it('relevancia: a névvel kezdődő találat előrébb kerül...', () => {
  const store = useProductStore()
  store.products = mockProducts
  store.searchQuery = 'of'
  
  const results = store.filteredProducts
  expect(results).toHaveLength(2)
  expect(results[0]?.name).toBe('Office Chair')
  expect(results[1]?.name).toBe('Smartphone')
})

  it('updateSearchQuery késleltetve (debounce) frissíti a keresési feltételt', () => {
    const store = useProductStore()
    store.updateSearchQuery('apple')
    
    
    expect(store.searchQuery).toBe('')
    
    vi.advanceTimersByTime(300)
    expect(store.searchQuery).toBe('apple')
  })

  

  it('fetchProducts sikeresen betölti a termékeket az API-ról', async () => {
    const store = useProductStore()
    ;(axios.get as any).mockResolvedValueOnce({
      data: { products: mockProducts }
    })

    await store.fetchProducts()

    expect(store.products).toEqual(mockProducts)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchProducts hiba esetén beállítja az error változót', async () => {
    const store = useProductStore()
    const errorMsg = 'Network Error'
    ;(axios.get as any).mockRejectedValueOnce(new Error(errorMsg))

    await store.fetchProducts()

    expect(store.products).toEqual([])
    expect(store.error).toContain(errorMsg)
    expect(store.isLoading).toBe(false)
  })

  it('fetchCategories kategóriákká alakítja a kapott string tömböt', async () => {
    const store = useProductStore()
    const mockCategories = ['electronics', 'furniture']
    ;(axios.get as any).mockResolvedValueOnce({ data: mockCategories })

    await store.fetchCategories()

    expect(store.categories.length).toBe(2)
    expect(store.categories[0]).toEqual({ id: 0, name: 'electronics', slug: 'electronics' })
  })

  it('fetchProductById visszatér egyetlen termékkel', async () => {
    const store = useProductStore()
    const singleProduct = mockProducts[0]
    ;(axios.get as any).mockResolvedValueOnce({ data: singleProduct })

    const result = await store.fetchProductById(1)

    expect(result).toEqual(singleProduct)
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/products/1'))
  })

  it('clearSearch törli a keresési feltételt', () => {
    const store = useProductStore()
    store.searchQuery = 'valami'
    store.clearSearch()
    expect(store.searchQuery).toBe('')
  })
})