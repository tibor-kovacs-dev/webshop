import { createI18n } from 'vue-i18n'
import type { NumberFormats } from '@intlify/core-base'
import huMessages from '@/locales/hu.json'
import deMessages from '@/locales/de.json'
import enMessages from '@/locales/en.json'

const messages = {
  hu: huMessages,
  de: deMessages,
  en: enMessages,
}

function getInitialLocale(): string {
  const userLangs = navigator.languages || [navigator.language]
  const firstLang = userLangs[0]
  const preferredLang = firstLang ? firstLang.substring(0, 2) : 'en'

  if (preferredLang === 'de') return 'de'
  if (preferredLang === 'hu') return 'hu'
  return 'en'
}

const numberFormats: NumberFormats = {
  hu: {
    currency: {
      style: 'currency',
      currency: 'HUF',
      notation: 'standard',
      maximumFractionDigits: 0,
    },
  },
  en: {
    currency: { style: 'currency', currency: 'EUR', notation: 'standard' },
  },
  de: {
    currency: { style: 'currency', currency: 'EUR', notation: 'standard' },
  },
}

const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'en',
  messages,
  numberFormats,
})

export function getCurrentCurrency(): string {
  const locale = typeof i18n.global.locale === 'string' 
    ? i18n.global.locale 
    : i18n.global.locale.value
  return locale === 'hu' ? 'huf' : 'eur'
}

export default i18n