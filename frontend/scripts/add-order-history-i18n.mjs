import { readFileSync, writeFileSync } from 'node:fs'

const additions = {
  en: {
    unknownProduct: 'Unknown product',
    errors: {
      notLoggedIn: 'You are not signed in.',
      sessionExpired: 'Your session has expired. Please sign in again.',
      loadFailed: 'Could not load your order history.',
    },
    refund: {
      loginRequired: 'Please sign in to request a refund.',
      success: 'Your refund request has been submitted.',
      sessionExpired: 'Your session has expired. Please sign in again.',
      failed: 'Refund failed: {message}',
    },
  },
  hu: {
    unknownProduct: 'Ismeretlen termék',
    errors: {
      notLoggedIn: 'A felhasználó nincs bejelentkezve.',
      sessionExpired: 'A munkamenet lejárt. Kérjük, jelentkezzen be újra.',
      loadFailed: 'Nem sikerült betölteni a rendelési előzményeket.',
    },
    refund: {
      loginRequired: 'A visszatérítés kéréséhez kérjük, jelentkezzen be.',
      success: 'A visszatérítési kérelem sikeresen beküldve.',
      sessionExpired: 'A munkamenet lejárt. Kérjük, jelentkezzen be újra.',
      failed: 'Visszatérítési hiba: {message}',
    },
  },
  de: {
    unknownProduct: 'Unbekanntes Produkt',
    errors: {
      notLoggedIn: 'Sie sind nicht angemeldet.',
      sessionExpired: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',
      loadFailed: 'Die Bestellhistorie konnte nicht geladen werden.',
    },
    refund: {
      loginRequired: 'Bitte melden Sie sich an, um eine Rückerstattung zu beantragen.',
      success: 'Ihre Rückerstattungsanfrage wurde übermittelt.',
      sessionExpired: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',
      failed: 'Rückerstattung fehlgeschlagen: {message}',
    },
  },
}

for (const [lang, keys] of Object.entries(additions)) {
  const path = new URL(`../src/locales/${lang}.json`, import.meta.url)
  const raw = readFileSync(path, 'utf8')
  const eol = raw.includes('\r\n') ? '\r\n' : '\n'
  const data = JSON.parse(raw)

  data.profile ??= {}
  data.profile.orderHistory = { ...data.profile.orderHistory, ...keys }

  writeFileSync(path, JSON.stringify(data, null, 2).replace(/\n/g, eol) + eol)
  console.log(`${lang}.json updated`)
}