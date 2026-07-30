<script setup lang="ts">
import { computed, type Component } from 'vue';
import { useCheckoutStore } from '@/stores/checkoutStore';
import ShippingForm from '@/components/checkout/ShippingForm.vue';
import PaymentMethod from '@/components/checkout/PaymentMethod.vue';
import OrderSummary from '@/components/checkout/OrderSummary.vue';
import StripePaymentForm from '@/components/StripePaymentForm.vue';
import TheNavigation from '@/components/TheNavigation.vue';
import TheFooter from '@/components/TheFooter.vue';
import TheBreadcrumb from '@/components/TheBreadcrumb.vue';
import { useI18n } from 'vue-i18n';

interface Step {
  id: number;
  labelKey: string;
  component: Component;
}

const checkoutStore = useCheckoutStore();
const { locale, t } = useI18n();

const steps: Step[] = [
  { id: 1, labelKey: 'checkout.step1.shipping', component: ShippingForm },
  { id: 2, labelKey: 'checkout.step2.payment', component: PaymentMethod },
  { id: 3, labelKey: 'checkout.step3.summary', component: OrderSummary },
];

const currentStepComponent = computed((): Component | null => {
  if (checkoutStore.currentStep === 3 && checkoutStore.paymentMethod === 'credit_card_stripe') {
    return StripePaymentForm;
  }

  const step = steps.find(s => s.id === checkoutStore.currentStep);
  return step ? step.component : null;
});

const isStepValid = computed((): boolean => {
  if (checkoutStore.currentStep === 1) {
    const s = checkoutStore.shippingDetails;
    return !!(
      s.first_name?.trim().length > 0 &&
      s.last_name?.trim().length > 0 &&
      s.email?.includes('@') &&
      s.city?.trim().length > 0 &&
      s.zipcode?.trim().length > 0 &&
      s.street?.trim().length > 0 &&
      s.house_number?.trim().length > 0
    );
  }
  if (checkoutStore.currentStep === 2) {
    return checkoutStore.paymentMethod !== null;
  }
  return true;
});

const handleNextStep = async (): Promise<void> => {
  if (isStepValid.value) {
    if (checkoutStore.currentStep === 2 && checkoutStore.paymentMethod === 'credit_card_stripe') {
      const success = await checkoutStore.createPaymentIntent();
      if (!success) return;
    }
    checkoutStore.nextStep();
  }
};

const handlePlaceOrder = async (): Promise<void> => {
  const currentLocale = locale.value;
  const success = await checkoutStore.placeOrder(null, null, currentLocale);

  if (success) {
    checkoutStore.currentStep = 4;
  }
};
</script>

<template>
  <TheNavigation />
  <TheBreadcrumb />

  <div class="container mx-auto py-12 px-4 max-w-7xl">
    <h1 class="text-4xl font-bold text-center mb-12 text-gray-900">{{ t('checkout.title') }}</h1>

    <nav :aria-label="t('checkout.process_steps')" class="mb-16">
      <div class="flex items-center justify-between max-w-3xl mx-auto">
        <div v-for="(step, index) in steps" :key="step.id" class="flex flex-col items-center relative flex-1"
          :aria-current="checkoutStore.currentStep === step.id ? 'step' : undefined">

          <div v-if="index > 0" class="absolute top-7 left-0 w-full h-1 -translate-x-1/2 transition-colors duration-300"
            :class="checkoutStore.currentStep >= step.id ? 'bg-sky-500' : 'bg-gray-300'" aria-hidden="true"></div>

          <div
            class="relative z-10 w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 shadow-lg"
            :class="checkoutStore.currentStep >= step.id
              ? 'bg-sky-500 text-white scale-110'
              : 'bg-gray-200 text-gray-600'"
            :aria-label="t('checkout.step_aria', { count: step.id, label: t(step.labelKey) })">
            {{ step.id }}
          </div>

          <p class="mt-4 text-sm font-medium text-center px-4"
            :class="checkoutStore.currentStep === step.id ? 'text-sky-600' : 'text-gray-600'">
            {{ t(step.labelKey) }}
          </p>
        </div>
      </div>
    </nav>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-0">
      <div class="lg:col-span-2">
        <div class="bg-white shadow-xl p-8 lg:p-10">
          <component :is="currentStepComponent" />

          <div v-if="checkoutStore.currentStep < 3 || checkoutStore.paymentMethod !== 'credit_card_stripe'"
            class="flex justify-between mt-12 pt-8 border-t border-gray-200">
            <button v-if="checkoutStore.currentStep > 1" @click="checkoutStore.previousStep"
              class="px-8 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500">
              {{ t('checkout.back') }}
            </button>
            <div v-else></div>

            <button v-if="checkoutStore.currentStep < 3" @click="handleNextStep" :disabled="!isStepValid"
              class="px-8 py-4 bg-sky-500 text-white font-semibold rounded-xl shadow-md hover:bg-sky-600 hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-sky-300 cursor-pointer">
              {{ t('checkout.continue') }}
            </button>

            <button v-if="checkoutStore.currentStep === 3 && checkoutStore.paymentMethod !== 'credit_card_stripe'"
              @click="handlePlaceOrder" :disabled="!checkoutStore.isReadyToPlaceOrder"
              class="px-8 py-4 bg-sky-500 text-white font-semibold rounded-xl shadow-md hover:bg-sky-600 hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-sky-300 cursor-pointer">
              {{ t('checkout.placeOrder') }}
            </button>
          </div>
        </div>
      </div>

      <div class="lg:sticky lg:top-8 h-fit text-white w-full lg:w-xl">
        <div class="bg-indigo-900 shadow-lg p-8">
          <OrderSummary />
        </div>
      </div>
    </div>

    <div v-if="checkoutStore.currentStep === 4"
      class="max-w-2xl mx-auto mt-16 p-10 text-center bg-green-50 rounded-2xl border border-green-300 shadow-xl">
      <h2 class="text-3xl font-bold text-green-700 mb-6">{{ t('checkout.successTitle') }}</h2>
      <p class="text-lg text-green-600 mb-8">{{ t('checkout.successMessage') }}</p>
      <RouterLink to="/"
        class="inline-block px-8 py-4 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition shadow-md cursor-pointer">
        {{ t('checkout.backToHome') }}
      </RouterLink>
    </div>
  </div>

  <TheFooter />
</template>