<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { useCheckoutStore } from '@/stores/checkoutStore';
import { useAuthStore } from '@/stores/authStore';
import TheNavigation from '@/components/TheNavigation.vue';
import TheFooter from '@/components/TheFooter.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const checkoutStore = useCheckoutStore();
const authStore = useAuthStore();

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string;

const isLoading = ref<boolean>(true);
const status = ref<'succeeded' | 'failed' | null>(null); 
const stripe = ref<Stripe | null>(null);
const countdown = ref<number>(5);
let timer: ReturnType<typeof setInterval> | null = null;

const handleRedirect = (): void => {
  if (timer) clearInterval(timer);
  checkoutStore.currentStep = 1;
  router.push('/');
};

const startRedirectTimer = (): void => {
  timer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      handleRedirect();
    }
  }, 1000);
};

async function checkPaymentStatus(): Promise<void> {
  isLoading.value = true;
  const clientSecret = route.query.payment_intent_client_secret as string;

  if (!STRIPE_PUBLIC_KEY || !clientSecret) {
    status.value = 'failed';
    isLoading.value = false;
    checkoutStore.currentStep = 1;
    router.push('/checkout'); 
    return;
  }

  try {
    if (!stripe.value) {
      stripe.value = await loadStripe(STRIPE_PUBLIC_KEY);
    }

    if (!stripe.value) throw new Error('Stripe failed to load');

    const { paymentIntent, error } = await stripe.value.retrievePaymentIntent(clientSecret);

    if (error || !paymentIntent) {
      status.value = 'failed';
      return;
    }

    if (paymentIntent.status === 'succeeded') {
      status.value = 'succeeded';
      const success = await checkoutStore.finalizeSuccessfulOrder(paymentIntent.id);
      
      if (success) {
        checkoutStore.isProcessingOrder = false;
        checkoutStore.currentStep = 4; 
        startRedirectTimer();
      }
    } else {
      status.value = 'failed';
      checkoutStore.isProcessingOrder = false;
    }
  } catch (e) {
    console.error(e);
    status.value = 'failed';
  } finally {
    isLoading.value = false;
  }
}

onMounted(async () => {
    await authStore.checkAuth(); 
    if (!authStore.isAuthenticated) {
      router.push('/login');
      return;
    }
    await checkPaymentStatus();
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  if (checkoutStore.currentStep === 4) {
    checkoutStore.currentStep = 1;
  }
});
</script>

<template>
  <TheNavigation/>
  <div class="container mx-auto py-20 px-4 text-center">
    
    <div v-if="isLoading" class="max-w-md mx-auto p-8 bg-white shadow-xl rounded-lg">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
      <h1 class="text-xl font-semibold text-gray-700">{{ t('checkout.complete.checkingStatus') }}</h1>
    </div>

    <div v-else-if="status === 'succeeded'" class="max-w-xl mx-auto p-8 bg-green-50 rounded-xl border border-green-300 shadow-lg">
      <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      <h1 class="text-3xl font-bold text-green-700 mb-4">{{ t('checkout.successTitle') }}</h1>
      <p class="text-green-600 mb-2">{{ t('checkout.complete.orderSuccess') }}</p>
      
      <p class="text-sm text-gray-500 mb-6">
        {{ t('checkout.complete.redirecting', { seconds: countdown }) }}
      </p>

      <button @click="handleRedirect" class="inline-block px-8 py-3 bg-sky-500 text-white font-semibold rounded-lg hover:bg-sky-600 transition shadow-md cursor-pointer">
        {{ t('checkout.backToHome') }}
      </button>
    </div>

    <div v-else class="max-w-xl mx-auto p-8 bg-red-50 rounded-xl border border-red-300 shadow-lg">
       <h1 class="text-2xl font-bold text-red-700 mb-4">{{ t('checkout.complete.paymentFailed') }}</h1>
       <p class="mb-6">{{ t('checkout.complete.paymentNotConfirmed') }}</p>
       <button @click="handleRedirect" class="px-6 py-2 bg-red-600 text-white rounded-lg cursor-pointer">
         {{ t('checkout.backToHome') }}
       </button>
    </div>

  </div>
  <TheFooter/>
</template>