<script setup lang="ts">
import { useCheckoutStore } from '@/stores/checkoutStore';
import { useCartStore } from '@/stores/cartStore';
import { useI18n } from 'vue-i18n';
import { usePrice } from '@/composables/usePrice';

const { t } = useI18n();
const { lineTotal } = usePrice();

const checkoutStore = useCheckoutStore();
const cartStore = useCartStore();
</script>

<template>
  <div class="min-h-[255px] text-lg">
    <h2 id="order-summary-title" class="text-2xl font-bold mb-8 text-white">
      {{ t('checkout.step3.formTitle') }}
    </h2>

    <section aria-labelledby="shipping-address-heading" 
             class="mb-8 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
      <h3 id="shipping-address-heading" class="font-semibold text-lg mb-4 text-white">
        {{ t('checkout.summary.shippingAddress') }}
      </h3>
      <address class="text-gray-100 not-italic text-base">
        <strong class="text-white">{{ checkoutStore.shippingDetails.first_name }} {{ checkoutStore.shippingDetails.last_name }}</strong><br>
        <span>{{ checkoutStore.shippingDetails.email }}</span><br>
        <span v-if="checkoutStore.shippingDetails.phone">{{ checkoutStore.shippingDetails.phone }}</span><br><br>
        {{ checkoutStore.shippingDetails.zipcode }} {{ checkoutStore.shippingDetails.city }}<br>
        {{ checkoutStore.shippingDetails.street }} {{ checkoutStore.shippingDetails.house_number }}
        <span v-if="checkoutStore.shippingDetails.apartment">, {{ checkoutStore.shippingDetails.apartment }}</span>
      </address>
      <button @click="checkoutStore.currentStep = 1" 
        class="mt-4 text-sky-300 hover:text-white font-medium text-sm transition cursor-pointer">
        {{ t('checkout.summary.change') }}
      </button>
    </section>

    <section aria-labelledby="payment-method-heading" 
             class="mb-8 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
      <h3 id="payment-method-heading" class="font-semibold text-lg mb-4 text-white">
        {{ t('checkout.summary.paymentMethod') }}
      </h3>
      <p class="text-gray-100 capitalize text-base">
        {{ checkoutStore.paymentMethod 
            ? t(`checkout.payment.${checkoutStore.paymentMethod}`) 
            : t('checkout.summary.no_payment_selected') }}
      </p>
      <button @click="checkoutStore.currentStep = 2" 
        class="mt-4 text-sky-300 hover:text-white font-medium text-sm transition cursor-pointer">
        {{ t('checkout.summary.change') }}
      </button>
    </section>

    <section aria-labelledby="order-items-heading">
      <h3 id="order-items-heading" class="font-semibold text-lg mb-4 text-white">
        {{ t('checkout.summary.orderItems') }}
      </h3>

      <div class="rounded-2xl overflow-hidden text-base border border-white/20 bg-white/5 backdrop-blur-md">
        <ul class="divide-y divide-white/10">
          <li v-for="item in cartStore.items" :key="item.id"
            class="p-5 flex items-center gap-4 hover:bg-white/10 transition-colors">
            <img v-if="item.image" :src="item.image" :alt="item.name"
              class="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
            
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate text-white">{{ item.name }}</p>
              <p class="text-sm text-gray-300">
                {{ t('checkout.summary.quantity') }}: {{ item.quantity }}
              </p>
            </div>

            <p class="font-semibold flex-shrink-0 text-white">
              {{ $n(lineTotal(item), 'currency') }}
            </p>
          </li>
        </ul>

        <div class="p-5 space-y-3 bg-black/20">
          <div class="flex justify-between text-gray-200">
            <span>{{ t('checkout.summary.subtotal') }}</span>
            <span>{{ $n(cartStore.totalAmount, 'currency') }}</span>
          </div>
          <div class="flex justify-between text-gray-200">
            <span>{{ t('checkout.summary.shipping') }}</span>
            <span class="text-emerald-400 font-medium">{{ t('checkout.summary.free') }}</span>
          </div>

          <div class="flex justify-between font-bold text-xl pt-4 border-t border-white/20 text-white">
            <span>{{ t('checkout.summary.total') }}</span>
            <span>{{ $n(cartStore.totalAmount, 'currency') }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>