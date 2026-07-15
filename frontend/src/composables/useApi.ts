const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const useApi = () => {
  const getFullUrl = (path: string | null | undefined): string => {
    if (!path) return '/images/placeholder.webp'

    if (path.startsWith('http')) return path

    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${API_BASE_URL}${cleanPath}`
  }

  return { getFullUrl }
}