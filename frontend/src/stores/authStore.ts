import router from '../router/index'
import axios from 'axios'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface User {
  id: number | string
  email: string
  first_name: string
  last_name: string
  name?: string
  phone?: string | null
  zipcode?: string | null
  city?: string | null
  street?: string | null
  house_number?: string | null
  apartment?: string | null
  email_verified_at?: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = ref<boolean>(false)
  const isLoading = ref<boolean>(false)
  const authError = ref<string | null>(null)
  const isEmailVerified = ref<boolean>(false)
  const authSuccessMessage = ref<string | null>(null)
  const isInitialized = ref<boolean>(false)

  const isChangingPassword = ref<boolean>(false)
  const passwordChangeError = ref<string | null>(null)

  let authCheckPromise: Promise<void> | null = null

  function setAuthenticatedUser(userData: User): void {
    user.value = userData
    isAuthenticated.value = true
    isEmailVerified.value = !!userData.email_verified_at
    isInitialized.value = true
  }

  function clearAuthState(): void {
    user.value = null
    isAuthenticated.value = false
    isEmailVerified.value = false
    isInitialized.value = true
  }

  function getServerMessage(error: any): string | null {
    const message = error.response?.data?.message

    return typeof message === 'string' && message.trim()
      ? message
      : null
  }

  async function checkAuth(): Promise<void> {
    if (isInitialized.value) return

    if (authCheckPromise) {
      return authCheckPromise
    }

    authCheckPromise = (async () => {
      authError.value = null

      try {
        const response = await axios.get('/api/users/me')
        const userData = response.data.user || response.data

        setAuthenticatedUser(userData as User)
      } catch (error: any) {
        if (
          error.response?.status === 401 ||
          error.response?.status === 403
        ) {
          clearAuthState()
        } else {
          authError.value = 'errors.auth.statusCheckFailed'
          isAuthenticated.value = false
          isInitialized.value = true
        }
      } finally {
        authCheckPromise = null
      }
    })()

    return authCheckPromise
  }

  async function login(
    email: string,
    password: string,
  ): Promise<boolean> {
    isLoading.value = true
    authError.value = null
    authSuccessMessage.value = null

    try {
      await axios.get('/sanctum/csrf-cookie')

      await axios.post('/api/users/login', {
        email,
        password,
      })

      const response = await axios.get('/api/users/me')
      const userData = response.data.user || response.data

      setAuthenticatedUser(userData as User)

      return true
    } catch (error: any) {
      clearAuthState()

      if (
        error.response?.status === 401 ||
        error.response?.status === 422
      ) {
        authError.value = 'errors.auth.invalidCredentials'
      } else {
        authError.value =
          getServerMessage(error) ||
          'errors.auth.loginFailed'
      }

      return false
    } finally {
      isLoading.value = false
    }
  }

  async function register(userData: Record<string, unknown>): Promise<boolean> {
    isLoading.value = true
    authError.value = null
    authSuccessMessage.value = null

    try {
      const response = await axios.post(
        '/api/users/register',
        userData,
      )

      if ([200, 201, 204].includes(response.status)) {
        authSuccessMessage.value = 'auth.registerSuccessMessage'

        await router.push('/login')

        return true
      }

      authError.value = 'errors.auth.registerFailed'

      return false
    } catch (error: any) {
      const passwordErrors: unknown[] =
        error.response?.data?.errors?.password || []

      const hasPasswordLengthError = passwordErrors.some(
        (message) =>
          typeof message === 'string' &&
          message.includes('at least 8 characters'),
      )

      if (hasPasswordLengthError) {
        authError.value = 'auth.passwordMin'
      } else {
        authError.value =
          getServerMessage(error) ||
          'errors.auth.registerFailed'
      }

      return false
    } finally {
      isLoading.value = false
    }
  }

  async function resendVerificationEmail(): Promise<boolean> {
    isLoading.value = true
    authError.value = null
    authSuccessMessage.value = null

    try {
      await axios.post('/api/email/resend')

      authSuccessMessage.value = 'auth.resendSuccess'

      return true
    } catch (error: any) {
      authError.value =
        getServerMessage(error) ||
        'errors.auth.verificationEmailFailed'

      return false
    } finally {
      isLoading.value = false
    }
  }

  async function changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    passwordChangeError.value = null

    if (user.value?.email === 'demo@example.com') {
      passwordChangeError.value =
        'profile.settings.passwordChange.demoBlocked'

      return false
    }

    isChangingPassword.value = true

    try {
      await axios.post('/api/users/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })

      passwordChangeError.value = null

      return true
    } catch (error: any) {
      const key = error.response?.data?.message_key

      passwordChangeError.value =
        typeof key === 'string' && key.trim()
          ? key
          : getServerMessage(error) ||
            'profile.settings.passwordChange.failed'

      return false
    } finally {
      isChangingPassword.value = false
    }
  }

  async function logout(): Promise<void> {
    try {
      await axios.post('/api/users/logout')
    } catch {
    } finally {
      clearAuthState()

      authError.value = null
      authSuccessMessage.value = null
      passwordChangeError.value = null

      await router.push('/login')
    }
  }

  return {
    user,
    isAuthenticated,
    isInitialized,
    isLoading,
    authError,
    isEmailVerified,
    authSuccessMessage,
    isChangingPassword,
    passwordChangeError,
    checkAuth,
    login,
    register,
    logout,
    resendVerificationEmail,
    changePassword,
  }
})