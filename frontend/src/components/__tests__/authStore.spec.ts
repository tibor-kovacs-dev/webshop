
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import axios from 'axios'
import router from '@/router'
import { useAuthStore } from '@/stores/authStore'

vi.mock('axios')
vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

const mockedGet = vi.mocked(axios.get)
const mockedPost = vi.mocked(axios.post)

const user = {
  id: 1,
  email: 'test@test.com',
  first_name: 'John',
  last_name: 'Doe',
}

describe('AuthStore tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  describe('login', () => {
    it('successfully logs in by fetching the CSRF cookie, signing in, and retrieving the user', async () => {
      const store = useAuthStore()

      mockedGet
        .mockResolvedValueOnce({ data: {} })
        .mockResolvedValueOnce({ data: { user } })
      mockedPost.mockResolvedValueOnce({ data: { user } })

      const result = await store.login('test@test.com', 'password123')

      expect(result).toBe(true)
      expect(store.isAuthenticated).toBe(true)
      expect(store.isInitialized).toBe(true)
      expect(store.user).toEqual(user)
      expect(store.authError).toBeNull()
      expect(store.isLoading).toBe(false)

      expect(mockedGet).toHaveBeenNthCalledWith(1, '/sanctum/csrf-cookie')
      expect(mockedPost).toHaveBeenCalledWith('/api/users/login', {
        email: 'test@test.com',
        password: 'password123',
      })
      expect(mockedGet).toHaveBeenNthCalledWith(2, '/api/users/me')
    })

    it('does not store an authentication token in the browser', async () => {
      const store = useAuthStore()

      mockedGet
        .mockResolvedValueOnce({ data: {} })
        .mockResolvedValueOnce({ data: { user } })
      mockedPost.mockResolvedValueOnce({ data: { user } })

      await store.login('test@test.com', 'password123')

      expect(localStorage.getItem('authToken')).toBeNull()
    })

    it('determines email verification status from the email_verified_at field', async () => {
      const store = useAuthStore()

      mockedGet
        .mockResolvedValueOnce({ data: {} })
        .mockResolvedValueOnce({
          data: { user: { ...user, email_verified_at: '2026-01-01T00:00:00Z' } },
        })
      mockedPost.mockResolvedValueOnce({ data: {} })

      await store.login('test@test.com', 'password123')

      expect(store.isEmailVerified).toBe(true)
    })

    it('returns a translatable error key and clears the state for invalid credentials (401 and 422)', async () => {
      for (const status of [401, 422]) {
        const store = useAuthStore()

        mockedGet.mockResolvedValueOnce({ data: {} })
        mockedPost.mockRejectedValueOnce({ response: { status } })

        const result = await store.login('wrong@test.com', 'wrong-pass')

        expect(result).toBe(false)
        expect(store.isAuthenticated).toBe(false)
        expect(store.user).toBeNull()
        expect(store.authError).toBe('errors.auth.invalidCredentials')
        expect(store.isLoading).toBe(false)
      }
    })

    it('uses the server error message when available, otherwise the translatable default key', async () => {
      const store = useAuthStore()

      mockedGet.mockResolvedValue({ data: {} })
      mockedPost.mockRejectedValueOnce({
        response: { status: 429, data: { message: 'Too many attempts.' } },
      })

      await store.login('a@b.com', 'x')
      expect(store.authError).toBe('Too many attempts.')

      mockedPost.mockRejectedValueOnce(new Error('Network Error'))

      await store.login('a@b.com', 'x')
      expect(store.authError).toBe('errors.auth.loginFailed')
    })
  })

  describe('register', () => {
    it('redirects to the login page after successful registration', async () => {
      const store = useAuthStore()
      mockedPost.mockResolvedValueOnce({ status: 204 })

      const result = await store.register({ email: 'a@b.com' })

      expect(result).toBe(true)
      expect(mockedPost).toHaveBeenCalledWith('/api/users/register', {
        email: 'a@b.com',
      })
      expect(store.authSuccessMessage).toBe('auth.registerSuccessMessage')
      expect(router.push).toHaveBeenCalledWith('/login')
    })

    it('fails when the response has an unexpected status code', async () => {
      const store = useAuthStore()
      mockedPost.mockResolvedValueOnce({ status: 500 })

      expect(await store.register({ email: 'a@b.com' })).toBe(false)
      expect(store.authError).toBe('errors.auth.registerFailed')
      expect(router.push).not.toHaveBeenCalled()
    })

    it('maps the short-password error to a translatable key', async () => {
      const store = useAuthStore()
      mockedPost.mockRejectedValueOnce({
        response: {
          data: {
            errors: {
              password: ['The password field must be at least 8 characters.'],
            },
          },
        },
      })

      expect(await store.register({ email: 'a@b.com' })).toBe(false)
      expect(store.authError).toBe('auth.passwordMin')
    })

    it('preserves the server error message when registration fails', async () => {
      const store = useAuthStore()
      mockedPost.mockRejectedValueOnce({
        response: {
          data: { message: 'This email address is already in use.' },
        },
      })

      expect(await store.register({ email: 'existing@test.com' })).toBe(false)
      expect(store.authError).toBe('This email address is already in use.')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('checkAuth', () => {
    it('sets the user after a successful request', async () => {
      const store = useAuthStore()
      mockedGet.mockResolvedValueOnce({ data: { user } })

      await store.checkAuth()

      expect(store.isAuthenticated).toBe(true)
      expect(store.user).toEqual(user)
      expect(store.isInitialized).toBe(true)
      expect(mockedGet).toHaveBeenCalledWith('/api/users/me')
    })

    it('also accepts a directly returned user object', async () => {
      const store = useAuthStore()
      mockedGet.mockResolvedValueOnce({ data: user })

      await store.checkAuth()

      expect(store.user).toEqual(user)
    })

    it('initializes as unauthenticated on a 401 response', async () => {
      const store = useAuthStore()
      mockedGet.mockRejectedValueOnce({ response: { status: 401 } })

      await store.checkAuth()

      expect(store.isAuthenticated).toBe(false)
      expect(store.user).toBeNull()
      expect(store.isInitialized).toBe(true)
      expect(store.authError).toBeNull()
    })

    it('sets a translatable error key on network failure without retrying the request', async () => {
      const store = useAuthStore()
      mockedGet.mockRejectedValueOnce(new Error('Network Error'))

      await store.checkAuth()

      expect(store.isAuthenticated).toBe(false)
      expect(store.isInitialized).toBe(true)
      expect(store.authError).toBe('errors.auth.statusCheckFailed')
    })

    it('does not fetch again after initialization', async () => {
      const store = useAuthStore()
      mockedGet.mockResolvedValue({ data: { user } })

      await store.checkAuth()
      await store.checkAuth()

      expect(mockedGet).toHaveBeenCalledTimes(1)
    })

    it('sends only one request for concurrent calls', async () => {
      const store = useAuthStore()
      mockedGet.mockResolvedValue({ data: { user } })

      await Promise.all([
        store.checkAuth(),
        store.checkAuth(),
        store.checkAuth(),
      ])

      expect(mockedGet).toHaveBeenCalledTimes(1)
    })
  })

  describe('logout', () => {
    it('clears the state, notifies the server, and redirects to the login page', async () => {
      const store = useAuthStore()
      store.user = user as any
      store.isAuthenticated = true
      store.isEmailVerified = true
      store.authError = 'Something went wrong'
      mockedPost.mockResolvedValueOnce({ data: {} })

      await store.logout()

      expect(mockedPost).toHaveBeenCalledWith('/api/users/logout')
      expect(store.isAuthenticated).toBe(false)
      expect(store.user).toBeNull()
      expect(store.isEmailVerified).toBe(false)
      expect(store.authError).toBeNull()
      expect(router.push).toHaveBeenCalledWith('/login')
    })

    it('logs out on the client even when the server is unavailable', async () => {
      const store = useAuthStore()
      store.user = user as any
      store.isAuthenticated = true
      mockedPost.mockRejectedValueOnce(new Error('Network Error'))

      await store.logout()

      expect(store.isAuthenticated).toBe(false)
      expect(store.user).toBeNull()
      expect(router.push).toHaveBeenCalledWith('/login')
    })
  })

  describe('changePassword', () => {
    it('is disabled for the demo account and does not call the server', async () => {
      const store = useAuthStore()
      store.user = { ...user, email: 'demo@example.com' } as any

      const result = await store.changePassword('old', 'new-password')

      expect(result).toBe(false)
      expect(store.passwordChangeError).toBe(
        'profile.settings.passwordChange.demoBlocked',
      )
      expect(mockedPost).not.toHaveBeenCalled()
    })

    it('sends the correct fields when updating successfully', async () => {
      const store = useAuthStore()
      store.user = user as any
      mockedPost.mockResolvedValueOnce({ data: {} })

      const result = await store.changePassword('old-pass', 'new-pass')

      expect(result).toBe(true)
      expect(mockedPost).toHaveBeenCalledWith('/api/users/change-password', {
        current_password: 'old-pass',
        new_password: 'new-pass',
      })
      expect(store.passwordChangeError).toBeNull()
      expect(store.isChangingPassword).toBe(false)
    })

    it('prefers the server message_key when an error occurs', async () => {
      const store = useAuthStore()
      store.user = user as any
      mockedPost.mockRejectedValueOnce({
        response: {
          data: {
            message_key: 'profile.settings.passwordChange.wrongCurrent',
            message: 'x',
          },
        },
      })

      expect(await store.changePassword('a', 'b')).toBe(false)
      expect(store.passwordChangeError).toBe(
        'profile.settings.passwordChange.wrongCurrent',
      )
    })

    it('uses the message when no key is provided, and falls back to the default key', async () => {
      const store = useAuthStore()
      store.user = user as any

      mockedPost.mockRejectedValueOnce({
        response: { data: { message: 'An error occurred.' } },
      })
      await store.changePassword('a', 'b')
      expect(store.passwordChangeError).toBe('An error occurred.')

      mockedPost.mockRejectedValueOnce(new Error('boom'))
      await store.changePassword('a', 'b')
      expect(store.passwordChangeError).toBe(
        'profile.settings.passwordChange.failed',
      )
    })
  })

  describe('resendVerificationEmail', () => {
    it('sets a translatable message after successfully resending the email', async () => {
      const store = useAuthStore()
      mockedPost.mockResolvedValueOnce({ data: {} })

      expect(await store.resendVerificationEmail()).toBe(true)
      expect(mockedPost).toHaveBeenCalledWith('/api/email/resend')
      expect(store.authSuccessMessage).toBe('auth.resendSuccess')
    })

    it('displays the server error message', async () => {
      const store = useAuthStore()
      mockedPost.mockRejectedValueOnce({
        response: { data: { message: 'Too many requests.' } },
      })

      expect(await store.resendVerificationEmail()).toBe(false)
      expect(store.authError).toBe('Too many requests.')
    })
  })
})
