import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useOrderHistoryStore } from '@/stores/orderHistoryStore'
import axios from 'axios'

vi.mock('axios')

describe('OrderHistoryStore Specifikáció', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchUserOrders betölti a rendeléseket', async () => {
    const store = useOrderHistoryStore()
    const mockOrders = [{ id: 1, order_total: 100, status: 'completed' }]
    
    vi.mocked(axios.get).mockResolvedValue({ data: mockOrders })

    const { useAuthStore } = await import('@/stores/authStore')
    const authStore = useAuthStore()
    authStore.isAuthenticated = true

    await store.fetchUserOrders()
    
    expect(store.orders.length).toBe(1)
    expect(store.orders[0]!.status).toBe('completed')
  })

  it('visszatérítési kérelem (requestRefund) hibát dob, ha nincs token', async () => {
    const store = useOrderHistoryStore()
    localStorage.removeItem('authToken')
    
    const result = await store.requestRefund(123)
    expect(result).toBe(false)
  })
})