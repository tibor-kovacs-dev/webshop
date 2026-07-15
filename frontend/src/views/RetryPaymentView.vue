<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCheckoutStore } from '@/stores/checkoutStore';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const route = useRoute();
const router = useRouter();
const checkoutStore = useCheckoutStore();

const isProcessing = computed(() => checkoutStore.isProcessingOrder);
const paymentError = computed(() => checkoutStore.paymentError);

onMounted(async () => {
  const orderId = Array.isArray(route.params.orderId) 
    ? route.params.orderId[0] 
    : route.params.orderId;

  if (!orderId) {
    checkoutStore.paymentError = t('error.retry.no_order_id');
    setTimeout(() => router.push({ name: 'Home' }), 3000);
    return;
  }

  const success = await checkoutStore.loadOrderForRetry(orderId);

  if (success) {
    router.push({ name: 'Checkout' });
  } else {
    console.error("Failed to reload order for payment retry.");
  }
});
</script>

<template>
  <div class="flex items-center justify-center min-h-[50vh] bg-gray-50 p-6">
    <div class="w-full max-w-md text-center bg-white p-8 shadow-lg border border-gray-200 rounded-lg">

      <div v-if="isProcessing" class="flex flex-col items-center">
        <div class="w-12 h-12 border-4 border-sky-500 border-t-transparent animate-spin mx-auto mb-4 rounded-full"></div>
        
        <h1 class="text-xl font-bold text-gray-700 mb-2">
          {{ t('checkout.retry.loading_title') }}
        </h1>
        <p class="text-gray-500">
          {{ t('checkout.retry.loading_text') }}
        </p>
      </div>

      <div v-else-if="paymentError" class="text-red-600">
        <div class="mb-4 text-5xl">⚠️</div>
        <h1 class="text-2xl font-bold mb-4">
          {{ t('error.general_title') }}
        </h1>
        <p class="mb-6 text-gray-700">{{ paymentError }}</p>
        
        <div class="flex flex-col space-y-3">
          <router-link :to="{ name: 'Profile' }" class="bg-sky-500 text-white py-2 px-4 rounded hover:bg-sky-600 transition">
            {{ t('checkout.retry.go_to_profile') }}
          </router-link>
          
          <router-link :to="{ name: 'Home' }" class="text-gray-500 hover:text-gray-700 underline text-sm">
            {{ t('common.back_to_home') || 'Vissza a főoldalra' }}
          </router-link>
        </div>
      </div>

      <div v-else>
        <p class="text-gray-500 italic">{{ t('checkout.retry.redirecting') }}</p>
      </div>
    </div>
  </div>
</template>