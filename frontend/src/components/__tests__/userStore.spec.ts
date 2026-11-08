import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'
import router from '@/router'
import { useUserStore } from '@/stores/userStore'
import { useAuthStore } from '@/stores/authStore'

vi.mock('axios')
vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

const mockedGet = vi.mocked(axios.get)
const mockedPost = vi.mocked(axios.post)
const mockedPatch = vi.mocked(axios.patch)

const currentUser = {
  id: 1,
  email: 'test@test.com',
  first_name: 'John',
  last_name: 'Doe',
}

const signIn = () => {
  const authStore = useAuthStore()
  authStore.user = currentUser as any
  authStore.isAuthenticated = true
  authStore.isInitialized = true

  return authStore
}

describe('UserStore tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  describe('getUserData', () => {
    it('returns an error message when the user is not signed in', async () => {
      const userStore = useUserStore()
      const authStore = useAuthStore()
      authStore.isInitialized = true

      await userStore.getUserData()

      expect(userStore.user).toBeNull()
      expect(userStore.error).toBe('The user is not signed in')
      expect(userStore.isLoading).toBe(false)
    })

    it('gets the signed-in user from authStore', async () => {
      const userStore = useUserStore()
      signIn()

      await userStore.getUserData()

      expect(userStore.user).toEqual(currentUser)
      expect(userStore.error).toBeNull()
      expect(mockedGet).not.toHaveBeenCalled()
    })

    it('checks the session first when the store is not initialized', async () => {
      const userStore = useUserStore()
      mockedGet.mockResolvedValueOnce({ data: { user: currentUser } })

      await userStore.getUserData()

      expect(mockedGet).toHaveBeenCalledWith('/api/users/me')
      expect(userStore.user).toEqual(currentUser)
    })
  })

  describe('updateUserData', () => {
    it('successfully updates the user based on the server response', async () => {
      const userStore = useUserStore()
      const authStore = signIn()

      mockedPatch.mockResolvedValueOnce({
        data: { user: { ...currentUser, first_name: 'Jane' }, message: 'Success' },
      })

      const result = await userStore.updateUserData({ first_name: 'Jane' })

      expect(result).toBe(true)
      expect(mockedPatch).toHaveBeenCalledWith('/api/users/profile', { first_name: 'Jane' })
      expect(userStore.user?.first_name).toBe('Jane')
      expect(authStore.user?.first_name).toBe('Jane')
      expect(userStore.updateSuccess).toBe('Success')
      expect(userStore.isUpdating).toBe(false)
    })

    it('merges local data when the server does not return a user', async () => {
      const userStore = useUserStore()
      const authStore = signIn()

      mockedPatch.mockResolvedValueOnce({ data: {} })

      await userStore.updateUserData({ city: 'Vienna' })

      expect(authStore.user?.city).toBe('Vienna')
      expect(authStore.user?.first_name).toBe('John')
      expect(userStore.updateSuccess).toBe('Profile details updated successfully!')
    })

    it('does not send a request when signed out', async () => {
      const userStore = useUserStore()
      useAuthStore().isInitialized = true

      const result = await userStore.updateUserData({ first_name: 'X' })

      expect(result).toBe(false)
      expect(userStore.error).toBe('The user must be signed in to update the profile')
      expect(mockedPatch).not.toHaveBeenCalled()
    })

    it('sets form errors for a 422 response', async () => {
      const userStore = useUserStore()
      signIn()
      mockedPatch.mockRejectedValueOnce({ response: { status: 422 } })

      expect(await userStore.updateUserData({ phone: 'x' })).toBe(false)
      expect(userStore.error).toBe('Invalid data. Please check the form.')
    })

    it('logs out and redirects to the login page on a 401 response', async () => {
      const userStore = useUserStore()
      const authStore = signIn()
      mockedPatch.mockRejectedValueOnce({ response: { status: 401 } })
      mockedPost.mockResolvedValueOnce({ data: {} })

      expect(await userStore.updateUserData({ phone: 'x' })).toBe(false)
      expect(authStore.isAuthenticated).toBe(false)
      expect(userStore.user).toBeNull()
      expect(router.push).toHaveBeenCalledWith('/login')
    })

    it('displays the server error message or the default message for other errors', async () => {
      const userStore = useUserStore()
      signIn()

      mockedPatch.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Server error' } } })
      await userStore.updateUserData({ phone: 'x' })
      expect(userStore.error).toBe('Server error')

      mockedPatch.mockRejectedValueOnce(new Error('boom'))
      await userStore.updateUserData({ phone: 'x' })
      expect(userStore.error).toBe('An unknown error occurred while saving')
    })
  })

  it('syncUser replaces the local user', () => {
    const userStore = useUserStore()

    userStore.syncUser(currentUser as any)
    expect(userStore.user).toEqual(currentUser)

    userStore.syncUser(null)
    expect(userStore.user).toBeNull()
  })
})