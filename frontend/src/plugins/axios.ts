import axios, { type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import router from '@/router'

export function setupAxios(): void {
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL
  axios.defaults.withCredentials = false

  axios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  })

  axios.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        const authStore = useAuthStore()
        authStore.logout()
      }
      return Promise.reject(error)
    }
  )
}

export default setupAxios