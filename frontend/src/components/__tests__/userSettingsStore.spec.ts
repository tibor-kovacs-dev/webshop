import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useUserSettingsStore } from '@/stores/userSettingsStore'

describe('UserSettingsStore Specifikáció', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loadPreferences betölti az alapértelmezett értékeket, ha üres', async () => {
    const store = useUserSettingsStore()
    await store.loadPreferences()
    expect(store.preferences.notificationsEnabled).toBe(true)
  })

  it('savePreferences elmenti az új beállításokat', async () => {
    const store = useUserSettingsStore()
    const newPrefs = { notificationsEnabled: false }

    await store.savePreferences(newPrefs)

    expect(store.preferences.notificationsEnabled).toBe(false)
  })
})