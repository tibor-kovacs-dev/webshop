<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import TheNavigation from '@/components/TheNavigation.vue'
import TheFooter from '@/components/TheFooter.vue'
import TheBreadcrumb from '@/components/TheBreadcrumb.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const token = (route.params.token || route.query.token) as string
const email = ref<string>((route.query.email as string) || '')
const password = ref<string>('')
const password_confirmation = ref<string>('')
const isLoading = ref<boolean>(false)
const success = ref<boolean>(false)

const handleSubmit = async (): Promise<void> => {
  isLoading.value = true
  authStore.authError = null
  authStore.authSuccessMessage = null

  try {
    await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/password/reset`, {
      token,
      email: email.value,
      password: password.value,
      password_confirmation: password_confirmation.value,
    })

    authStore.authSuccessMessage = t('auth.resetSuccess') || 'Jelszavad sikeresen megváltoztatva! Most bejelentkezhetsz.'
    success.value = true

    setTimeout(() => router.push('/auth'), 3000)
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      authStore.authError = error.response?.data?.message || t('auth.resetError')
    } else {
      authStore.authError = t('auth.resetError')
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <TheNavigation />
  <TheBreadcrumb />
  
  <div class="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">

        <h1 class="text-3xl font-bold text-center text-gray-800 mb-6">
          {{ t('auth.resetPasswordTitle') }}
        </h1>

        <div v-if="success" class="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-center animate-pulse">
          {{ authStore.authSuccessMessage }}
        </div>

        <div v-if="authStore.authError" class="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-center">
          {{ authStore.authError }}
        </div>

        <form v-if="!success" @submit.prevent="handleSubmit" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('auth.newPassword') }}</label>
            <input 
              type="password" 
              v-model="password" 
              required 
              :disabled="isLoading"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none transition" 
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('auth.passwordConfirm') }}</label>
            <input 
              type="password" 
              v-model="password_confirmation" 
              required 
              :disabled="isLoading"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none transition" 
            />
          </div>

          <button 
            type="submit" 
            :disabled="isLoading"
            class="w-full bg-gradient-to-r from-sky-600 to-indigo-600 text-white py-4 rounded-lg font-bold hover:shadow-lg transform hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-70 cursor-pointer"
          >
            {{ isLoading ? t('auth.processing') : t('auth.resetPasswordButton') }}
          </button>
        </form>

        <div class="mt-6 text-center">
          <RouterLink to="/auth" class="text-sm text-gray-600 hover:text-sky-600 transition-colors">
            {{ t('auth.backToLogin') }}
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
  <TheFooter />
</template>