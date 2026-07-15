import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/authStore'
import axios from 'axios'
import router from '@/router'

vi.mock('axios')
vi.mock('@/router', () => ({
  default: {
    push: vi.fn(),
  },
}))

describe('AuthStore Specifikáció', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('sikeres bejelentkezés esetén beállítja a felhasználót és a tokent', async () => {
    const store = useAuthStore()
    const mockUser = { id: 1, email: 'test@test.hu', first_name: 'Teszt' }
    
    ;(axios.post as any).mockResolvedValueOnce({
      data: {
        user: mockUser,
        token: 'fake-jwt-token'
      }
    })

    const result = await store.login('test@test.hu', 'password123')

    expect(result).toBe(true)
    expect(store.isAuthenticated).toBe(true)
    expect(store.user).toEqual(mockUser)
    expect(localStorage.getItem('authToken')).toBe('fake-jwt-token')
  })

  it('regisztráció után a login oldalra navigál', async () => {
    const store = useAuthStore()
    ;(axios.post as any).mockResolvedValueOnce({ status: 201 })

    await store.register({ email: 'a@b.com' })

    expect(router.push).toHaveBeenCalledWith('/login')
  })

  it('kijelentkezéskor törli az adatokat és a login oldalra navigál', () => {
    const store = useAuthStore()
    store.token = 'active-token'
    store.isAuthenticated = true
    
    store.logout()
    
    expect(store.isAuthenticated).toBe(false)
    expect(store.token).toBeNull()
    expect(localStorage.getItem('authToken')).toBeNull()
    expect(router.push).toHaveBeenCalledWith('/login')
  })


  it('lekezeli a lejárt vagy érvénytelen tokent (401 hiba)', async () => {
    const store = useAuthStore()
    localStorage.setItem('authToken', 'expired-token')

    ;(axios.get as any).mockRejectedValueOnce({
      response: { status: 401 }
    })

    await store.checkAuth()

    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(localStorage.getItem('authToken')).toBeNull()
  })

  it('lekezeli, ha nincs internet vagy a szerver nem elérhető (Network Error)', async () => {
    const store = useAuthStore()
    localStorage.setItem('authToken', 'valid-token')

    ;(axios.get as any).mockRejectedValueOnce(new Error('Network Error'))

    await store.checkAuth()

    expect(store.isAuthenticated).toBe(false)
    expect(store.authError).toBe('Nem sikerült ellenőrizni a bejelentkezést.')
  })

  it('lekezeli a sikertelen bejelentkezést (422/401 hiba)', async () => {
    const store = useAuthStore()

    ;(axios.post as any).mockRejectedValueOnce({
      response: { 
        status: 422,
        data: { message: 'Érvénytelen e-mail cím vagy jelszó.' }
      }
    })

    const result = await store.login('wrong@test.hu', 'wrong-pass')

    expect(result).toBe(false)
    expect(store.authError).toBe('Érvénytelen e-mail cím vagy jelszó.')
  })

  it('lekezeli, ha a szerver válaszol, de nem küld tokent', async () => {
    const store = useAuthStore()

    ;(axios.post as any).mockResolvedValueOnce({
      data: { user: { id: 1 } } 
    })

    const result = await store.login('test@test.com', 'password')

    expect(result).toBe(false)
    expect(store.authError).toContain('szerver nem küldött tokent')
  })

  it('sikertelen regisztráció esetén beállítja az authError-t', async () => {
    const store = useAuthStore()
    ;(axios.post as any).mockRejectedValueOnce({
      response: { data: { message: 'Ez az e-mail már foglalt.' } }
    })

    const result = await store.register({ email: 'foglalt@test.hu' })

    expect(result).toBe(false)
    expect(store.authError).toBe('Ez az e-mail már foglalt.')
  })
})