import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import axios from 'axios'
import { useAuthStore } from './authStore'
import { useCartStore, type CartItem } from './cartStore'
import { useOrderHistoryStore } from './orderHistoryStore'
import router from '@/router'
import { getCurrentCurrency } from '../i18n/i18n'

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

export type PaymentMethod = 'credit_card_stripe' | null

export const useCheckoutStore = defineStore(
    'checkout',
    () => {
        const authStore = useAuthStore()
        const cartStore = useCartStore()

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
        const termsAccepted = ref(false)
        const currentStep = ref(1)
        const paymentIntentClientSecret = ref<string | null>(null)
        const isProcessingOrder = ref(false)
        const currentOrderId = ref<number | string | null>(null)
        const paymentError = ref<string | null>(null)

        const requestConfig = {
            withCredentials: true,
            withXSRFToken: true,
        }

        async function ensureAuthenticated(): Promise<boolean> {
            if (!authStore.isInitialized) {
                await authStore.checkAuth()
            }

            return authStore.isAuthenticated
        }

        const discountedTotal = computed(() => cartStore.totalAmount)

        const discountedTotalMinor = computed(() => cartStore.totalMinor)

        const isReadyToPlaceOrder = computed(() => {
            return (
                currentStep.value === 3 &&
                shippingDetails.first_name.trim().length > 0 &&
                shippingDetails.city.trim().length > 0 &&
                paymentMethod.value === 'credit_card_stripe' &&
                termsAccepted.value &&
                !isProcessingOrder.value &&
                Boolean(paymentIntentClientSecret.value)
            )
        })

        async function createPaymentIntent(): Promise<boolean> {
            if (paymentMethod.value !== 'credit_card_stripe') {
                paymentIntentClientSecret.value = null
                return false
            }

            if (currentOrderId.value && paymentIntentClientSecret.value) {
                return true
            }

            if (!(await ensureAuthenticated()) || cartStore.items.length === 0) {
                paymentError.value = 'checkout.errors.missingData'
                return false
            }

            await cartStore.refreshPrices()

            if (cartStore.items.length === 0) {
                paymentError.value = 'checkout.errors.missingData'
                return false
            }

            try {
                const currency = getCurrentCurrency().toLowerCase()

                const payload = {
                    currency,
                    items: (cartStore.items as CartItem[]).map((item) => ({
                        id: item.id,
                        quantity: item.quantity,
                    })),
                }

                const response = await axios.post(
                    '/api/checkout/create-intent',
                    payload,
                    requestConfig
                )

                const serverTotalMinor = response.data?.total_minor

                if (
                    !Number.isSafeInteger(serverTotalMinor) ||
                    serverTotalMinor !== cartStore.totalMinor
                ) {
                    throw new Error('The server total does not match the displayed cart total.')
                }

                paymentIntentClientSecret.value =
                    response.data?.client_secret ?? null

                if (!paymentIntentClientSecret.value) {
                    throw new Error('Stripe did not return a PaymentIntent client secret.')
                }

                return true
            } catch (error: any) {
                console.error(
                    'PaymentIntent error:',
                    error.response?.data || error.message
                )

                paymentIntentClientSecret.value = null
                paymentError.value =
                    error.response?.data?.message ||
                    'checkout.errors.intentFailed'

                return false
            }
        }

        async function finalizeSuccessfulOrder(
            paymentIntentId: string | null
        ): Promise<boolean> {
            const orderHistoryStore = useOrderHistoryStore()

            if (!paymentIntentId) {
                paymentError.value = 'checkout.errors.finalizeFailed'
                return false
            }

            if (!(await ensureAuthenticated())) {
                paymentError.value = 'checkout.errors.finalizeFailed'
                return false
            }

            try {
                await axios.post(
                    '/api/orders/finalize',
                    {
                        payment_intent_id: paymentIntentId,
                    },
                    requestConfig
                )

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
            if (
                !(await ensureAuthenticated()) ||
                cartStore.items.length === 0 ||
                paymentMethod.value !== 'credit_card_stripe'
            ) {
                paymentError.value = 'checkout.errors.missingData'
                return false
            }

            if (!termsAccepted.value) {
                paymentError.value = 'checkout.errors.termsRequired'
                return false
            }

            if (
                !stripe ||
                !elements ||
                !paymentIntentClientSecret.value
            ) {
                paymentError.value = 'checkout.errors.intentFailed'
                return false
            }

            const paymentIntentId =
                paymentIntentClientSecret.value.split('_secret_')[0] ?? null

            if (!paymentIntentId) {
                paymentError.value = 'checkout.errors.finalizeFailed'
                return false
            }

            isProcessingOrder.value = true
            paymentError.value = null

            const orderPayload = {
                shipping_details: JSON.stringify(shippingDetails),
                payment_method: paymentMethod.value,
                payment_intent_id: paymentIntentId,
                locale,
                currency: getCurrentCurrency().toUpperCase(),
                items: (cartStore.items as CartItem[]).map((item) => ({
                    product_id: item.id,
                    quantity: item.quantity,
                })),
            }

            try {
                if (!currentOrderId.value) {
                    const orderResponse = await axios.post(
                        '/api/orders',
                        orderPayload,
                        requestConfig
                    )

                    if (!orderResponse.data?.order_id) {
                        throw new Error('Order creation did not return an order ID.')
                    }

                    currentOrderId.value = orderResponse.data.order_id
                }

                const { error: stripeError } = await stripe.confirmPayment({
                    elements,
                    clientSecret: paymentIntentClientSecret.value,
                    confirmParams: {
                        return_url: `${window.location.origin}/checkout/complete`,
                    },
                })

                if (stripeError) {
                    paymentError.value =
                        stripeError.message ||
                        'checkout.errors.paymentFailed'

                    return false
                }

                return await finalizeSuccessfulOrder(paymentIntentId)
            } catch (error: any) {
                console.error(
                    'Order/payment error:',
                    error.response?.data || error.message
                )

                paymentError.value =
                    error.response?.data?.message ||
                    'checkout.errors.orderFailed'

                return false
            } finally {
                isProcessingOrder.value = false
            }
        }

        async function handleStripeRedirectCompletion(
            stripe: any,
            clientSecret: string | null,
        ): Promise<boolean> {
            if (!stripe || !clientSecret) {
                return false
            }

            isProcessingOrder.value = true

            try {
                const { paymentIntent } =
                    await stripe.retrievePaymentIntent(clientSecret)

                if (paymentIntent?.status === 'succeeded') {
                    const success = await finalizeSuccessfulOrder(paymentIntent.id)

                    if (success) {
                        await router.push('/checkout/complete')
                    }

                    return success
                }

                return false
            } catch (error) {
                console.error('Stripe redirect completion failed:', error)
                await router.push('/checkout')

                return false
            } finally {
                isProcessingOrder.value = false
            }
        }

        async function loadOrderForRetry(
            orderId: string | number
        ): Promise<boolean> {
            if (!(await ensureAuthenticated())) {
                await router.push('/login')
                return false
            }

            isProcessingOrder.value = true

            try {
                const response = await axios.get(
                    `/api/orders/${orderId}`,
                    requestConfig
                )

                const orderData = response.data

                currentStep.value = 3
                currentOrderId.value = orderId

                const details =
                    typeof orderData.shipping_details === 'string'
                        ? JSON.parse(orderData.shipping_details)
                        : orderData.shipping_details

                Object.assign(shippingDetails, details)
                paymentMethod.value = 'credit_card_stripe'

                const retryResponse = await axios.post(
                    `/api/orders/${orderId}/retry`,
                    {},
                    requestConfig
                )

                paymentIntentClientSecret.value =
                    retryResponse.data?.client_secret ?? null

                return Boolean(paymentIntentClientSecret.value)
            } catch (error) {
                console.error('Retry load error:', error)
                await router.push('/checkout/cart')

                return false
            } finally {
                isProcessingOrder.value = false
            }
        }

        function nextStep(): void {
            if (currentStep.value < 4) {
                currentStep.value++
            }
        }

        function previousStep(): void {
            if (currentStep.value > 1) {
                currentStep.value--
            }
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
            discountedTotalMinor,
            nextStep,
            previousStep,
            createPaymentIntent,
            placeOrder,
            loadOrderForRetry,
            clearCheckoutData,
            handleStripeRedirectCompletion,
            finalizeSuccessfulOrder,
        }
    },
    {
        persist: {
            storage: localStorage,
            paths: [
                'shippingDetails',
                'paymentMethod',
                'currentStep',
                'currentOrderId',
            ],
        } as any,
    },
)