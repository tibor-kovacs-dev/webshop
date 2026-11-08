import { describe, it, expect, vi } from 'vitest'
import { useErrorMessage } from '@/composables/useErrorMessage'

const messages = vi.hoisted<Record<string, string>>(() => ({
  'errors.generic': 'Something went wrong.',
  'errors.withParam': 'Failed: {message}',
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params: Record<string, string> = {}) =>
      (messages[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => params[name] ?? ''),
    te: (key: string) => key in messages,
  }),
}))

describe('useErrorMessage', () => {
  const { translateError } = useErrorMessage()

  it('returns an empty string for empty values', () => {
    expect(translateError(null)).toBe('')
    expect(translateError(undefined)).toBe('')
    expect(translateError('')).toBe('')
  })

  it('translates known translation keys', () => {
    expect(translateError('errors.generic')).toBe('Something went wrong.')
  })

  it('passes parameters to the translation', () => {
    expect(translateError('errors.withParam', { message: 'boom' })).toBe('Failed: boom')
  })

  it('returns plain server messages unchanged', () => {
    expect(translateError('Only completed orders can be refunded.')).toBe(
      'Only completed orders can be refunded.',
    )
  })

  it('does not treat unknown dotted text as a translation key', () => {
    expect(translateError('errors.unknown.key')).toBe('errors.unknown.key')
  })
})