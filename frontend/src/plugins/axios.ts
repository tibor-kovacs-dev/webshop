import axios, {
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios'

export function setupAxios(): void {
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL
  axios.defaults.withCredentials = true
  axios.defaults.withXSRFToken = true

  axios.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      return config
    },
  )

  axios.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      return Promise.reject(error)
    },
  )
}

export default setupAxios