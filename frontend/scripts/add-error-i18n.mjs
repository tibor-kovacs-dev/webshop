import { readFileSync, writeFileSync } from 'node:fs'

const additions = {
  en: {
    title: 'Something went wrong',
    retry: 'Try again',
    generic: 'Something went wrong. Please try again.',
    products: {
      loadFailed: 'Could not load the products.',
      detailsFailed: 'Could not load the product details.',
      slugMissing: 'The product link is invalid.',
      categoryFailed: 'Could not load this category.',
      categoriesFailed: 'Could not load the categories.',
    },
  },
  hu: {
    title: 'Hiba történt',
    retry: 'Újrapróbálkozás',
    generic: 'Hiba történt. Kérjük, próbálja újra.',
    products: {
      loadFailed: 'Nem sikerült betölteni a termékeket.',
      detailsFailed: 'Nem sikerült betölteni a termék adatait.',
      slugMissing: 'A termék hivatkozása érvénytelen.',
      categoryFailed: 'Nem sikerült betölteni ezt a kategóriát.',
      categoriesFailed: 'Nem sikerült betölteni a kategóriákat.',
    },
  },
  de: {
    title: 'Etwas ist schiefgelaufen',
    retry: 'Erneut versuchen',
    generic: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
    products: {
      loadFailed: 'Die Produkte konnten nicht geladen werden.',
      detailsFailed: 'Die Produktdetails konnten nicht geladen werden.',
      slugMissing: 'Der Produktlink ist ungültig.',
      categoryFailed: 'Diese Kategorie konnte nicht geladen werden.',
      categoriesFailed: 'Die Kategorien konnten nicht geladen werden.',
    },
  },
}

for (const [lang, keys] of Object.entries(additions)) {
  const path = new URL(`../src/locales/${lang}.json`, import.meta.url)
  const raw = readFileSync(path, 'utf8')
  const eol = raw.includes('\r\n') ? '\r\n' : '\n'
  const data = JSON.parse(raw)

  data.errors = {
    ...data.errors,
    ...keys,
    products: { ...data.errors?.products, ...keys.products },
  }

  writeFileSync(path, JSON.stringify(data, null, 2).replace(/\n/g, eol) + eol)
  console.log(`${lang}.json updated`)
}