<script setup lang="ts">
import { useCheckoutStore } from '@/stores/checkoutStore';
import { useCartStore } from '@/stores/cartStore';
import { ref, nextTick, watch } from 'vue';
import { loadStripe } from '@stripe/stripe-js';
import { getCurrentCurrency } from '@/i18n/i18n';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const checkoutStore = useCheckoutStore();
const cartStore = useCartStore();

const stripe = ref<any>(null);
const elements = ref<any>(null);
const expressCheckout = ref<any>(null);
const expressContainer = ref<HTMLDivElement | null>(null);
const showExpressCheckout = ref(false);

watch(() => checkoutStore.paymentIntentClientSecret, async (clientSecret) => {
  if (!clientSecret) return;

  const stripeKey = (import.meta as any).env.VITE_STRIPE_PUBLIC_KEY;
  stripe.value = await loadStripe(stripeKey);

  if (!stripe.value) return;

  elements.value = stripe.value.elements({
    clientSecret: clientSecret,
    appearance: { theme: 'stripe', variables: { colorPrimary: '#0ea5e9' } }
  });

  expressCheckout.value = elements.value.create('expressCheckout', {
    wallets: { applePay: 'auto', googlePay: 'auto' },
    style: { expressCheckout: { height: '56px' } }
  });

  expressCheckout.value.on('ready', (event: any) => {
    if (event.available) {
      showExpressCheckout.value = true;
      watch(expressContainer, async (newVal) => {
        if (newVal && expressCheckout.value) {
          await nextTick();
          expressCheckout.value.mount(newVal);
        }
      }, { immediate: true });
    }
  });

  watch(() => cartStore.totalAmount, (newTotal) => {
    if (expressCheckout.value) {
      const currency = getCurrentCurrency().toLowerCase();
      const amount = currency === 'huf' 
        ? Math.round(newTotal) 
        : Math.round(newTotal * 100);

      expressCheckout.value.update({
        total: {
          label: t('checkout.express.total_label'),
          amount: amount
        }
      });
    }
  }, { immediate: true });
}, { immediate: true });
</script>

<template>
  <div>
    <h2 id="payment-method-title" class="text-2xl font-bold text-gray-900 mb-8">
      {{ t('checkout.step2.formTitle') }}
    </h2>

    <div v-if="showExpressCheckout" class="mb-8">
      <div ref="expressContainer" class="w-full h-14 rounded-xl overflow-hidden shadow-md"></div>
      <p class="text-sm text-gray-500 mt-2 text-center">
        {{ t('checkout.express.quick_payment') }}
      </p>
    </div>

    <div class="relative my-6" v-if="showExpressCheckout"></div>

    <div
      role="radio"
      :aria-checked="checkoutStore.paymentMethod === 'credit_card_stripe'"
      @click="checkoutStore.paymentMethod = 'credit_card_stripe'"
      class="relative flex items-center p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300"
      :class="checkoutStore.paymentMethod === 'credit_card_stripe' ? 'border-sky-500 bg-sky-50' : 'border-gray-200'"
    >
      <label class="font-semibold text-gray-900 cursor-pointer">
        {{ t('checkout.payment.credit_card_stripe') }}
      </label>
    </div>
  </div>
</template>