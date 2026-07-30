import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCheckoutStore } from '@/stores/checkoutStore'
import { useCartStore } from '@/stores/cartStore'
import { useAuthStore } from '@/stores/authStore'
import axios from 'axios'
import router from '@/router'

vi.mock('axios')
vi.mock('@/router', () => ({
  default: { push: vi.fn() }
}))

describe('CheckoutStore Specifikáció', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    vi.stubGlobal('alert', vi.fn())
  })



  it('placeOrder hiba esetén leállítja a folyamatot és beállítja a hibaüzenetet', async () => {
    const store = useCheckoutStore()
    const authStore = useAuthStore()
    const cartStore = useCartStore()

    authStore.isAuthenticated = true
    cartStore.items = [{ id: 1, quantity: 1, price: 100 } as any]
    store.paymentMethod = 'cash'
    store.termsAccepted = true

    ;(axios.post as any).mockRejectedValueOnce(new Error('Database error'))

    const result = await store.placeOrder()

    expect(result).toBe(false)
    expect(store.isProcessingOrder).toBe(false)
    expect(store.paymentError).toBe('checkout.errors.orderFailed')
  })

  it('lekezeli a Stripe megerősítési hibát', async () => {
    const store = useCheckoutStore()
    const authStore = useAuthStore()
    const cartStore = useCartStore()

    authStore.isAuthenticated = true
    cartStore.items = [{ id: 1, quantity: 1, price: 100 } as any]
    store.paymentMethod = 'credit_card_stripe'
    store.paymentIntentClientSecret = 'pi_123_secret_456'
    store.termsAccepted = true


    ;(axios.post as any).mockResolvedValueOnce({ data: { order_id: 'ORDER-123' } })

    const mockStripe = {
      confirmPayment: vi.fn().mockResolvedValueOnce({
        error: { message: 'A kártyán nincs elég fedezet.' }
      })
    }
    const mockElements = {}

    const result = await store.placeOrder(mockStripe, mockElements)

    expect(result).toBe(false)
    expect(store.paymentError).toBe('A kártyán nincs elég fedezet.')
    expect(store.isProcessingOrder).toBe(false)
  })

  it('megakadályozza a rendelést, ha nincs bejelentkezett felhasználó', async () => {
    const store = useCheckoutStore()
    const authStore = useAuthStore()
    
    authStore.isAuthenticated = false

    const result = await store.placeOrder()

    expect(result).toBe(false)
    expect(store.paymentError).toBe('checkout.errors.missingData')
  })

  it('finalizeSuccessfulOrder hiba esetén beállítja a megfelelő hibaüzenetet', async () => {
    const store = useCheckoutStore()
    ;(axios.post as any).mockRejectedValueOnce(new Error('Finalize failed'))

    const result = await store.finalizeSuccessfulOrder('pi_123')

    expect(result).toBe(false)
    expect(store.paymentError).toBe('checkout.errors.finalizeFailed')
  })

  it('loadOrderForRetry hiba esetén a kosárhoz irányít', async () => {
    const store = useCheckoutStore()
    ;(axios.get as any).mockRejectedValueOnce(new Error('Not found'))

    const result = await store.loadOrderForRetry(999)

    expect(result).toBe(false)
    expect(router.push).toHaveBeenCalledWith('/cart')
  })
})