<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useProductStore } from '@/stores/productStore';
import TheNavigation from '@/components/TheNavigation.vue';
import TheFooter from '@/components/TheFooter.vue';
import { useI18n } from 'vue-i18n';
import ProductCard from '@/components/ProductCard.vue';
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton.vue';
import TheBreadcrumb from '@/components/TheBreadcrumb.vue';

const { t } = useI18n();
const route = useRoute();
const productStore = useProductStore();

const props = defineProps<{
  categoryName?: string
}>()

const loadProducts = (categoryParam: string | string[] | undefined): void => {
  if (!categoryParam) return;

  const name = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam;

  if (typeof name === 'string') {
    productStore.fetchProductsByCategory(name);
  }
};

onMounted(() => {
  loadProducts(route.params.categoryName);
});

watch(
  () => route.params.categoryName,
  (newCategory) => {
    loadProducts(newCategory);
  }
);
</script>

<template>
  <TheNavigation />
  <TheBreadcrumb :category-name="props.categoryName || route.params.categoryName?.toString() || ''" />

  <div class="mt-5 flex justify-center text-2xl">
    <h2 class="capitalize">{{ route.params.categoryName || '' }}</h2>
  </div>

  <div class="container mx-auto px-4">
    <div v-if="productStore.isLoading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 pt-5">
      <ProductCardSkeleton v-for="n in 10" :key="n" />
    </div>

    <div v-else-if="productStore.error" class="text-center mt-10 text-red-600 font-semibold">
      {{ productStore.error }}
    </div>

    <div v-else class="grid grid-cols-2 pt-5 md:grid-cols-3 lg:grid-cols-5 gap-6">
      <ProductCard v-for="product in productStore.products" :key="product.id" :product="product" />
    </div>
  </div>

  <TheFooter />
</template>