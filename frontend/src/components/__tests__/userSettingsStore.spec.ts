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
    expect(store.preferences.appTheme).toBe('system')
  })

  it('savePreferences elmenti az új beállításokat', async () => {
    const store = useUserSettingsStore()
    const newPrefs = { notificationsEnabled: false, appTheme: 'dark' as const }
    
    await store.savePreferences(newPrefs)
    
    expect(store.preferences.appTheme).toBe('dark')
    expect(store.preferences.notificationsEnabled).toBe(false)
  })
})