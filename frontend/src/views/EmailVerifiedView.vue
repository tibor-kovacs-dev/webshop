<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import TheNavigation from '@/components/TheNavigation.vue';
import TheFooter from '@/components/TheFooter.vue';

const { t } = useI18n();
const route = useRoute();

type VerificationStatus = 'success' | 'already-verified' | 'error';

const status = computed<VerificationStatus>(() => {
  const queryStatus = route.query.status as string;
  
  if (queryStatus === 'success' || queryStatus === 'already-verified') {
    return queryStatus;
  }
  return 'error';
});
</script>

<template>
  <TheNavigation />
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
    <div class="w-full max-w-md bg-white shadow-2xl rounded-xl p-8 text-center">

      <div v-if="status === 'success'" class="text-green-600">
        <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h2 class="text-3xl font-bold mb-4">{{ t('emailVerified.successTitle') }}</h2>
        <p class="text-lg mb-6">{{ t('emailVerified.successMessage') }}</p>
        <RouterLink to="/auth" class="bg-sky-600 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md hover:bg-sky-700 transition duration-150 cursor-pointer inline-block">
          {{ t('emailVerified.goToLogin') }}
        </RouterLink>
      </div>

      <div v-else-if="status === 'already-verified'" class="text-blue-600">
        <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h2 class="text-3xl font-bold mb-4">{{ t('emailVerified.alreadyTitle') }}</h2>
        <p class="text-lg mb-6">{{ t('emailVerified.alreadyMessage') }}</p>
        <RouterLink to="/auth" class="bg-sky-600 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md hover:bg-sky-700 transition duration-150 cursor-pointer inline-block">
          {{ t('emailVerified.goToLogin') }}
        </RouterLink>
      </div>

      <div v-else class="text-red-600">
        <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h2 class="text-3xl font-bold mb-4">{{ t('emailVerified.errorTitle') }}</h2>
        <p class="text-lg mb-6">{{ t('emailVerified.errorMessage') }}</p>
        <RouterLink to="/auth" class="bg-sky-600 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md hover:bg-sky-700 transition duration-150 cursor-pointer inline-block">
          {{ t('emailVerified.goToLogin') }}
        </RouterLink>
      </div>
      
    </div>
  </div>
  <TheFooter />
</template>