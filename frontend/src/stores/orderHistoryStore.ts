import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { useAuthStore } from './authStore'

export interface OrderItem {
    id: number
    product_id: number
    quantity: number
    price_at_purchase: string | number
    price_at_purchase_minor?: number
    product?: {
        title: string
        image?: string
    }
}

export interface Order {
    id: number | string
    order_total: string | number
    order_total_minor?: number
    status: 'pending' | 'processing' | 'completed' | 'refunded' | 'pending_payment'
    created_at: string
    items: OrderItem[]
    payment_method: string
    shipping_details: string
    currency: string
}

export interface RefundFeedback {
    type: 'success' | 'error'
    key: string
    params?: Record<string, string>
}

export const useOrderHistoryStore = defineStore('orderHistory', () => {
    const orders = ref<Order[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const refundFeedback = ref<RefundFeedback | null>(null)

    const requestConfig = {
        withCredentials: true,
        withXSRFToken: true,
    }

    async function ensureAuthenticated(): Promise<boolean> {
        const authStore = useAuthStore()

        if (!authStore.isInitialized) {
            await authStore.checkAuth()
        }

        return authStore.isAuthenticated
    }

    function clearRefundFeedback(): void {
        refundFeedback.value = null
    }

    async function fetchUserOrders(): Promise<void> {
        if (!(await ensureAuthenticated())) {
            error.value = 'profile.orderHistory.errors.notLoggedIn'
            orders.value = []
            return
        }

        isLoading.value = true
        error.value = null

        try {
            const response = await axios.get(
                '/api/orders',
                requestConfig
            )

            orders.value = response.data as Order[]
        } catch (err: any) {
            console.error('Failed to fetch orders:', err)

            if (err.response?.status === 401) {
                orders.value = []
                error.value = 'profile.orderHistory.errors.sessionExpired'
            } else {
                error.value = 'profile.orderHistory.errors.loadFailed'
            }
        } finally {
            isLoading.value = false
        }
    }

    async function requestRefund(
        orderId: number | string
    ): Promise<boolean> {
        refundFeedback.value = null

        if (!orderId) {
            console.error('Missing order identifier.')
            return false
        }

        if (!(await ensureAuthenticated())) {
            refundFeedback.value = {
                type: 'error',
                key: 'profile.orderHistory.refund.loginRequired',
            }

            return false
        }

        try {
            const response = await axios.post(
                `/api/order/${orderId}/refund`,
                {},
                requestConfig
            )

            if (response.status >= 200 && response.status < 300) {
                await fetchUserOrders()

                refundFeedback.value = {
                    type: 'success',
                    key: 'profile.orderHistory.refund.success',
                }

                return true
            }

            refundFeedback.value = {
                type: 'error',
                key: 'profile.orderHistory.refund.failed',
                params: { message: String(response.status) },
            }

            return false
        } catch (err: any) {
            console.error('Refund request failed:', err)

            if (err.response?.status === 401) {
                refundFeedback.value = {
                    type: 'error',
                    key: 'profile.orderHistory.refund.sessionExpired',
                }
            } else {
                refundFeedback.value = {
                    type: 'error',
                    key: 'profile.orderHistory.refund.failed',
                    params: {
                        message: String(
                            err.response?.data?.message ||
                            err.message ||
                            ''
                        ),
                    },
                }
            }

            return false
        }
    }

    return {
        orders,
        isLoading,
        error,
        refundFeedback,
        fetchUserOrders,
        requestRefund,
        clearRefundFeedback,
    }
})