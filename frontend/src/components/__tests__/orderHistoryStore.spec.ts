import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi, type MockInstance } from 'vitest'
import axios from 'axios'
import { useOrderHistoryStore } from '@/stores/orderHistoryStore'

const authState = vi.hoisted(() => ({
  isInitialized: true,
  isAuthenticated: true,
  checkAuth: vi.fn(),
}))

vi.mock('axios')
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => authState,
}))

const mockedGet = vi.mocked(axios.get)
const mockedPost = vi.mocked(axios.post)

describe('OrderHistoryStore', () => {
  let alertSpy: MockInstance
  let errorSpy: MockInstance

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()

    authState.isInitialized = true
    authState.isAuthenticated = true

    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('fetchUserOrders', () => {
    it('loads the orders of a signed-in user', async () => {
      const store = useOrderHistoryStore()

      mockedGet.mockResolvedValueOnce({
        data: [{ id: 1, order_total: 100, status: 'completed' }],
      })

      await store.fetchUserOrders()

      expect(mockedGet).toHaveBeenCalledWith('/api/orders', {
        withCredentials: true,
        withXSRFToken: true,
      })
      expect(store.orders).toHaveLength(1)
      expect(store.orders[0]!.status).toBe('completed')
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('sets a translation key and does not call the API when signed out', async () => {
      authState.isAuthenticated = false
      const store = useOrderHistoryStore()

      await store.fetchUserOrders()

      expect(mockedGet).not.toHaveBeenCalled()
      expect(store.orders).toEqual([])
      expect(store.error).toBe('profile.orderHistory.errors.notLoggedIn')
    })

    it('reports an expired session on a 401 response', async () => {
      const store = useOrderHistoryStore()

      mockedGet.mockRejectedValueOnce({ response: { status: 401 } })

      await store.fetchUserOrders()

      expect(store.orders).toEqual([])
      expect(store.error).toBe('profile.orderHistory.errors.sessionExpired')
    })

    it('reports a generic load failure on other errors', async () => {
      const store = useOrderHistoryStore()

      mockedGet.mockRejectedValueOnce(new Error('Network Error'))

      await store.fetchUserOrders()

      expect(store.error).toBe('profile.orderHistory.errors.loadFailed')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('requestRefund', () => {
    it('requires a signed-in user and never opens an alert', async () => {
      authState.isAuthenticated = false
      const store = useOrderHistoryStore()

      const result = await store.requestRefund(123)

      expect(result).toBe(false)
      expect(mockedPost).not.toHaveBeenCalled()
      expect(alertSpy).not.toHaveBeenCalled()
      expect(store.refundFeedback).toEqual({
        type: 'error',
        key: 'profile.orderHistory.refund.loginRequired',
      })
    })

    it('ignores a missing order identifier', async () => {
      const store = useOrderHistoryStore()

      expect(await store.requestRefund('')).toBe(false)
      expect(mockedPost).not.toHaveBeenCalled()
      expect(store.refundFeedback).toBeNull()
    })

    it('submits the refund, reloads the orders and reports success', async () => {
      const store = useOrderHistoryStore()

      mockedPost.mockResolvedValueOnce({ status: 202, data: { message: 'Refund request submitted.' } })
      mockedGet.mockResolvedValueOnce({ data: [{ id: 5, order_total: 10, status: 'refund_pending' }] })

      const result = await store.requestRefund(5)

      expect(result).toBe(true)
      expect(mockedPost).toHaveBeenCalledWith('/api/order/5/refund', {}, {
        withCredentials: true,
        withXSRFToken: true,
      })
      expect(mockedGet).toHaveBeenCalledWith('/api/orders', expect.any(Object))
      expect(store.orders).toHaveLength(1)
      expect(store.refundFeedback).toEqual({
        type: 'success',
        key: 'profile.orderHistory.refund.success',
      })
      expect(alertSpy).not.toHaveBeenCalled()
    })

    it('passes the server message into the error feedback', async () => {
      const store = useOrderHistoryStore()

      mockedPost.mockRejectedValueOnce({
        message: 'Request failed',
        response: {
          status: 400,
          data: { message: 'Only orders in processing or completed status can be refunded.' },
        },
      })

      const result = await store.requestRefund(5)

      expect(result).toBe(false)
      expect(store.refundFeedback).toEqual({
        type: 'error',
        key: 'profile.orderHistory.refund.failed',
        params: { message: 'Only orders in processing or completed status can be refunded.' },
      })
      expect(alertSpy).not.toHaveBeenCalled()
    })

    it('falls back to the error message when the server sends none', async () => {
      const store = useOrderHistoryStore()

      mockedPost.mockRejectedValueOnce(new Error('Network Error'))

      await store.requestRefund(5)

      expect(store.refundFeedback?.params).toEqual({ message: 'Network Error' })
    })

    it('reports an expired session on a 401 response', async () => {
      const store = useOrderHistoryStore()

      mockedPost.mockRejectedValueOnce({ response: { status: 401 } })

      await store.requestRefund(5)

      expect(store.refundFeedback).toEqual({
        type: 'error',
        key: 'profile.orderHistory.refund.sessionExpired',
      })
      expect(errorSpy).toHaveBeenCalled()
    })

    it('clears the previous feedback when a new request starts', async () => {
      const store = useOrderHistoryStore()

      mockedPost.mockRejectedValueOnce(new Error('boom'))
      await store.requestRefund(5)
      expect(store.refundFeedback?.type).toBe('error')

      mockedPost.mockResolvedValueOnce({ status: 200, data: {} })
      mockedGet.mockResolvedValueOnce({ data: [] })
      await store.requestRefund(5)

      expect(store.refundFeedback?.type).toBe('success')
    })

    it('clearRefundFeedback resets the feedback', async () => {
      const store = useOrderHistoryStore()

      mockedPost.mockRejectedValueOnce(new Error('boom'))
      await store.requestRefund(5)

      store.clearRefundFeedback()

      expect(store.refundFeedback).toBeNull()
    })
  })
})