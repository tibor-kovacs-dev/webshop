import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import axios from 'axios'
import router from '@/router'
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

const credentials = expect.objectContaining({ withCredentials: true, withXSRFToken: true })

const setup = () => {
  const store = useCheckoutStore()
  const authStore = useAuthStore()
  const cartStore = useCartStore()

  authStore.isAuthenticated = true
  authStore.isInitialized = true
  cartStore.items = [makeCartItem({ id: 1, quantity: 2, prices: makePrices(900, 2.7, { huf: 1000, eur: 3 }) })]

  return { store, authStore, cartStore }
}

const fillShipping = (store: ReturnType<typeof useCheckoutStore>) => {
  Object.assign(store.shippingDetails, {
    first_name: 'John',
    last_name: 'Doe',
    city: 'Budapest',
    email: 'john.doe@example.com',
    zipcode: '1011',
    street: 'Main Street',
    house_number: '1',
  })
}

const priceMap = (huf = 900) => ({ '1': { prices: makePrices(huf, 2.7, { huf: 1000, eur: 3 }) } })

describe('CheckoutStore tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    localStorage.clear()
  })

  describe('isReadyToPlaceOrder', () => {
    it('is true only when the third step is complete', () => {
      const { store } = setup()

      expect(store.isReadyToPlaceOrder).toBe(false)

      fillShipping(store)
      store.paymentMethod = 'credit_card_stripe'
      store.termsAccepted = true
      store.currentStep = 3
      expect(store.isReadyToPlaceOrder).toBe(false)

      store.paymentIntentClientSecret = 'pi_1_secret_x'
      expect(store.isReadyToPlaceOrder).toBe(true)

      store.termsAccepted = false
      expect(store.isReadyToPlaceOrder).toBe(false)
    })

    it('is false while processing', () => {
      const { store } = setup()
      fillShipping(store)
      store.paymentMethod = 'credit_card_stripe'
      store.termsAccepted = true
      store.currentStep = 3
      store.paymentIntentClientSecret = 'pi_1_secret_x'
      store.isProcessingOrder = true

      expect(store.isReadyToPlaceOrder).toBe(false)
    })
  })

  describe('discountedTotal', () => {
    it('returns the cart total calculated from server-side prices', () => {
      const { store } = setup()

      expect(store.discountedTotal).toBe(1800)
    })
  })

  describe('createPaymentIntent', () => {
    it('refreshes prices before creating the payment using the server total', async () => {
      const { store } = setup()
      store.paymentMethod = 'credit_card_stripe'

      mockedGet.mockResolvedValueOnce({ data: priceMap(900) })
      mockedPost.mockResolvedValueOnce({ data: { client_secret: 'pi_1_secret_x', total: 1800, total_minor: 180000 } })

      const result = await store.createPaymentIntent()

      expect(result).toBe(true)
      expect(store.paymentIntentClientSecret).toBe('pi_1_secret_x')
      expect(mockedGet).toHaveBeenCalledWith('/api/products/prices', { params: { ids: '1' } })
      expect(mockedPost).toHaveBeenCalledWith(
        '/api/checkout/create-intent',
        { currency: 'huf', items: [{ id: 1, quantity: 2 }] },
        credentials,
      )
    })

    it('sends and verifies the updated total after refreshing prices', async () => {
      const { store, cartStore } = setup()
      store.paymentMethod = 'credit_card_stripe'

      mockedGet.mockResolvedValueOnce({ data: priceMap(950) })
      mockedPost.mockResolvedValueOnce({ data: { client_secret: 'pi_2_secret_x', total: 1900, total_minor: 190000 } })

      expect(await store.createPaymentIntent()).toBe(true)
      expect(cartStore.totalAmount).toBe(1900)
    })

    it('does not create a payment when the server total differs', async () => {
      const { store } = setup()
      store.paymentMethod = 'credit_card_stripe'

      mockedGet.mockResolvedValueOnce({ data: priceMap(900) })
      mockedPost.mockResolvedValueOnce({ data: { client_secret: 'pi_1_secret_x', total: 5000 } })

      const result = await store.createPaymentIntent()

      expect(result).toBe(false)
      expect(store.paymentIntentClientSecret).toBeNull()
      expect(store.paymentError).toBe('checkout.errors.intentFailed')
    })

    it('displays the server message when a server error occurs', async () => {
      const { store } = setup()
      store.paymentMethod = 'credit_card_stripe'

      mockedGet.mockResolvedValueOnce({ data: priceMap(900) })
      mockedPost.mockRejectedValueOnce({ response: { data: { message: 'Insufficient stock.' } } })

      expect(await store.createPaymentIntent()).toBe(false)
      expect(store.paymentError).toBe('Insufficient stock.')
      expect(store.paymentIntentClientSecret).toBeNull()
    })

    it('uses the default key when the error has no message', async () => {
      const { store } = setup()
      store.paymentMethod = 'credit_card_stripe'

      mockedGet.mockResolvedValueOnce({ data: priceMap(900) })
      mockedPost.mockRejectedValueOnce(new Error('Network Error'))

      expect(await store.createPaymentIntent()).toBe(false)
      expect(store.paymentError).toBe('checkout.errors.intentFailed')
    })

    it('does not send a request when required data is missing', async () => {
      const { store, authStore, cartStore } = setup()
      store.paymentMethod = 'credit_card_stripe'

      authStore.isAuthenticated = false
      expect(await store.createPaymentIntent()).toBe(false)
      expect(store.paymentError).toBe('checkout.errors.missingData')

      authStore.isAuthenticated = true
      cartStore.items = []
      expect(await store.createPaymentIntent()).toBe(false)

      expect(mockedPost).not.toHaveBeenCalled()
    })

    it('reports missing data if the cart becomes empty after refreshing prices', async () => {
      const { store } = setup()
      store.paymentMethod = 'credit_card_stripe'

      mockedGet.mockResolvedValueOnce({ data: {} })

      expect(await store.createPaymentIntent()).toBe(false)
      expect(store.paymentError).toBe('checkout.errors.missingData')
      expect(mockedPost).not.toHaveBeenCalled()
    })

    it('clears the secret and does not call the server for a non-card payment method', async () => {
      const { store } = setup()
      store.paymentMethod = null
      store.paymentIntentClientSecret = 'old'

      expect(await store.createPaymentIntent()).toBe(false)
      expect(store.paymentIntentClientSecret).toBeNull()
      expect(mockedPost).not.toHaveBeenCalled()
    })

    it('reuses the payment when an order and client secret already exist', async () => {
      const { store } = setup()
      store.paymentMethod = 'credit_card_stripe'
      store.currentOrderId = 7
      store.paymentIntentClientSecret = 'pi_7_secret_x'

      expect(await store.createPaymentIntent()).toBe(true)
      expect(mockedPost).not.toHaveBeenCalled()
      expect(mockedGet).not.toHaveBeenCalled()
    })
  })

  describe('placeOrder', () => {
    const readyStore = () => {
      const context = setup()
      fillShipping(context.store)
      context.store.paymentMethod = 'credit_card_stripe'
      context.store.paymentIntentClientSecret = 'pi_123_secret_456'
      context.store.termsAccepted = true

      return context
    }

    it('does not place an order when signed out', async () => {
      const { store, authStore } = readyStore()
      authStore.isAuthenticated = false

      expect(await store.placeOrder()).toBe(false)
      expect(store.paymentError).toBe('checkout.errors.missingData')
    })

    it('does not place an order with a non-card payment method', async () => {
      const { store } = readyStore()
      store.paymentMethod = null

      expect(await store.placeOrder({}, {})).toBe(false)
      expect(store.paymentError).toBe('checkout.errors.missingData')
    })

    it('does not place an order without accepting the terms and conditions', async () => {
      const { store } = readyStore()
      store.termsAccepted = false

      expect(await store.placeOrder({}, {})).toBe(false)
      expect(store.paymentError).toBe('checkout.errors.termsRequired')
    })

    it('does not place an order without Stripe objects and a payment secret', async () => {
      const { store } = readyStore()

      expect(await store.placeOrder()).toBe(false)
      expect(store.paymentError).toBe('checkout.errors.intentFailed')
      expect(mockedPost).not.toHaveBeenCalled()
    })

    it('stops and sets an error message when order creation fails', async () => {
      const { store } = readyStore()
      mockedPost.mockRejectedValueOnce(new Error('Database error'))

      const stripe = { confirmPayment: vi.fn() }
      const result = await store.placeOrder(stripe, {})

      expect(result).toBe(false)
      expect(store.isProcessingOrder).toBe(false)
      expect(store.paymentError).toBe('checkout.errors.orderFailed')
      expect(stripe.confirmPayment).not.toHaveBeenCalled()
    })

    it('displays the server message when the order is rejected', async () => {
      const { store } = readyStore()
      mockedPost.mockRejectedValueOnce({
        response: { data: { message: 'The payment session does not match.' } },
      })

      expect(await store.placeOrder({ confirmPayment: vi.fn() }, {})).toBe(false)
      expect(store.paymentError).toBe('The payment session does not match.')
    })

    it('sends the fields required for server-side calculations when placing the order', async () => {
      const { store } = readyStore()
      mockedPost.mockResolvedValueOnce({ data: { order_id: 'ORDER-123' } })

      const stripe = { confirmPayment: vi.fn().mockResolvedValue({ error: { message: 'x' } }) }
      await store.placeOrder(stripe, {}, 'en')

      expect(mockedPost).toHaveBeenCalledWith(
        '/api/orders',
        expect.objectContaining({
          payment_method: 'credit_card_stripe',
          payment_intent_id: 'pi_123',
          locale: 'en',
          currency: 'HUF',
          items: [{ product_id: 1, quantity: 2 }],
          shipping_details: expect.stringContaining('Budapest'),
        }),
        credentials,
      )
    })

    it('displays the Stripe message when payment confirmation fails', async () => {
      const { store } = readyStore()
      mockedPost.mockResolvedValueOnce({ data: { order_id: 'ORDER-123' } })

      const stripe = {
        confirmPayment: vi.fn().mockResolvedValueOnce({
          error: { message: 'Insufficient funds on the card.' },
        }),
      }

      const result = await store.placeOrder(stripe, {})

      expect(result).toBe(false)
      expect(store.paymentError).toBe('Insufficient funds on the card.')
      expect(store.isProcessingOrder).toBe(false)
      expect(store.currentOrderId).toBe('ORDER-123')
    })

    it('uses the default key when Stripe does not provide an error message', async () => {
      const { store } = readyStore()
      mockedPost.mockResolvedValueOnce({ data: { order_id: 'ORDER-123' } })

      const stripe = { confirmPayment: vi.fn().mockResolvedValueOnce({ error: {} }) }

      expect(await store.placeOrder(stripe, {})).toBe(false)
      expect(store.paymentError).toBe('checkout.errors.paymentFailed')
    })

    it('does not create a new order when retrying an existing order', async () => {
      const { store } = readyStore()
      store.currentOrderId = 'ORDER-123'

      const stripe = {
        confirmPayment: vi.fn().mockResolvedValueOnce({ error: { message: 'Declined' } }),
      }

      await store.placeOrder(stripe, {})

      expect(mockedPost).not.toHaveBeenCalled()
      expect(stripe.confirmPayment).toHaveBeenCalledTimes(1)
    })

    it('finalizes the order after successful payment and navigates to the thank-you page', async () => {
      const { store, cartStore } = readyStore()

      mockedPost
        .mockResolvedValueOnce({ data: { order_id: 'ORDER-123' } })
        .mockResolvedValueOnce({ status: 202, data: { webhook_pending: true } })
      mockedGet.mockResolvedValueOnce({ data: [] })

      const stripe = { confirmPayment: vi.fn().mockResolvedValue({ error: null }) }

      const result = await store.placeOrder(stripe, {})

      expect(result).toBe(true)
      expect(stripe.confirmPayment).toHaveBeenCalledWith(
        expect.objectContaining({ clientSecret: 'pi_123_secret_456' }),
      )
      expect(mockedPost).toHaveBeenNthCalledWith(
        2,
        '/api/orders/finalize',
        { payment_intent_id: 'pi_123' },
        credentials,
      )
      expect(store.currentStep).toBe(4)
      expect(store.paymentError).toBeNull()
      expect(cartStore.items).toHaveLength(0)
    })
  })

  describe('finalizeSuccessfulOrder', () => {
    it('reports an error when the identifier is missing', async () => {
      const { store } = setup()

      expect(await store.finalizeSuccessfulOrder(null)).toBe(false)
      expect(store.paymentError).toBe('checkout.errors.finalizeFailed')
      expect(mockedPost).not.toHaveBeenCalled()
    })

    it('sets the appropriate error message and preserves the cart on server failure', async () => {
      const { store, cartStore } = setup()
      mockedPost.mockRejectedValueOnce(new Error('Finalize failed'))

      expect(await store.finalizeSuccessfulOrder('pi_123')).toBe(false)
      expect(store.paymentError).toBe('checkout.errors.finalizeFailed')
      expect(cartStore.items).toHaveLength(1)
    })

    it('does not finalize the order when signed out', async () => {
      const { store, authStore } = setup()
      authStore.isAuthenticated = false

      expect(await store.finalizeSuccessfulOrder('pi_123')).toBe(false)
      expect(store.paymentError).toBe('checkout.errors.finalizeFailed')
    })
  })

  describe('handleStripeRedirectCompletion', () => {
    it('finalizes the order and navigates to the thank-you page after successful payment', async () => {
      const { store } = setup()
      mockedPost.mockResolvedValueOnce({ status: 200, data: {} })
      mockedGet.mockResolvedValueOnce({ data: [] })

      const stripe = {
        retrievePaymentIntent: vi.fn().mockResolvedValue({ paymentIntent: { id: 'pi_9', status: 'succeeded' } }),
      }

      expect(await store.handleStripeRedirectCompletion(stripe, 'pi_9_secret_x')).toBe(true)
      expect(router.push).toHaveBeenCalledWith('/checkout/complete')
      expect(store.isProcessingOrder).toBe(false)
    })

    it('does not finalize the order when payment is unsuccessful', async () => {
      const { store } = setup()
      const stripe = {
        retrievePaymentIntent: vi.fn().mockResolvedValue({ paymentIntent: { id: 'pi_9', status: 'requires_payment_method' } }),
      }

      expect(await store.handleStripeRedirectCompletion(stripe, 'pi_9_secret_x')).toBe(false)
      expect(mockedPost).not.toHaveBeenCalled()
    })

    it('returns immediately when the Stripe object or secret is missing', async () => {
      const { store } = setup()

      expect(await store.handleStripeRedirectCompletion(null, 'x')).toBe(false)
      expect(await store.handleStripeRedirectCompletion({}, null)).toBe(false)
    })

    it('redirects to checkout when fetching fails', async () => {
      const { store } = setup()
      const stripe = { retrievePaymentIntent: vi.fn().mockRejectedValue(new Error('boom')) }

      expect(await store.handleStripeRedirectCompletion(stripe, 'pi_9_secret_x')).toBe(false)
      expect(router.push).toHaveBeenCalledWith('/checkout')
    })
  })

  describe('loadOrderForRetry', () => {
    it('loads the order and requests a new payment session', async () => {
      const { store } = setup()

      mockedGet.mockResolvedValueOnce({
        data: {
          shipping_details: JSON.stringify({ first_name: 'Anna', city: 'Vienna' }),
        },
      })
      mockedPost.mockResolvedValueOnce({ data: { client_secret: 'pi_new_secret_x' } })

      expect(await store.loadOrderForRetry(55)).toBe(true)

      expect(mockedGet).toHaveBeenCalledWith('/api/orders/55', credentials)
      expect(mockedPost).toHaveBeenCalledWith('/api/orders/55/retry', {}, credentials)
      expect(store.currentStep).toBe(3)
      expect(store.currentOrderId).toBe(55)
      expect(store.paymentMethod).toBe('credit_card_stripe')
      expect(store.shippingDetails.first_name).toBe('Anna')
      expect(store.paymentIntentClientSecret).toBe('pi_new_secret_x')
      expect(store.isProcessingOrder).toBe(false)
    })

    it('also handles shipping details returned as an object', async () => {
      const { store } = setup()

      mockedGet.mockResolvedValueOnce({ data: { shipping_details: { city: 'Vienna' } } })
      mockedPost.mockResolvedValueOnce({ data: { client_secret: 'pi_new_secret_x' } })

      await store.loadOrderForRetry(56)

      expect(store.shippingDetails.city).toBe('Vienna')
    })

    it('redirects to the cart when loading fails', async () => {
      const { store } = setup()
      mockedGet.mockRejectedValueOnce(new Error('Not found'))

      expect(await store.loadOrderForRetry(999)).toBe(false)
      expect(router.push).toHaveBeenCalledWith('/checkout/cart')
    })

    it('fails when retrying does not return a payment secret', async () => {
      const { store } = setup()

      mockedGet.mockResolvedValueOnce({ data: { shipping_details: {} } })
      mockedPost.mockResolvedValueOnce({ data: {} })

      expect(await store.loadOrderForRetry(57)).toBe(false)
    })

    it('redirects to the login page when signed out', async () => {
      const { store, authStore } = setup()
      authStore.isAuthenticated = false

      expect(await store.loadOrderForRetry(58)).toBe(false)
      expect(router.push).toHaveBeenCalledWith('/login')
      expect(mockedGet).not.toHaveBeenCalled()
    })
  })

  describe('steps and cleanup', () => {
    it('keeps the step within the range of 1 to 4', () => {
      const { store } = setup()

      store.previousStep()
      expect(store.currentStep).toBe(1)

      for (let i = 0; i < 6; i++) store.nextStep()
      expect(store.currentStep).toBe(4)

      store.previousStep()
      expect(store.currentStep).toBe(3)
    })

    it('clearCheckoutData resets everything and empties the cart', () => {
      const { store, cartStore } = setup()
      fillShipping(store)
      store.paymentMethod = 'credit_card_stripe'
      store.termsAccepted = true
      store.currentStep = 3
      store.currentOrderId = 9
      store.paymentIntentClientSecret = 'pi_9_secret_x'
      store.paymentError = 'Payment error'

      store.clearCheckoutData()

      expect(store.shippingDetails.first_name).toBe('')
      expect(store.paymentMethod).toBeNull()
      expect(store.termsAccepted).toBe(false)
      expect(store.currentStep).toBe(1)
      expect(store.currentOrderId).toBeNull()
      expect(store.paymentIntentClientSecret).toBeNull()
      expect(store.paymentError).toBeNull()
      expect(cartStore.items).toHaveLength(0)
    })
  })
})