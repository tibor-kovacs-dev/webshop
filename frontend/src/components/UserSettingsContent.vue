<script setup lang="ts">
import { useUserSettingsStore, type UserPreferences } from '@/stores/userSettingsStore'
import { useAuthStore } from '@/stores/authStore'
import { useUserStore } from '@/stores/userStore'
import { storeToRefs } from 'pinia'
import { ref, watchEffect, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const userSettingsStore = useUserSettingsStore()
const authStore = useAuthStore()
const userStore = useUserStore()

const { preferences, successMessage, errorMessage } = storeToRefs(userSettingsStore)
const { isChangingPassword, passwordChangeError } = storeToRefs(authStore)

const localPreferences = ref<UserPreferences>({
  notificationsEnabled: false,
})

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  newPasswordConfirm: '',
})

const isDemoUser = computed(() => {
  const email = authStore.user?.email || userStore.user?.email || ''
  return email === 'demo@example.com'
})

const translateMaybe = (value: string | null | undefined): string => {
  if (!value) return ''
  if (
    value.startsWith('profile.') ||
    value.startsWith('auth.') ||
    value.startsWith('common.')
  ) {
    return t(value)
  }
  return value
}

watchEffect(() => {
  if (preferences.value) {
    localPreferences.value = {
      notificationsEnabled: preferences.value.notificationsEnabled ?? false,
    }
  }
})

onMounted(async () => {
  if (authStore.isAuthenticated) {
    await userSettingsStore.loadPreferences()
  }
})

const handlePasswordChange = async () => {
  if (isDemoUser.value) return

  passwordChangeError.value = null
  if (passwordForm.value.newPassword !== passwordForm.value.newPasswordConfirm) {
    passwordChangeError.value = 'profile.settings.passwordChange.mismatch'
    return
  }

  const success = await userSettingsStore.changePassword(
    passwordForm.value.oldPassword,
    passwordForm.value.newPassword,
  )

  if (success) {
    passwordForm.value = {
      oldPassword: '',
      newPassword: '',
      newPasswordConfirm: '',
    }
  }
}

const handleSavePreferences = () => {
  userSettingsStore.savePreferences(localPreferences.value)
}

const isPasswordFormValid = computed(
  () =>
    passwordForm.value.oldPassword.length > 0 &&
    passwordForm.value.newPassword.length >= 6 &&
    passwordForm.value.newPassword === passwordForm.value.newPasswordConfirm,
)
</script>

<template>
  <div>
    <h3 class="text-xl font-bold text-gray-900 mb-4 border-b pb-2">
      {{ t('profile.settings.title') }}
    </h3>
    <p class="text-gray-500 mb-6">{{ t('profile.settings.text') }}</p>

    <div v-if="successMessage" class="text-green-700 p-3 mb-4 bg-green-50 rounded-lg">
      {{ translateMaybe(successMessage) }}
    </div>
    <div v-if="errorMessage" class="text-red-600 p-3 mb-4 bg-red-50 rounded-lg">
      {{ translateMaybe(errorMessage) }}
    </div>

    <form @submit.prevent="handleSavePreferences" class="space-y-6 mb-10">
      <div class="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <p class="font-semibold text-gray-800">{{ t('profile.settings.email.title') }}</p>
          <p class="text-sm text-gray-500">{{ t('profile.settings.email.text') }}</p>
        </div>
        <input
          type="checkbox"
          v-model="localPreferences.notificationsEnabled"
          class="w-5 h-5 accent-sky-500 cursor-pointer"
        >
      </div>

      <div class="flex justify-end">
        <button
          type="submit"
          :disabled="userSettingsStore.isLoading"
          class="rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 shadow-md transition duration-200 disabled:bg-sky-300"
        >
          <font-awesome-icon
            v-if="userSettingsStore.isLoading"
            :icon="['fas', 'spinner']"
            spin
            class="mr-2"
          />
          <span v-else>{{ t('profile.settings.save') }}</span>
        </button>
      </div>
    </form>

    <div class="p-4 border rounded-lg">
      <p class="font-semibold text-gray-800 mb-1">{{ t('profile.settings.password') }}</p>

      <p v-if="isDemoUser" class="text-sm text-amber-600 mb-2">
        {{ t('profile.settings.passwordChange.demoBlocked') }}
      </p>

      <form
        v-else
        @submit.prevent="handlePasswordChange"
        class="mt-4 space-y-3"
      >
        <div v-if="passwordChangeError" class="text-red-600 p-3 bg-red-50 rounded-lg text-sm">
          {{ translateMaybe(passwordChangeError) }}
        </div>

        <input
          type="password"
          v-model="passwordForm.oldPassword"
          :placeholder="t('profile.settings.passwordChange.currentPlaceholder')"
          class="w-full border rounded-lg p-2 focus:ring-sky-500 outline-none"
        >
        <input
          type="password"
          v-model="passwordForm.newPassword"
          :placeholder="t('profile.settings.passwordChange.newPlaceholder')"
          class="w-full border rounded-lg p-2 focus:ring-sky-500 outline-none"
        >
        <input
          type="password"
          v-model="passwordForm.newPasswordConfirm"
          :placeholder="t('profile.settings.passwordChange.confirmPlaceholder')"
          class="w-full border rounded-lg p-2 focus:ring-sky-500 outline-none"
        >

        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="!isPasswordFormValid || isChangingPassword"
            class="rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 shadow-md transition duration-200 disabled:bg-sky-300"
          >
            <font-awesome-icon
              v-if="isChangingPassword"
              :icon="['fas', 'spinner']"
              spin
              class="mr-2"
            />
            <span v-else>{{ t('profile.settings.save') }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>