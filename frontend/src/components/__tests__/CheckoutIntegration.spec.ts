import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import axios from 'axios'
import { useCheckoutStore } from '@/stores/checkoutStore'
import { useCartStore } from '@/stores/cartStore'
import { useAuthStore } from '@/stores/authStore'
import { makeCartItem, makePrices } from './fixtures'

vi.mock('axios')
vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))
vi.mock('@/i18n/i18n', () => ({
  getCurrentCurrency: () => 'huf',
  default: {},
}))

const mockedGet = vi.mocked(axios.get)
const mockedPost = vi.mocked(axios.post)

const prepare = () => {
  const checkoutStore = useCheckoutStore()
  const cartStore = useCartStore()
  const authStore = useAuthStore()

  authStore.isAuthenticated = true
  authStore.isInitialized = true
  cartStore.items = [makeCartItem({ id: 1, name: 'Shoes', quantity: 1, prices: makePrices(9990, 28) })]

  return { checkoutStore, cartStore, authStore }
}

describe('Checkout Flow Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('the store considers the state valid after shipping details are completed', () => {
    const { checkoutStore } = prepare()

    expect(checkoutStore.isReadyToPlaceOrder).toBe(false)

    Object.assign(checkoutStore.shippingDetails, {
      first_name: 'John',
      last_name: 'Doe',
      city: 'Budapest',
      email: 'john.doe@example.com',
      phone: '+36123456789',
      zipcode: '1011',
      street: 'Main Street',
      house_number: '1',
    })

    checkoutStore.paymentMethod = 'credit_card_stripe'
    checkoutStore.termsAccepted = true
    checkoutStore.currentStep = 3

    expect(checkoutStore.isReadyToPlaceOrder).toBe(false)

    checkoutStore.paymentIntentClientSecret = 'pi_123_secret_456'

    expect(checkoutStore.isReadyToPlaceOrder).toBe(true)
  })

  it('the order can be placed after the payment secret is created', async () => {
    const { checkoutStore } = prepare()

    checkoutStore.shippingDetails.first_name = 'John'
    checkoutStore.shippingDetails.city = 'Budapest'
    checkoutStore.paymentMethod = 'credit_card_stripe'
    checkoutStore.termsAccepted = true
    checkoutStore.currentStep = 3

    mockedGet.mockResolvedValueOnce({ data: { '1': { prices: makePrices(9990, 28) } } })
    mockedPost.mockResolvedValueOnce({ data: { client_secret: 'pi_123_secret_456', total: 9990, total_minor: 999000 } })

    expect(await checkoutStore.createPaymentIntent()).toBe(true)
    expect(checkoutStore.isReadyToPlaceOrder).toBe(true)
  })

  it('handles a successful Stripe card payment flow', async () => {
    const { checkoutStore, cartStore } = prepare()

    checkoutStore.paymentMethod = 'credit_card_stripe'
    checkoutStore.paymentIntentClientSecret = 'pi_123_secret_456'
    checkoutStore.shippingDetails.first_name = 'John'
    checkoutStore.shippingDetails.city = 'Budapest'
    checkoutStore.termsAccepted = true

    mockedPost
      .mockResolvedValueOnce({ data: { order_id: 'ORD-123' } })
      .mockResolvedValueOnce({ status: 200 })
    mockedGet.mockResolvedValueOnce({ data: [] })

    const mockStripe = {
      confirmPayment: vi.fn().mockResolvedValue({ error: null }),
    }

    const result = await checkoutStore.placeOrder(mockStripe, {})

    expect(result).toBe(true)
    expect(mockStripe.confirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({ clientSecret: 'pi_123_secret_456' }),
    )
    expect(checkoutStore.currentStep).toBe(4)
    expect(checkoutStore.paymentError).toBeNull()
    expect(cartStore.items).toHaveLength(0)
  })

  it('handles a failed Stripe payment and preserves the cart', async () => {
    const { checkoutStore, cartStore } = prepare()

    checkoutStore.paymentMethod = 'credit_card_stripe'
    checkoutStore.paymentIntentClientSecret = 'pi_123_secret_456'
    checkoutStore.shippingDetails.first_name = 'John'
    checkoutStore.shippingDetails.city = 'Budapest'
    checkoutStore.termsAccepted = true

    mockedPost.mockResolvedValueOnce({ data: { order_id: 'ORD-123' } })

    const mockStripe = {
      confirmPayment: vi.fn().mockResolvedValue({
        error: { message: 'Insufficient funds on the card.' },
      }),
    }

    const result = await checkoutStore.placeOrder(mockStripe, {})

    expect(result).toBe(false)
    expect(checkoutStore.paymentError).toBe('Insufficient funds on the card.')
    expect(checkoutStore.isProcessingOrder).toBe(false)
    expect(cartStore.items).toHaveLength(1)
  })
})