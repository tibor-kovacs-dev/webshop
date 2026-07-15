<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'
import TheNavigation from '@/components/TheNavigation.vue'
import TheFooter from '@/components/TheFooter.vue'
import axios from 'axios'
import TheBreadcrumb from '@/components/TheBreadcrumb.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()

const email = ref<string>('')
const isLoading = ref<boolean>(false)

const handleSubmit = async (): Promise<void> => {
  isLoading.value = true
  authStore.authError = null
  authStore.authSuccessMessage = null

  try {
    await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/password/forgot`, {
      email: email.value
    })

    authStore.authSuccessMessage = t('auth.forgotPasswordSuccess') || 'Elküldtük a jelszó-visszaállítási linket!'
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      authStore.authError = error.response?.data?.email || error.response?.data?.message || t('auth.errorGeneric')
    } else {
      authStore.authError = t('auth.errorGeneric')
    }
    console.error('Password reset error:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <TheNavigation />
  <TheBreadcrumb />
  
  <div class="bg-gradient-to-br from-sky-50 to-indigo-100 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <Transition name="fade-up">
        <div class="bg-white rounded-2xl shadow-2xl p-8">
          <h1 class="text-3xl font-bold text-center text-gray-800 mb-6">
            {{ t('auth.forgotPasswordTitle') }}
          </h1>

          <div v-if="authStore.authSuccessMessage" class="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl">
            {{ authStore.authSuccessMessage }}
          </div>

          <div v-if="authStore.authError" class="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl">
            {{ authStore.authError }}
          </div>

          <form @submit.prevent="handleSubmit" v-if="!authStore.authSuccessMessage">
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('auth.email') }}</label>
              <input 
                type="email" 
                v-model="email"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                :placeholder="t('auth.emailPlaceholder')" 
                required 
                :disabled="isLoading" 
              />
            </div>

            <button 
              type="submit" 
              :disabled="isLoading"
              class="w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white py-4 rounded-lg font-bold hover:shadow-xl transform hover:scale-[1.02] active:scale-95 transition-all duration-300 disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
            >
              {{ isLoading ? t('auth.sending') : t('auth.sendResetLink') }}
            </button>
          </form>

          <div class="mt-6 text-center">
            <RouterLink to="/auth" class="text-sm text-gray-600 hover:text-sky-600 transition-colors">
              {{ t('auth.backToLogin') }}
            </RouterLink>
          </div>
        </div>
      </Transition>
    </div>
  </div>
  
  <TheFooter />
</template>

<style scoped>
.fade-up-enter-active {
  transition: all 0.6s ease-out;
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}
</style>