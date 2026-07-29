import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'

export interface UserPreferences {
  notificationsEnabled: boolean
}

export const useUserSettingsStore = defineStore('settings', () => {
  const preferences = ref<UserPreferences>({
    notificationsEnabled: true,
  })

  const isLoading = ref(false)
  const successMessage = ref('')
  const errorMessage = ref('')

  const authStore = useAuthStore()

  const loadPreferences = async (): Promise<void> => {
    if (preferences.value.notificationsEnabled === undefined) {
      preferences.value = { notificationsEnabled: true }
    }
  }

  const savePreferences = async (newPrefs: UserPreferences): Promise<void> => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      preferences.value = newPrefs
      successMessage.value = 'profile.saveSuccess'
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
    } catch {
      errorMessage.value = 'profile.settings.passwordChange.failed'
    } finally {
      isLoading.value = false
    }
  }

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    errorMessage.value = ''
    authStore.passwordChangeError = null

    try {
      const success = await authStore.changePassword(oldPassword, newPassword)
      if (!success) return false

      successMessage.value = 'profile.settings.passwordChange.success'
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
      return true
    } catch (err: any) {
      authStore.passwordChangeError =
        err.response?.data?.message_key ||
        err.response?.data?.message ||
        'profile.settings.passwordChange.failed'
      return false
    }
  }

  return {
    preferences,
    isLoading,
    successMessage,
    errorMessage,
    loadPreferences,
    savePreferences,
    changePassword,
  }
})