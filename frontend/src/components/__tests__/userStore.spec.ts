import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useUserStore } from '@/stores/userStore'
import { useAuthStore } from '@/stores/authStore'
import axios from 'axios'

vi.mock('axios')

describe('UserStore Specifikáció', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('getUserData hibaüzenetet ad, ha nincs bejelentkezve (nincs token)', async () => {
    const userStore = useUserStore()
    const authStore = useAuthStore()
    
    authStore.user = null 
    
    await userStore.getUserData()
    expect(userStore.error).toBe('A felhasználó nincs bejelentkezve')
  })

  it('updateUserData sikeresen frissíti a felhasználót', async () => {
    const userStore = useUserStore()
    const authStore = useAuthStore()
    
    authStore.user = { token: 'fake-token' } as any
    
    const mockResponse = { data: { user: { first_name: 'ÚjNév' }, message: 'Sikeres' } }
    vi.mocked(axios.patch).mockResolvedValue(mockResponse)

    const result = await userStore.updateUserData({ first_name: 'ÚjNév' })
    
    expect(result).toBe(true)
    expect(userStore.user?.first_name).toBe('ÚjNév')
    expect(userStore.updateSuccess).toBe('Sikeres')
  })
})