import { useI18n } from 'vue-i18n'

export const useErrorMessage = () => {
  const { t, te } = useI18n()

  const translateError = (
    value: string | null | undefined,
    params: Record<string, unknown> = {},
  ): string => {
    if (!value) return ''

    return te(value) ? t(value, params) : value
  }

  return { translateError }
}