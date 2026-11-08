import { defineStore } from 'pinia'
import axios from 'axios'
import { ref, computed } from 'vue'
import type { ProductPrices } from '@/composables/usePrice'

export interface Product {
  id: number | string
  slug: string
  name: string
  price: number
  prices?: ProductPrices
  discount: number
  image: string
  gallery_images?: string[]
  category: string
  description: string | Record<string, string>
  stock?: number
  created_at?: string
  rating?: {
    rate: number
    count: number
  }
}

export interface Category {
  id: number
  name: string
  slug: string
}

export const useProductStore = defineStore('product', () => {
  const API_URL = import.meta.env.VITE_API_BASE_URL

  const products = ref<Product[]>([])
  const categories = ref<Category[]>([])
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  const newArrivals = ref<Product[]>([])
  const discountedProducts = ref<Product[]>([])
  const specialsLoading = ref<boolean>(false)

  const searchQuery = ref<string>('')
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null

  const filteredProducts = computed(() => {
    const query = searchQuery.value.toLowerCase().trim()

    if (!query) return products.value

    const results = products.value.filter((product) => {
      const nameMatch = product.name?.toLowerCase().includes(query)
      const categoryMatch = product.category?.toLowerCase().includes(query)

      const descText =
        typeof product.description === 'string'
          ? product.description
          : JSON.stringify(product.description)

      const descriptionMatch = descText?.toLowerCase().includes(query)

      return nameMatch || categoryMatch || descriptionMatch
    })

    return results.sort((a, b) => {
      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()

      const aStarts = aName.startsWith(query) ? 1 : 0
      const bStarts = bName.startsWith(query) ? 1 : 0

      if (aStarts !== bStarts) return bStarts - aStarts

      const aInName = aName.includes(query) ? 1 : 0
      const bInName = bName.includes(query) ? 1 : 0

      return bInName - aInName
    })
  })

  const hasSearchActive = computed(() => searchQuery.value.trim().length > 0)

  function updateSearchQuery(query: string): void {
    if (debounceTimeout) clearTimeout(debounceTimeout)

    debounceTimeout = setTimeout(() => {
      searchQuery.value = query
    }, 300)
  }

  function clearSearch(): void {
    if (debounceTimeout) clearTimeout(debounceTimeout)

    searchQuery.value = ''
  }

  async function fetchProducts(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const response = await axios.get<{ products: Product[] }>(
        `${API_URL}/api/products`,
      )

      products.value = response.data.products
    } catch (err) {
      console.error('Failed to load products:', err)
      error.value = 'errors.products.loadFailed'
      products.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function fetchProductBySlug(slug: string): Promise<Product | null> {
    if (!slug) {
      error.value = 'errors.products.slugMissing'
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await axios.get<Product>(
        `${API_URL}/api/products/${encodeURIComponent(slug)}`,
      )

      return response.data
    } catch (err) {
      console.error('Failed to load the product details:', err)
      error.value = 'errors.products.detailsFailed'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function fetchProductsByCategory(categoryName: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const response = await axios.get<Product[]>(
        `${API_URL}/api/products/category/${encodeURIComponent(categoryName)}`,
      )

      products.value = response.data
    } catch (err) {
      console.error('Failed to load the category:', err)
      error.value = 'errors.products.categoryFailed'
      products.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function fetchCategories(): Promise<void> {
    if (categories.value.length > 0) return

    isLoading.value = true
    error.value = null

    try {
      const response = await axios.get<string[]>(
        `${API_URL}/api/products/categories`,
      )

      categories.value = response.data.map((catName, index) => ({
        id: index,
        name: catName,
        slug: catName,
      }))
    } catch (err) {
      console.error('Failed to load the categories:', err)
      error.value = 'errors.products.categoriesFailed'
      categories.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function fetchNewArrivals(limit: number = 8): Promise<void> {
    specialsLoading.value = true
    error.value = null

    try {
      const response = await axios.get<Product[]>(
        `${API_URL}/api/products/new?limit=${limit}`,
      )

      newArrivals.value = response.data
    } catch (err) {
      console.error('Failed to load new arrivals:', err)
      error.value = 'errors.products.loadFailed'
    } finally {
      specialsLoading.value = false
    }
  }

  async function fetchDiscountedProducts(limit: number = 8): Promise<void> {
    specialsLoading.value = true
    error.value = null

    try {
      const response = await axios.get<Product[]>(
        `${API_URL}/api/products/discounted?limit=${limit}`,
      )

      discountedProducts.value = response.data
    } catch (err) {
      console.error('Failed to load discounted products:', err)
      error.value = 'errors.products.loadFailed'
    } finally {
      specialsLoading.value = false
    }
  }

  return {
    products,
    categories,
    isLoading,
    error,
    newArrivals,
    discountedProducts,
    specialsLoading,
    searchQuery,
    filteredProducts,
    hasSearchActive,
    updateSearchQuery,
    clearSearch,
    fetchProducts,
    fetchProductBySlug,
    fetchProductsByCategory,
    fetchCategories,
    fetchNewArrivals,
    fetchDiscountedProducts,
  }
})