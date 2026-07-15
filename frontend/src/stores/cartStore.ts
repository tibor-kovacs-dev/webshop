import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { type Product } from './productStore'
import { useI18n } from 'vue-i18n'
import { usePrice } from '@/composables/usePrice'

export interface CartItem extends Product {
  quantity: number
}

export const useCartStore = defineStore(
  'cart',
  () => {
    const { locale } = useI18n()
    const { convertPrice } = usePrice()

    const items = ref<CartItem[]>([])
    const lastAddedProduct = ref<CartItem | null>(null)
    const showNotification = ref<boolean>(false)

    const totalAmount = computed<number>(() => {
      return items.value.reduce((sum, item) => {
        let price = Number(item.price || 0)
        const discount = Number(item.discount || 0)

        let effectivePrice = discount > 0 ? price * (1 - discount / 100) : price

        effectivePrice = convertPrice(effectivePrice)

        return sum + effectivePrice * (item.quantity || 1)
      }, 0)
    })

    const totalQuantity = computed<number>(() => {
      return items.value.reduce((total, item) => total + item.quantity, 0)
    })

    function addToCart(product: Product & { quantity?: number }) {
      const existingItem = items.value.find((item) => item.id === product.id)

      if (existingItem) {
        existingItem.quantity++
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

    function getTotalInCurrency(targetCurrency: string = 'HUF'): number {
      return totalAmount.value
    }

    function resetCart() {
      clearCart()
    }

    return {
      items,
      totalQuantity,
      totalAmount,
      lastAddedProduct,
      showNotification,
      addToCart,
      removeFromCart,
      removeAllOfItem,
      clearCart,
      resetCart,
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
