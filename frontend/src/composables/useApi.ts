const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

const ABSOLUTE_URL = /^(https?:)?\/\//i

export const useApi = () => {
  const getFullUrl = (path: string | null | undefined): string => {
    if (!path) return '/images/placeholder.webp'

    if (ABSOLUTE_URL.test(path)) return path

    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${API_BASE_URL}${cleanPath}`
  }

  return { getFullUrl, apiBaseUrl: API_BASE_URL }
}