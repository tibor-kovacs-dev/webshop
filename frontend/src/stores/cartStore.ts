import { defineStore } from 'pinia'
import axios from 'axios'
import { ref, computed } from 'vue'
import { type Product } from './productStore'
import { usePrice } from '@/composables/usePrice'

export interface CartItem extends Product {
  quantity: number
}

export const useCartStore = defineStore(
  'cart',
  () => {
    const { sumMinor } = usePrice()

    const items = ref<CartItem[]>([])
    const lastAddedProduct = ref<CartItem | null>(null)
    const showNotification = ref<boolean>(false)

    const totalMinor = computed<number>(() => sumMinor(items.value))

    const totalAmount = computed<number>(() => totalMinor.value / 100)

    const totalQuantity = computed<number>(() => {
      return items.value.reduce((total, item) => total + item.quantity, 0)
    })

    function addToCart(product: Product & { quantity?: number }) {
      const existingItem = items.value.find((item) => item.id === product.id)

      if (existingItem) {
        existingItem.quantity++
        existingItem.prices = product.prices ?? existingItem.prices
      } else {
        items.value.push({
          ...product,
          quantity: product.quantity || 1,
        } as CartItem)
      }

      const foundItem = items.value.find((item) => item.id === product.id)
      lastAddedProduct.value = foundItem || null
      showNotification.value = true
      setTimeout(() => {
        showNotification.value = false
      }, 4000)
    }

    function removeFromCart(productId: number | string) {
      const existingItem = items.value.find((item) => item.id === productId)
      if (!existingItem) return

      if (existingItem.quantity > 1) {
        existingItem.quantity--
      } else {
        items.value = items.value.filter((item) => item.id !== productId)
      }
    }

    function removeAllOfItem(productId: number | string) {
      items.value = items.value.filter((item) => item.id !== productId)
    }

    function clearCart() {
      items.value = []
      lastAddedProduct.value = null
      showNotification.value = false
    }

    async function refreshPrices(): Promise<void> {
      if (items.value.length === 0) return

      try {
        const response = await axios.get<Record<string, { prices: Product['prices'] }>>(
          '/api/products/prices',
          {
            params: {
              ids: items.value.map((item) => item.id).join(','),
            },
          },
        )

        const priceMap = response.data ?? {}

        items.value = items.value
          .filter((item) => priceMap[String(item.id)])
          .map((item) => ({
            ...item,
            prices: priceMap[String(item.id)]?.prices,
          }))
      } catch (error) {
        console.error('Cart price refresh failed:', error)
      }
    }

    function getTotalInCurrency(targetCurrency: string = 'HUF'): number {
      return totalAmount.value
    }

    function resetCart() {
      clearCart()
    }

    return {
      items,
      totalQuantity,
      totalMinor,
      totalAmount,
      lastAddedProduct,
      showNotification,
      addToCart,
      removeFromCart,
      removeAllOfItem,
      clearCart,
      resetCart,
      refreshPrices,
      getTotalInCurrency,
    }
  },
  {
    persist: {
      storage: localStorage,
      paths: ['items'],
    } as any,
  },
)