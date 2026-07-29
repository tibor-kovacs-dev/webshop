import router from '../router/index'
import axios from 'axios'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface User {
  id: number | string;
  email: string;
  first_name: string;
  last_name: string;
  name?: string;
  phone?: string | null;
  zipcode?: string | null;
  city?: string | null;
  street?: string | null;
  house_number?: string | null;
  apartment?: string | null;
  email_verified_at?: string | null;
}

axios.defaults.withCredentials = false

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const isAuthenticated = ref<boolean>(false)
  const isLoading = ref<boolean>(false)
  const authError = ref<string | null>(null)
  const isEmailVerified = ref<boolean>(false)
  const authSuccessMessage = ref<string | null>(null)
  const isInitialized = ref<boolean>(false)

  const isChangingPassword = ref<boolean>(false)
  const passwordChangeError = ref<string | null>(null)

  const API_URL = (import.meta as any).env.VITE_API_BASE_URL as string

  function saveTokenAndAuthenticate(tokenValue: string, userData: Partial<User> = {}): void {
    localStorage.setItem('authToken', tokenValue)
    user.value = userData as User
    token.value = tokenValue
    isAuthenticated.value = true
    isEmailVerified.value = !!userData.email_verified_at
  }

  async function checkAuth(): Promise<void> {
    authError.value = null
    authSuccessMessage.value = null
    const localToken = localStorage.getItem('authToken')

    if (!localToken) {
      isAuthenticated.value = false
      user.value = null
      isInitialized.value = true
      return
    }

    token.value = localToken

    try {
      const response = await axios.get('/api/users/me')
      const userData = response.data.user || response.data
      user.value = userData as User
      isAuthenticated.value = true
      isEmailVerified.value = !!userData.email_verified_at
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        isAuthenticated.value = false
        user.value = null
        localStorage.removeItem('authToken')
      } else {
        isAuthenticated.value = false
        authError.value = 'Nem sikerült ellenőrizni a bejelentkezést.'
      }
    } finally {
      isInitialized.value = true 
    }
  }

  async function login(email: string, password: string): Promise<boolean> {
    isLoading.value = true
    authError.value = null
    authSuccessMessage.value = null

    try {
      const response = await axios.post(`/api/users/login`, { email, password })
      const tokenValue = response.data.token || response.data.access_token || response.data.user?.token

      if (tokenValue) {
        saveTokenAndAuthenticate(tokenValue, response.data.user)
        return true
      } else {
        authError.value = 'Sikertelen bejelentkezés: a szerver nem küldött tokent.'
        return false
      }
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 422) {
        authError.value = 'Érvénytelen e-mail cím vagy jelszó.'
      } else {
        authError.value = error.response?.data?.message || 'Hiba történt a bejelentkezés során.'
      }
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function register(userData: any): Promise<boolean> {
    isLoading.value = true
    authError.value = null
    authSuccessMessage.value = null

    try {
      const response = await axios.post(`${API_URL}/api/users/register`, userData)
      if ([200, 201, 204].includes(response.status)) {
        router.push('/login')
        authSuccessMessage.value = 'Sikeres regisztráció! Ellenőrizd az e-mail fiókodat.'
        return true
      }
      return false
    } catch (error: any) {
      authError.value = error.response?.data?.message || 'Hiba történt a regisztráció során.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function resendVerificationEmail(): Promise<boolean> {
    isLoading.value = true
    try {
      await axios.post(`${API_URL}/api/email/resend`)
      authSuccessMessage.value = 'Ellenőrző e-mail elküldve.'
      return true
    } catch (error) {
      authError.value = 'Hiba történt az újraküldés során.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    await axios.post('/api/users/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
    return true
  }

  function logout(): void {
    isAuthenticated.value = false
    user.value = null
    token.value = null
    isEmailVerified.value = false
    authSuccessMessage.value = null
    authError.value = null
    localStorage.removeItem('authToken')
    router.push('/login')
  }

  return {
    user,
    isAuthenticated,
    isInitialized,
    isLoading,
    authError,
    isEmailVerified,
    authSuccessMessage,
    token,
    isChangingPassword,
    passwordChangeError,
    checkAuth,
    login,
    register,
    logout,
    resendVerificationEmail,
    changePassword,
  }
},
{
  persist: {
    storage: localStorage,
    paths: ['token', 'isAuthenticated', 'user', 'isEmailVerified'],
  } as any,
})