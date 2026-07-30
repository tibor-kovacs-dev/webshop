import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import axios from 'axios'
import { useAuthStore } from './authStore'
import { useCartStore, type CartItem } from './cartStore'
import { useOrderHistoryStore } from './orderHistoryStore'
import router from '@/router'
import { getCurrentCurrency } from '../i18n/i18n'
import { usePrice } from '@/composables/usePrice'

export interface ShippingDetails {
  first_name: string
  last_name: string
  email: string
  phone: string
  zipcode: string
  city: string
  street: string
  house_number: string
  apartment: string
}

export type PaymentMethod = 'credit_card_stripe' | 'cash' | null

export const useCheckoutStore = defineStore(
  'checkout',
  () => {
    const API_URL = import.meta.env.VITE_API_BASE_URL as string
    const authStore = useAuthStore()
    const cartStore = useCartStore()
    const { convertPrice } = usePrice()

    const shippingDetails = reactive<ShippingDetails>({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      zipcode: '',
      city: '',
      street: '',
      house_number: '',
      apartment: '',
    })

    const paymentMethod = ref<PaymentMethod>(null)
    const termsAccepted = ref<boolean>(false)
    const currentStep = ref<number>(1)
    const paymentIntentClientSecret = ref<string | null>(null)
    const isProcessingOrder = ref<boolean>(false)
    const currentOrderId = ref<number | string | null>(null)
    const paymentError = ref<string | null>(null)

    const fxQuoteId = ref<string | null>(null)

    const discountedTotal = computed((): number => {
      return (cartStore.items as CartItem[]).reduce((sum, item) => {
        let price = Number(item.price || 0)
        const discount = Number(item.discount || 0)

        let effectivePrice = discount > 0
          ? price * (1 - discount / 100)
          : price

        effectivePrice = convertPrice(effectivePrice)

        return sum + effectivePrice * (item.quantity || 1)
      }, 0)
    })

    const isReadyToPlaceOrder = computed((): boolean => {
      const isStepCorrect =
        currentStep.value === 3 ||
        (currentStep.value === 2 && paymentMethod.value !== 'credit_card_stripe')

      return (
        isStepCorrect &&
        shippingDetails.first_name.length > 0 &&
        shippingDetails.city.length > 0 &&
        paymentMethod.value !== null &&
        termsAccepted.value === true &&
        !isProcessingOrder.value
      )
    })

    async function getFxQuote(): Promise<string | null> {
      const currency = getCurrentCurrency().toUpperCase()

      if (currency === 'HUF') {
        fxQuoteId.value = null
        return null
      }

      try {
        const response = await axios.post(`${API_URL}/api/fx-quote`, {
          to_currency: 'HUF',
          from_currencies: [currency],
          lock_duration: 'hour',
        })

        fxQuoteId.value = response.data.id
        return response.data.id
      } catch (error) {
        console.warn('FX Quote request failed, continuing without quote:', error)
        fxQuoteId.value = null
        return null
      }
    }

    async function createPaymentIntent(): Promise<boolean> {
      if (paymentMethod.value !== 'credit_card_stripe') {
        paymentIntentClientSecret.value = null
        return true
      }

      if (!authStore.isAuthenticated || cartStore.items.length === 0) return false

      const token = localStorage.getItem('authToken')
      if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

      const currency = getCurrentCurrency().toLowerCase()
      let amountToCharge = discountedTotal.value

      if (currency === 'huf') {
        amountToCharge = Math.max(175, Math.round(amountToCharge))
      } else {
        amountToCharge = Math.round(amountToCharge * 100)
      }

      await getFxQuote()

      try {
        const payload: any = {
          currency: currency,
          amount: amountToCharge,
          items: (cartStore.items as CartItem[]).map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })),
        }

        if (fxQuoteId.value) {
          payload.fx_quote_id = fxQuoteId.value
        }

        const intentResponse = await axios.post(
          `${API_URL}/api/checkout/create-intent`,
          payload,
        )

        paymentIntentClientSecret.value = intentResponse.data.client_secret
        return true
      } catch (error: any) {
        console.error('Payment Intent error:', error.response?.data || error.message)
        paymentIntentClientSecret.value = null
        paymentError.value =
          error.response?.data?.error || 'checkout.errors.intentFailed'
        return false
      }
    }

    async function finalizeSuccessfulOrder(paymentIntentId: string | null): Promise<boolean> {
      const orderHistoryStore = useOrderHistoryStore()
      try {
        await axios.post(`${API_URL}/api/orders/finalize`, {
          payment_intent_id: paymentIntentId,
          status: 'processing',
        })
        clearCheckoutData()
        await orderHistoryStore.fetchUserOrders()
        currentStep.value = 4
        return true
      } catch (error) {
        console.error('Finalize error:', error)
        paymentError.value = 'checkout.errors.finalizeFailed'
        return false
      }
    }

    async function placeOrder(
      stripe: any = null,
      elements: any = null,
      locale: string = 'en',
    ): Promise<boolean> {
      if (!authStore.isAuthenticated || cartStore.items.length === 0 || !paymentMethod.value) {
        paymentError.value = 'checkout.errors.missingData'
        return false
      }

      if (!termsAccepted.value) {
        paymentError.value = 'checkout.errors.termsRequired'
        return false
      }

      isProcessingOrder.value = true
      const token = localStorage.getItem('authToken')
      if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

      const paymentIntentId = paymentIntentClientSecret.value
        ? paymentIntentClientSecret.value.split('_secret_')[0]
        : null

      const orderPayload = {
        order_id_to_update: currentOrderId.value,
        order_total: discountedTotal.value,
        shipping_details: JSON.stringify(shippingDetails),
        payment_method: paymentMethod.value,
        payment_intent_id: paymentIntentId,
        status: paymentMethod.value === 'credit_card_stripe' ? 'pending_payment' : 'pending',
        locale: locale,
        currency: getCurrentCurrency().toUpperCase(),
        items: (cartStore.items as CartItem[]).map((item) => {
          const price = Number(item.price || 0)
          const discount = Number(item.discount || 0)
          let effectivePrice = discount > 0 ? price * (1 - discount / 100) : price
          effectivePrice = convertPrice(effectivePrice)
          return {
            product_id: item.id,
            quantity: item.quantity,
            price_at_purchase: effectivePrice,
          }
        }),
      }

      try {
        const requestUrl = currentOrderId.value
          ? `${API_URL}/api/orders/${currentOrderId.value}/retry`
          : `${API_URL}/api/orders`

        const orderResponse = await axios.post(requestUrl, orderPayload)
        if (!orderResponse.data.order_id) throw new Error('Order create failed')

        currentOrderId.value = orderResponse.data.order_id

        if (paymentMethod.value === 'credit_card_stripe' && stripe && elements) {
          const { error: stripeError } = await stripe.confirmPayment({
            elements,
            clientSecret: paymentIntentClientSecret.value,
            confirmParams: {
              return_url: `${window.location.origin}/checkout/complete`,
            },
          })

          if (stripeError) {
            paymentError.value = stripeError.message || 'checkout.errors.paymentFailed'
            isProcessingOrder.value = false
            return false
          }
        }

        await finalizeSuccessfulOrder(null)
        isProcessingOrder.value = false
        return true
      } catch (error) {
        console.error('Order error:', error)
        paymentError.value = 'checkout.errors.orderFailed'
        isProcessingOrder.value = false
        return false
      }
    }

    async function handleStripeRedirectCompletion(
      stripe: any,
      clientSecret: string | null,
    ): Promise<boolean> {
      if (!stripe || !clientSecret) return false
      isProcessingOrder.value = true
      try {
        const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret)
        if (paymentIntent && paymentIntent.status === 'succeeded') {
          await finalizeSuccessfulOrder(paymentIntent.id)
          router.push('/checkout/complete')
          return true
        }
        return false
      } catch (e) {
        router.push('/checkout')
        return false
      } finally {
        isProcessingOrder.value = false
      }
    }

    async function loadOrderForRetry(orderId: string | number): Promise<boolean> {
      isProcessingOrder.value = true
      const token = localStorage.getItem('authToken')
      if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

      try {
        const response = await axios.get(`${API_URL}/api/orders/${orderId}`)
        const orderData = response.data

        currentStep.value = 3
        currentOrderId.value = orderId

        const details =
          typeof orderData.shipping_details === 'string'
            ? JSON.parse(orderData.shipping_details)
            : orderData.shipping_details

        Object.assign(shippingDetails, details)
        paymentMethod.value = orderData.payment_method as PaymentMethod

        const intentSuccess = await createPaymentIntent()
        if (!intentSuccess) throw new Error('Intent error')

        isProcessingOrder.value = false
        return true
      } catch (error) {
        console.error('Retry load error:', error)
        router.push('/cart')
        return false
      } finally {
        isProcessingOrder.value = false
      }
    }

    function nextStep(): void {
      if (currentStep.value === 2 && paymentMethod.value === 'credit_card_stripe') {
        createPaymentIntent()
      }
      if (currentStep.value < 4) currentStep.value++
    }

    function previousStep(): void {
      if (currentStep.value > 1) currentStep.value--
    }

    function clearCheckoutData(): void {
      Object.assign(shippingDetails, {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        zipcode: '',
        city: '',
        street: '',
        house_number: '',
        apartment: '',
      })
      paymentMethod.value = null
      termsAccepted.value = false
      currentStep.value = 1
      paymentIntentClientSecret.value = null
      currentOrderId.value = null
      paymentError.value = null
      fxQuoteId.value = null
      cartStore.clearCart()
    }

    return {
      shippingDetails,
      paymentMethod,
      termsAccepted,
      currentStep,
      isReadyToPlaceOrder,
      paymentIntentClientSecret,
      isProcessingOrder,
      currentOrderId,
      paymentError,
      discountedTotal,
      fxQuoteId,
      nextStep,
      previousStep,
      createPaymentIntent,
      placeOrder,
      loadOrderForRetry,
      clearCheckoutData,
      handleStripeRedirectCompletion,
      finalizeSuccessfulOrder,
      getFxQuote,
    }
  },
  {
    persist: {
      storage: localStorage,
      paths: ['shippingDetails', 'paymentMethod', 'currentStep', 'currentOrderId'],
    } as any,
  },
)