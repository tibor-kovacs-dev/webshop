import { describe, it, expect, afterEach, vi } from 'vitest'

const load = async (base: string) => {
  vi.resetModules()
  vi.stubEnv('VITE_API_BASE_URL', base)

  const { useApi } = await import('@/composables/useApi')

  return useApi()
}

describe('useApi', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns the placeholder when the path is missing', async () => {
    const { getFullUrl } = await load('https://api.example.com')

    expect(getFullUrl(null)).toBe('/images/placeholder.webp')
    expect(getFullUrl(undefined)).toBe('/images/placeholder.webp')
    expect(getFullUrl('')).toBe('/images/placeholder.webp')
  })

  it('keeps absolute and protocol-relative URLs unchanged', async () => {
    const { getFullUrl } = await load('https://api.example.com')

    expect(getFullUrl('https://cdn.example.org/a.jpg')).toBe('https://cdn.example.org/a.jpg')
    expect(getFullUrl('http://cdn.example.org/a.jpg')).toBe('http://cdn.example.org/a.jpg')
    expect(getFullUrl('//cdn.example.org/a.jpg')).toBe('//cdn.example.org/a.jpg')
  })

  it('prefixes relative paths with the configured API base URL', async () => {
    const { getFullUrl } = await load('https://api.example.com')

    expect(getFullUrl('/images/a.jpg')).toBe('https://api.example.com/images/a.jpg')
    expect(getFullUrl('images/a.jpg')).toBe('https://api.example.com/images/a.jpg')
  })

  it('does not treat a relative path starting with http as absolute', async () => {
    const { getFullUrl } = await load('https://api.example.com')

    expect(getFullUrl('httpfolder/a.jpg')).toBe('https://api.example.com/httpfolder/a.jpg')
  })

  it('ignores a trailing slash on the base URL', async () => {
    const { getFullUrl, apiBaseUrl } = await load('https://api.example.com/')

    expect(apiBaseUrl).toBe('https://api.example.com')
    expect(getFullUrl('/images/a.jpg')).toBe('https://api.example.com/images/a.jpg')
  })

  it('keeps the path relative when no base URL is configured', async () => {
    const { getFullUrl } = await load('')

    expect(getFullUrl('/images/a.jpg')).toBe('/images/a.jpg')
  })
})