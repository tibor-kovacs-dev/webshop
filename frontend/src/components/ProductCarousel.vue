<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import ProductCard from './ProductCard.vue';
import { useI18n } from 'vue-i18n';
import type { Product } from '@/stores/productStore';

const { t } = useI18n();

const props = defineProps<{
  title: string;
  products: Product[];
  isLoading?: boolean;
  linkTo: string;
}>();

const isNewSection = computed(() => props.linkTo.includes('/new'));
const isDiscountSection = computed(() => props.linkTo.includes('/discounts'));
</script>

<template>
  <section class="mb-8 p-4 md:p-6 bg-gray-50 rounded-lg shadow-inner">
    <h2 class="text-3xl font-extrabold text-gray-800 mb-6 border-b-2 border-sky-500 pb-2">
      {{ title }}
    </h2>

    <div v-if="isLoading" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
      <div v-for="i in 6" :key="i" class="h-80 bg-gray-200 rounded-xl animate-pulse max-w-60"></div>
    </div>

    <div v-else>
      <div v-if="products.length === 0" class="text-gray-500 p-4 w-full text-center">
        {{ t('noProductsAvailable') }}
      </div>

      <div v-else class="flex overflow-x-auto space-x-6 pb-4 -mx-4 px-4 custom-scrollbar snap-x">
        <div v-for="product in products" :key="product.id" class="flex-shrink-0 w-64 snap-start">
          <div class="relative">
            <div v-if="isNewSection"
              class="absolute top-0 right-4 z-20 bg-sky-500 text-white text-xs font-bold px-3.5 py-1 rounded-bl-lg shadow-md">
              {{ t('product.new') }}
            </div>

            <div v-else-if="isDiscountSection && product.discount"
              class="absolute top-0 right-4 z-20 bg-red-600 text-white text-xs font-bold px-3.5 py-1 rounded-bl-lg shadow-md">
              -{{ Math.round(product.discount) }}%
            </div>

            <ProductCard :product="product" />
          </div>
        </div>
      </div>

      <div v-if="products.length > 0 && linkTo" class="flex justify-center mt-8">
        <RouterLink :to="linkTo"
          class="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-full hover:from-sky-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-300">
          {{ t('common.viewAll') }}
          <span class="ml-2 font-light text-xl">&rarr;</span>
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
  scroll-behavior: smooth;
}
</style>