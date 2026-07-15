<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProductStore } from '@/stores/productStore';
import { storeToRefs } from 'pinia';
import TheNavigation from '@/components/TheNavigation.vue';
import TheFooter from '@/components/TheFooter.vue';
import StarRating from '@/components/StarRating.vue';

const route = useRoute();
const router = useRouter();
const productStore = useProductStore();

const { products, isLoading, error } = storeToRefs(productStore);
const categoryName = ref(route.params.categoryName as string);

const loadProducts = async () => {
  if (categoryName.value) {
    await productStore.fetchProductsByCategory(categoryName.value);
  }
};

watch(() => route.params.categoryName, (newCategory) => {
  if (newCategory) {
    categoryName.value = newCategory as string;
    loadProducts();
  }
});

onMounted(() => {
  loadProducts();
});

const addToCart = (product: any) => {
  console.log('Kosárba tétel:', product);
};

const goToProductDetail = (productId: number | string) => {
  router.push(`/products/${productId}`);
};
</script>

<template>
  <TheNavigation />
  <div class="container mx-auto p-5 min-h-screen">
    <h1 class="text-3xl font-bold mb-8 capitalize">{{ categoryName }}</h1>
    
    <div v-if="isLoading" class="text-center py-20">
      <p class="text-xl text-gray-600">Betöltés...</p>
    </div>

    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-center">
      <p>{{ error }}</p>
    </div>

    <div v-if="!isLoading && !error" class="flex flex-wrap gap-6 justify-center">
      <div v-for="product in products" :key="product.id" class="flex flex-col p-5 w-64 shadow-lg border rounded-lg bg-white">
        <div class="cursor-pointer flex-grow" @click="goToProductDetail(product.id)">
          <img :src="product.image" :alt="product.title" class="mx-auto object-contain h-40 mb-4" />
          <div class="h-24 overflow-hidden mb-2">
            <h3 class="font-bold text-sm text-gray-800 line-clamp-3">{{ product.title }}</h3>
          </div>
          <div v-if="product.rating" class="mb-2">
            <StarRating :rating="product.rating.rate" />
            <p class="text-xs text-gray-500">{{ product.rating.count }} értékelés</p>
          </div>
          <p class="pb-4 font-bold text-lg text-red-600">${{ product.price }}</p>
        </div>
        <button 
          class="w-full bg-sky-500 py-2 cursor-pointer text-white font-semibold rounded hover:bg-sky-600 transition duration-200" 
          @click="addToCart(product)"
        >
          Kosárba
        </button>
      </div>
    </div>
  </div>
  <TheFooter />
</template>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-box-orient: vertical;  
  overflow: hidden;
}
</style>