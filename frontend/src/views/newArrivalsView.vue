<script setup lang="ts">
import { onMounted } from 'vue';
import { useProductStore } from '@/stores/productStore';
import TheNavigation from '@/components/TheNavigation.vue';
import TheFooter from '@/components/TheFooter.vue';
import { useI18n } from 'vue-i18n';
import ProductCard from '@/components/ProductCard.vue';
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton.vue';
import TheBreadcrumb from '@/components/TheBreadcrumb.vue';

const { t } = useI18n();
const productStore = useProductStore();

onMounted((): void => {
  productStore.fetchNewArrivals();
});
</script>

<template>
  <TheNavigation />
  <TheBreadcrumb />
  
  <div class="container mx-auto px-4 py-8">
    <h2 class="text-4xl font-extrabold text-gray-800 mb-8 text-center border-b-2 border-sky-500 pb-3">
      {{ t('product.newProductsTitle') }}
    </h2>

    <div v-if="productStore.specialsLoading" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
      <ProductCardSkeleton v-for="n in 6" :key="n" />
    </div>

    <div v-else-if="productStore.error" class="text-center mt-10 text-red-600 font-semibold">
      {{ productStore.error }}
    </div>
    
    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      <div v-if="productStore.newArrivals.length === 0" class="col-span-full text-center text-gray-500 mt-10 p-4">
        {{ t('product.noNewProducts') }}
      </div>
      <ProductCard 
        v-for="product in productStore.newArrivals" 
        :key="product.id" 
        :product="product" 
      />
    </div>
  </div>
  <TheFooter />
</template>