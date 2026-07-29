<script setup lang="ts">
import { useCheckoutStore } from '@/stores/checkoutStore'
import { onMounted, ref, watch } from 'vue'
import { loadStripe, type Stripe, type StripeElements, type StripePaymentElement } from '@stripe/stripe-js'
import { useI18n } from 'vue-i18n'

const checkoutStore = useCheckoutStore()
const { t, locale } = useI18n()

let stripe: Stripe | null = null
let elements: StripeElements | null = null
let paymentElement: StripePaymentElement | null = null

const error = ref<string | null>(null)
const isLoading = ref(false)
const keyForPaymentElement = ref(0)
const copiedField = ref<string | null>(null)

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string

const TEST_CARD = {
  number: '4000002500003155',
  exp: '12 / 34',
  cvc: '123',
}

async function copyTestValue(value: string, field: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value.replace(/\s/g, ''))
    copiedField.value = field
    setTimeout(() => {
      if (copiedField.value === field) copiedField.value = null
    }, 2000)
  } catch {
    // fallback: select not available in all contexts
  }
}

async function initializePaymentElement(): Promise<void> {
  error.value = null

  if (!checkoutStore.paymentIntentClientSecret || checkoutStore.currentStep !== 3) {
    return
  }

  if (!STRIPE_PUBLIC_KEY) {
    console.error('STRIPE_PUBLIC_KEY is missing')
    error.value = t('errors.system_error')
    return
  }

  if (!stripe) {
    stripe = await loadStripe(STRIPE_PUBLIC_KEY)
  }

  const clientSecret = checkoutStore.paymentIntentClientSecret

  if (!clientSecret) {
    error.value = t('checkout.payment.missing_secret')
    return
  }

  if (paymentElement) {
    paymentElement.destroy()
    paymentElement = null
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
    })

    paymentElement = elements.create('payment', {
      layout: 'tabs',
    })

    paymentElement.mount('#payment-element')
  }
}

watch(locale, () => {
  if (checkoutStore.currentStep === 3) {
    keyForPaymentElement.value += 1
    initializePaymentElement()
  }
})

onMounted(() => {
  if (checkoutStore.currentStep === 3) {
    initializePaymentElement()
  }
})

async function handlePayment(): Promise<void> {
  error.value = null
  isLoading.value = true

  if (!elements || !stripe) {
    error.value = t('checkout.payment.form_not_ready')
    isLoading.value = false
    return
  }

  const submitResult = await elements.submit()

  if (submitResult?.error) {
    error.value = submitResult.error.message || t('checkout.payment.check_data')
    isLoading.value = false
    return
  }

  const success = await checkoutStore.placeOrder(stripe, elements, locale.value)

  if (!success) {
    error.value = checkoutStore.paymentError || t('checkout.payment_error')
  }

  isLoading.value = false
}
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-900 mb-6">
      {{ t('checkout.step3.formTitle') }}
    </h2>

    <div class="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50">
      <p class="text-sm font-semibold text-amber-900 mb-1">
        {{ t('checkout.payment.testCardTitle') || 'Stripe test card (3D Secure)' }}
      </p>
      <p class="text-xs text-amber-800 mb-3">
        {{ t('checkout.payment.testCardHint') || 'Click to copy, then paste into the form. Only works in test mode.' }}
      </p>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          @click="copyTestValue(TEST_CARD.number, 'number')"
          class="px-3 py-2 text-sm font-mono bg-white border border-amber-200 rounded-lg hover:bg-amber-100 transition"
        >
          {{ TEST_CARD.number }}
          <span class="ml-1 text-xs text-amber-700">
            {{ copiedField === 'number' ? '✓' : '' }}
          </span>
        </button>

        <button
          type="button"
          @click="copyTestValue(TEST_CARD.exp, 'exp')"
          class="px-3 py-2 text-sm font-mono bg-white border border-amber-200 rounded-lg hover:bg-amber-100 transition"
        >
          {{ TEST_CARD.exp }}
          <span class="ml-1 text-xs text-amber-700">
            {{ copiedField === 'exp' ? '✓' : '' }}
          </span>
        </button>

        <button
          type="button"
          @click="copyTestValue(TEST_CARD.cvc, 'cvc')"
          class="px-3 py-2 text-sm font-mono bg-white border border-amber-200 rounded-lg hover:bg-amber-100 transition"
        >
          CVC {{ TEST_CARD.cvc }}
          <span class="ml-1 text-xs text-amber-700">
            {{ copiedField === 'cvc' ? '✓' : '' }}
          </span>
        </button>
      </div>
    </div>

    <div :key="keyForPaymentElement" id="payment-element" class="mb-6" />

    <p v-if="error" class="text-red-600 text-sm mb-4" role="alert">
      {{ error }}
    </p>

    <button
      type="button"
      @click="handlePayment"
      :disabled="isLoading || checkoutStore.isProcessingOrder"
      class="w-full py-4 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl disabled:opacity-50 transition"
    >
      {{
        isLoading || checkoutStore.isProcessingOrder
          ? t('checkout.processing')
          : t('checkout.placeOrder')
      }}
    </button>
  </div>
</template>