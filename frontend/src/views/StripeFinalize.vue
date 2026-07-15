<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCheckoutStore } from '@/stores/checkoutStore';
import { loadStripe } from '@stripe/stripe-js';
import { useAuthStore } from '@/stores/authStore';
import { useI18n } from 'vue-i18n';

const authStore = useAuthStore();
const checkoutStore = useCheckoutStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const isLoading = ref(true);
const statusMessage = ref('');
const isSuccess = ref(false);

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string;

onMounted(async () => {
    if (!STRIPE_PUBLIC_KEY) {
        statusMessage.value = t('checkout.finalize.missing_key');
        isLoading.value = false;
        return;
    }

    const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
    
    const clientSecret = route.query.payment_intent_client_secret;

    if (!stripe || !clientSecret || typeof clientSecret !== 'string') {
        statusMessage.value = t('checkout.finalize.invalid_data');
        isLoading.value = false;
        return;
    }

    const success = await checkoutStore.handleStripeRedirectCompletion(stripe, clientSecret);

    if (success) {
        statusMessage.value = t('checkout.finalize.success_message');
        isSuccess.value = true;

        setTimeout(() => {
            router.push({ path: '/checkout', query: { step: '4' } });
        }, 2500);

    } else {
        statusMessage.value = t('checkout.finalize.error_message');
        isSuccess.value = false;
        isLoading.value = false;
    }
});
</script>

<template>
    <div class="max-w-xl mx-auto p-8 bg-white shadow-xl rounded-xl mt-10 text-center border-t-4 transition-all"
         :class="isSuccess ? 'border-sky-500' : 'border-red-500'">
        
        <div v-if="isLoading && !isSuccess">
            <svg class="animate-spin h-10 w-10 text-sky-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-lg font-medium text-gray-700 italic">{{ statusMessage }}</p>
        </div>

        <div v-else>
            <div v-if="isSuccess">
                <div class="bg-sky-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <svg class="h-10 w-10 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">{{ t('checkout.finalize.success_title') }}</h2>
                <p class="text-gray-600">{{ statusMessage }}</p>
                <div class="mt-6 flex justify-center items-center space-x-2">
                    <span class="relative flex h-3 w-3">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                    </span>
                    <p class="text-sm text-gray-500 font-medium">{{ t('checkout.finalize.redirecting') }}</p>
                </div>
            </div>

            <div v-else>
                <div class="bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <svg class="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-red-600 mb-2">{{ t('checkout.finalize.error_title') }}</h2>
                <p class="text-gray-600 px-4">{{ statusMessage }}</p>
                <button 
                    @click="router.push('/checkout')" 
                    class="mt-8 px-8 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors shadow-lg active:scale-95"
                >
                    {{ t('checkout.finalize.back_to_checkout') }}
                </button>
            </div>
        </div>
    </div>
</template>