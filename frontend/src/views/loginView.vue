<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import TheNavigation from '@/components/TheNavigation.vue'
import TheFooter from '@/components/TheFooter.vue'
import TheBreadcrumb from '@/components/TheBreadcrumb.vue'

interface AuthForm {
  first_name: string
  last_name: string
  email: string
  password: string
  password_confirmation: string
  [key: string]: string
}

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()

const isLogin = ref(true)

const DEMO_EMAIL = 'demo@example.com'
const DEMO_PASSWORD = 'Demo12345'

const form = reactive<AuthForm>({
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  password_confirmation: '',
})

const handleSubmit = async () => {
  authStore.authError = null
  authStore.authSuccessMessage = null

  if (isLogin.value) {
    const success = await authStore.login(form.email, form.password)
    if (success) router.push('/')
  } else {
    const success = await authStore.register({
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      password: form.password,
      password_confirmation: form.password_confirmation,
    })
  }

  form.password = ''
  form.password_confirmation = ''
}

const loginWithDemo = async () => {
  form.email = DEMO_EMAIL
  form.password = DEMO_PASSWORD
  await handleSubmit()
}

watch(isLogin, () => {
  form.first_name = ''
  form.last_name = ''
  form.email = ''
  form.password = ''
  form.password_confirmation = ''
  authStore.authError = null
  authStore.authSuccessMessage = null
})

if (authStore.isAuthenticated) {
  router.push('/')
}
</script>

<template>
  <TheNavigation />
  <TheBreadcrumb />

  <div
    class="bg-gradient-to-br from-sky-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12 min-h-screen">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div class="bg-gradient-to-r from-sky-500 to-indigo-600 px-8 py-10 text-center">
          <h1 class="text-3xl font-bold text-white">
            {{ isLogin ? t('auth.loginTitle') : t('auth.registerTitle') }}
          </h1>
          <p class="mt-2 text-sky-100">
            {{ isLogin ? t('auth.loginSubtitle') : t('auth.registerSubtitle') }}
          </p>
        </div>

        <div class="px-8 py-10">
          <div v-if="authStore.authSuccessMessage"
            class="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-center">
            {{ authStore.authSuccessMessage }}
          </div>

          <div v-if="authStore.authError"
            class="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-center">
            <p class="font-bold">{{ t('auth.errorOccurred') }}</p>
            <p>{{ authStore.authError }}</p>
          </div>

          <div v-if="isLogin" class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p class="text-sm font-semibold text-amber-900 mb-1">
              {{ t('auth.demoTitle') || 'This is a portfolio project — no registration required' }}
            </p>
            <p class="text-sm text-amber-800 mb-3">
              {{ t('auth.demoText') || 'Try the demo account:' }}
              <span class="font-mono block mt-1">demo@example.com / Demo12345</span>
            </p>
            <button type="button" @click="loginWithDemo" :disabled="authStore.isLoading"
              class="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-lg transition">
              {{ t('auth.demoButton') || 'Sign in with the demo account' }}
            </button>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-6">
            <div v-if="!isLogin" class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('auth.lastName') }}</label>
                <input v-model="form.last_name" type="text" required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('auth.firstName') }}</label>
                <input v-model="form.first_name" type="text" required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('auth.email') }}</label>
              <input v-model="form.email" type="email" required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('auth.password') }}</label>
              <input v-model="form.password" type="password" required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
            </div>

            <div v-if="!isLogin">
              <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('auth.passwordConfirm') }}</label>
              <input v-model="form.password_confirmation" type="password" required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" />
            </div>

            <button type="submit" :disabled="authStore.isLoading"
              class="w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold py-4 rounded-lg hover:brightness-110 transition">
              {{ authStore.isLoading ? '...' : (isLogin ? t('auth.loginButton') : t('auth.registerButton')) }}
            </button>
          </form>

          <div class="mt-6 text-center text-sm">
            {{ isLogin ? t('auth.noAccount') : t('auth.hasAccount') }}
            <button @click="isLogin = !isLogin" class="text-sky-600 font-semibold">
              {{ isLogin ? t('auth.switchToRegister') : t('auth.switchToLogin') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <TheFooter />
</template>

<style scoped>
.fade-up-enter-active {
  transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(40px);
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.4s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.list-enter-active {
  transition: all 0.5s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
</style>