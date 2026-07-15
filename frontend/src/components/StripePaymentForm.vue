<script setup lang="ts">
import { useCheckoutStore } from '@/stores/checkoutStore';
import { onMounted, ref, watch } from 'vue';
import { loadStripe, type Stripe, type StripeElements, type StripePaymentElement } from '@stripe/stripe-js';
import { useI18n } from 'vue-i18n';

const checkoutStore = useCheckoutStore();
const { t, locale } = useI18n();

let stripe: Stripe | null = null;
let elements: StripeElements | null = null;
let paymentElement: StripePaymentElement | null = null;

const error = ref<string | null>(null);
const isLoading = ref(false);
const keyForPaymentElement = ref(0);

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string;

async function initializePaymentElement(): Promise<void> {
  error.value = null;

  if (!checkoutStore.paymentIntentClientSecret || checkoutStore.currentStep !== 3) {
    return;
  }

  if (!STRIPE_PUBLIC_KEY) {
    console.error('STRIPE_PUBLIC_KEY is missing');
    error.value = t('errors.system_error');
    return;
  }

  if (!stripe) {
    stripe = await loadStripe(STRIPE_PUBLIC_KEY);
  }

  const clientSecret = checkoutStore.paymentIntentClientSecret;

  if (!clientSecret) {
    error.value = t('checkout.payment.missing_secret');
    return;
  }

  if (paymentElement) {
    paymentElement.destroy();
    paymentElement = null;
  }

  if (stripe) {
    elements = stripe.elements({
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#0ea5e9',
          colorText: '#1f2937',
        },
      },
      locale: locale.value as 'hu' | 'de' | 'en' | 'auto',
    });

    paymentElement = elements.create('payment', {
      layout: 'tabs',
    });

    paymentElement.mount('#payment-element');
  }
}

watch(locale, () => {
  if (checkoutStore.currentStep === 3) {
    keyForPaymentElement.value += 1;
    initializePaymentElement();
  }
});

onMounted(() => {
  if (checkoutStore.currentStep === 3) {
    initializePaymentElement();
  }
});

async function handlePayment(): Promise<void> {
  error.value = null;
  isLoading.value = true;

  if (!elements || !stripe) {
    error.value = t('checkout.payment.form_not_ready');
    isLoading.value = false;
    return;
  }

  const submitResult = await elements.submit();

  if (submitResult?.error) {
    console.error("Stripe validation error:", submitResult.error);
    error.value = submitResult.error.message || t('checkout.payment.check_data');
    isLoading.value = false;
    return;
  }

  const success = await checkoutStore.placeOrder(stripe, elements, locale.value);
  isLoading.value = false;

  if (!success) {
    const creationSuccess = await checkoutStore.createPaymentIntent();
    if (creationSuccess) {
      await initializePaymentElement();
    }
  }
}
</script>

<template>
  <div class="space-y-6">
    <h3 class="text-xl font-bold mb-4 border-b pb-2 text-gray-800">
      {{ t('checkout.payment.credit_card_stripe') }}
    </h3>

    <div 
      :key="keyForPaymentElement" 
      id="payment-element" 
      class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm min-h-[250px]"
    >
      </div>

    <Transition name="fade">
      <div v-if="error" class="p-4 bg-red-50 border border-red-100 text-red-700 rounded-lg text-sm font-medium">
        <font-awesome-icon :icon="['fas', 'exclamation-circle']" class="mr-2" />
        {{ error }}
      </div>
    </Transition>

    <div class="bg-sky-50 p-4 rounded-xl flex items-start gap-3 border border-sky-100">
      <input
        type="checkbox"
        id="terms"
        v-model="checkoutStore.termsAccepted"
        class="mt-1 w-5 h-5 text-sky-600 border-gray-300 rounded focus:ring-sky-500 cursor-pointer"
        required
      />
      <label for="terms" class="text-sm text-sky-900 leading-tight cursor-pointer font-medium">
        {{ t('checkout.summary.acceptTerms') }}
      </label>
    </div>

    <button 
      @click="handlePayment" 
      :disabled="!checkoutStore.isReadyToPlaceOrder || isLoading"
      class="w-full py-4 bg-sky-500 text-white font-bold rounded-xl shadow-lg hover:bg-sky-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 transform active:scale-[0.98]"
    >
      <template v-if="isLoading">
        <font-awesome-icon :icon="['fas', 'spinner']" spin class="mr-2" />
        {{ t('checkout.payment.processing') }}
      </template>
      <template v-else>
        {{ t('checkout.payment.place_order_button') }}
      </template>
    </button>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>