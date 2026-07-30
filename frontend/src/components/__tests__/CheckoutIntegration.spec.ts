import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCheckoutStore } from '@/stores/checkoutStore'
import { useCartStore } from '@/stores/cartStore'
import { useAuthStore } from '@/stores/authStore'
import axios from 'axios'

vi.mock('axios')

describe('Checkout Folyamat Integráció', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('szállítási adatok kitöltése után a Store validnak érzékeli az állapotot', async () => {
    const checkoutStore = useCheckoutStore()
    const cartStore = useCartStore()
    const authStore = useAuthStore()

    authStore.isAuthenticated = true
    cartStore.items = [{ id: 1, name: 'Cipő', price: 100, quantity: 1, discount: 0 } as any]

    expect(checkoutStore.isReadyToPlaceOrder).toBe(false)

    Object.assign(checkoutStore.shippingDetails, {
      first_name: 'Teszt',
      last_name: 'Elek',
      city: 'Budapest',
      email: 'teszt@elek.hu',
      phone: '+36301234567',
      zipcode: '1011',
      street: 'Fő utca',
      house_number: '1'
    })

    checkoutStore.paymentMethod = 'cash'
    checkoutStore.termsAccepted = true
    checkoutStore.currentStep = 2 

    expect(checkoutStore.isReadyToPlaceOrder).toBe(true)
  })

  it('lekezeli a sikeres Stripe kártyás fizetési folyamatot', async () => {
    const checkoutStore = useCheckoutStore()
    const cartStore = useCartStore()
    const authStore = useAuthStore()

    authStore.isAuthenticated = true
    cartStore.items = [{ id: 1, name: 'Cipő', price: 100, quantity: 1, discount: 0 } as any]
    checkoutStore.paymentMethod = 'credit_card_stripe'
    checkoutStore.paymentIntentClientSecret = 'pi_123_secret_456'

    checkoutStore.shippingDetails.first_name = 'Teszt'
    checkoutStore.shippingDetails.city = 'Budapest'
    checkoutStore.termsAccepted = true

    ;(axios.post as any).mockResolvedValueOnce({ data: { order_id: 'ORD-123' } })

    ;(axios.post as any).mockResolvedValueOnce({ status: 200 })

    ;(axios.get as any).mockResolvedValueOnce({ data: [] })


    const mockStripe = {
      confirmPayment: vi.fn().mockResolvedValue({ error: null }) // Sikerült a fizetés!
    }
    const mockElements = {}


    const result = await checkoutStore.placeOrder(mockStripe, mockElements)


    expect(result).toBe(true)
    expect(mockStripe.confirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        clientSecret: 'pi_123_secret_456'
      })
    )
    expect(checkoutStore.currentStep).toBe(4) // Sikeres befejezés (Köszönő oldal)
    expect(checkoutStore.paymentError).toBeNull()
  })

  it('lekezeli, ha a Stripe fizetés meghiúsul', async () => {
    const checkoutStore = useCheckoutStore()
    const cartStore = useCartStore()
    const authStore = useAuthStore()

    authStore.isAuthenticated = true
    cartStore.items = [{ id: 1, name: 'Cipő', price: 100, quantity: 1 } as any]
    checkoutStore.paymentMethod = 'credit_card_stripe'
    checkoutStore.shippingDetails.first_name = 'Teszt'
    checkoutStore.shippingDetails.city = 'Budapest'
    checkoutStore.termsAccepted = true


    ;(axios.post as any).mockResolvedValueOnce({ data: { order_id: 'ORD-123' } })

    const mockStripe = {
      confirmPayment: vi.fn().mockResolvedValue({ 
        error: { message: 'A kártyán nincs elég fedezet.' } 
      })
    }
    
    const result = await checkoutStore.placeOrder(mockStripe, {})

    expect(result).toBe(false)
    expect(checkoutStore.paymentError).toBe('A kártyán nincs elég fedezet.')
    expect(checkoutStore.isProcessingOrder).toBe(false)
  })
})