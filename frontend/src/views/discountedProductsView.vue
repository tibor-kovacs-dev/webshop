<script setup lang="ts">
import { onMounted } from 'vue';
import { useProductStore } from '@/stores/productStore';
import TheNavigation from '@/components/TheNavigation.vue';
import TheFooter from '@/components/TheFooter.vue';
import { useI18n } from 'vue-i18n';
import ProductCard from '@/components/ProductCard.vue';
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton.vue';
import TheBreadcrumb from '@/components/TheBreadcrumb.vue';
import { useErrorMessage } from '@/composables/useErrorMessage';

const { t } = useI18n();
const { translateError } = useErrorMessage();
const productStore = useProductStore();

onMounted((): void => {
  productStore.fetchDiscountedProducts();
});
</script>

<template>
  <TheNavigation />
  <TheBreadcrumb />
  
  <div class="container mx-auto px-4 py-8">
    <h2 class="text-4xl font-extrabold text-gray-800 mb-8 text-center border-b-2 border-red-500 pb-3">
      {{ t('product.discountedProductsTitle') }}
    </h2>

    <div v-if="productStore.specialsLoading" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
      <ProductCardSkeleton v-for="n in 6" :key="n" />
    </div>

    <div v-else-if="productStore.error" class="text-center mt-10 text-red-600 font-semibold">
      {{ translateError(productStore.error) }}
    </div>
    
    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      <div v-if="productStore.discountedProducts.length === 0" class="col-span-full text-center text-gray-500 mt-10 p-4">
        {{ t('product.noDiscountedProducts') }}
      </div>
      <ProductCard 
        v-for="product in productStore.discountedProducts" 
        :key="product.id" 
        :product="product" 
      />
    </div>
  </div>
  <TheFooter />
</template>