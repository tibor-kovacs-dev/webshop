<script setup lang="ts">
import TheNavigation from '@/components/TheNavigation.vue';
import TheFooter from '@/components/TheFooter.vue';
import TheBreadcrumb from '@/components/TheBreadcrumb.vue';
import { useCartStore } from '@/stores/cartStore';
import { useI18n } from 'vue-i18n';
import { usePrice } from '@/composables/usePrice';
import { RouterLink } from 'vue-router';

const { t } = useI18n();
const cartStore = useCartStore();
const { convertPrice } = usePrice();

const calculateItemTotal = (item: any): number => {
  const basePrice = Number(item.price || 0);
  const discount = Number(item.discount || 0);
  const quantity = item.quantity || 1;

  let effectivePrice = discount > 0 
    ? basePrice * (1 - discount / 100) 
    : basePrice;

  return convertPrice(effectivePrice) * quantity;
};
</script>

<template>
  <TheNavigation />
  <TheBreadcrumb />

  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-6xl mx-auto px-4">
      <h1 class="text-3xl font-bold mb-8 text-center md:text-left">
        {{ t('cart.title') || 'Kosaram' }}
      </h1>

      <!-- Üres kosár -->
      <div v-if="cartStore.items.length === 0" class="text-center py-20">
        <p class="text-2xl text-gray-500 mb-6">{{ t('cart.empty') || 'A kosarad üres' }}</p>
        <RouterLink to="/" class="text-sky-600 hover:underline text-lg">
          {{ t('cart.browse_products') || 'Vásárlás folytatása' }}
        </RouterLink>
      </div>

      <div v-else class="space-y-6">
        <div 
          v-for="item in cartStore.items" 
          :key="item.id" 
          class="bg-white rounded-2xl shadow p-6 grid md:grid-cols-12 gap-6 items-center"
        >
          <div class="md:col-span-2 flex justify-center">
            <img 
              :src="item.image" 
              :alt="item.name" 
              class="max-h-32 object-contain"
            />
          </div>

          <div class="md:col-span-4">
            <h3 class="font-semibold text-lg">{{ item.name }}</h3>
            <p class="text-sm text-gray-500 mt-1">
              {{ t('cart.quantity') || 'Mennyiség' }}: <span class="font-medium">{{ item.quantity }}</span>
            </p>
          </div>

          <div class="md:col-span-3 text-center md:text-right">
            <p class="text-2xl font-bold text-sky-600">
              {{ $n(calculateItemTotal(item), 'currency') }}
            </p>
            
            <p v-if="item.discount > 0" class="text-sm text-red-500 line-through">
              {{ $n(convertPrice(Number(item.price)), 'currency') }}
            </p>
          </div>

          <div class="md:col-span-3 flex flex-col md:flex-row gap-3 justify-end">
            <button 
              @click="cartStore.addToCart(item)"
              class="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl transition"
            >
              +
            </button>
            <button 
              @click="cartStore.removeFromCart(item.id)"
              class="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl transition"
            >
              −
            </button>
            <button 
              @click="cartStore.removeAllOfItem(item.id)"
              class="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition"
            >
              {{ t('cart.remove') || 'Eltávolítás' }}
            </button>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow p-8 mt-10">
          <div class="flex justify-between items-center text-2xl font-bold">
            <span>{{ t('cart.total') || 'Összesen' }}:</span>
            <span class="text-sky-600">
              {{ $n(cartStore.totalAmount, 'currency') }}
            </span>
          </div>

          <div class="flex flex-col sm:flex-row gap-4 mt-8">
            <RouterLink :to="{ name: 'Checkout' }" class="flex-1">
              <button class="w-full py-4 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-2xl transition text-lg">
                {{ t('cart.toPayment') || 'Tovább a pénztárhoz' }}
              </button>
            </RouterLink>

            <button 
              @click="cartStore.clearCart"
              class="flex-1 py-4 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-2xl transition text-lg"
            >
              {{ t('cart.emptying') || 'Kosár ürítése' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <TheFooter />
</template>