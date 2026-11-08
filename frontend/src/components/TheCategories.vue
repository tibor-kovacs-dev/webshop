<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import { useProductStore, type Product } from '@/stores/productStore';
import CategoryCard from '@/components/CategoryCard.vue';
import CategoryCardSkeleton from './skeletons/CategoryCardSkeleton.vue';
import ProductCarousel from '@/components/ProductCarousel.vue';
import { useApi } from '@/composables/useApi';
import { useErrorMessage } from '@/composables/useErrorMessage';

interface CategoryDisplay {
  id: string;
  title: string;
  image: string;
  description: string;
}

const { t } = useI18n();
const { translateError } = useErrorMessage();
const productStore = useProductStore();
const { getFullUrl, apiBaseUrl } = useApi();

const categories = ref<CategoryDisplay[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);

const newArrivals = computed(() => productStore.newArrivals);
const discountedProducts = computed(() => productStore.discountedProducts);
const specialsLoading = computed(() => productStore.specialsLoading);

const fetchCategories = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await axios.get<{ products: Product[] }>(`${apiBaseUrl}/api/products`);
    const allProducts = response.data?.products || [];

    const categoriesMap = allProducts.reduce((acc: Record<string, { title: string, image: string }>, product) => {
      const category = product.category || 'Other';
      if (!acc[category]) {
        acc[category] = {
          title: category,
          image: product.image || '',
        };
      }
      return acc;
    }, {});

    categories.value = Object.values(categoriesMap).map(categoryData => {
      const categoryTitleTranslated = t(`categories["${categoryData.title}"]`) || categoryData.title;
      return {
        id: categoryData.title,
        title: categoryData.title,
        image: getFullUrl(categoryData.image),
        description: t('categories.description', { category: categoryTitleTranslated }),
      };
    });
  } catch (err) {
    console.error('Failed to load the categories:', err);
    error.value = 'errors.products.categoriesFailed';
  } finally {
    isLoading.value = false;
  }
};

const fetchSpecialProducts = () => {
  productStore.fetchNewArrivals(10);
  productStore.fetchDiscountedProducts(10);
};

onMounted(() => {
  fetchCategories();
  fetchSpecialProducts();
});
</script>

<template>
  <div>
    <hr class="my-10 border-gray-200" />
    
    <section class="max-sm:h-fit min-h-[400px] px-5 my-10">
      <h2 class="text-3xl font-bold mb-8 text-center text-gray-800">
        {{ t('categories.mainTitle') }}
      </h2>
      
      <div v-if="isLoading" class="text-center">
        <p class="mb-4">
          {{ t('common.loading') }}... 
          <font-awesome-icon :icon="['fas', 'spinner']" spin class="ml-2" />
        </p>
        <div class="flex flex-wrap gap-5 relative justify-center">
          <CategoryCardSkeleton v-for="n in 4" :key="n"/>
        </div>
      </div>

      <div v-else-if="error" class="text-center text-lg text-red-600 font-semibold">
        <p>{{ translateError(error) }}</p>
      </div>
      
      <div v-else class="flex flex-wrap gap-5 relative justify-center">
        <CategoryCard 
          v-for="category in categories" 
          :key="category.id" 
          :category="category"
        />
      </div>
    </section>

    <ProductCarousel 
      :title="t('product.newArrivals')" 
      :products="newArrivals"
      :is-loading="specialsLoading"
      link-to="products/new" 
    />
    
    <ProductCarousel 
      :title="t('product.discountedOffers')" 
      :products="discountedProducts"
      :is-loading="specialsLoading"
      link-to="products/discounts" 
    />
  </div>
</template>