<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useCartStore } from '@/stores/cartStore';
import { useProductStore } from '@/stores/productStore';
import { faHeart, faUser } from '@fortawesome/free-regular-svg-icons';
import { faCartShopping, faXmark, faBars, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import TheNavigatonSkeleton from './skeletons/TheNavigatonSkeleton.vue';

interface Language {
  code: string;
  label: string;
}

const { t, locale } = useI18n();
const isOpen = ref(false);
const isSearchFocused = ref(false);
const productStore = useProductStore();
const cartStore = useCartStore();

const { categories, isLoading, searchQuery, filteredProducts } = storeToRefs(productStore);

const localSearch = ref(searchQuery.value);

const languages = ref<Language[]>([
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'hu', label: 'Magyar' },
]);

const searchResults = computed(() => {
  if (!searchQuery.value.trim()) return [];
  return filteredProducts.value.slice(0, 5);
});

onMounted(async() => {
  productStore.fetchCategories();
  if (productStore.products.length === 0) {
    await productStore.fetchProducts();
  }
});


watch(localSearch, (newVal) => {
  productStore.updateSearchQuery(newVal);
});

watch(searchQuery, (newVal) => {
  if (newVal === '') localSearch.value = '';
});

const closeMenu = (): void => {
  isOpen.value = false;
};

const handleSearchBlur = () => {
  setTimeout(() => {
    isSearchFocused.value = false;
  }, 200);
};

watch(isOpen, (newVal: boolean) => {
  if (newVal) {
    document.body.classList.add('menu-open-fix');
  } else {
    document.body.classList.remove('menu-open-fix');
  }
});
</script>

<template>
  <TheNavigatonSkeleton v-if="isLoading" />
  <header v-else class="relative">
    <div class="lg:hidden">
      <nav class="bg-gradient-to-r from-sky-500 to-indigo-500 text-white fixed top-0 w-full z-50 shadow-lg">
        <div class="flex justify-between items-center p-4">
          <RouterLink to="/" class="uppercase font-bold tracking-wider">Webshop</RouterLink>

          <div class="flex items-center space-x-3">
            <select v-model="locale" class="bg-transparent border-none text-xs font-semibold cursor-pointer outline-none uppercase">
              <option v-for="lang in languages" :key="lang.code" :value="lang.code" class="text-gray-800">
                {{ lang.code.toUpperCase() }}
              </option>
            </select>

            <RouterLink :to="{ name: 'Profile' }"><font-awesome-icon :icon="faUser" /></RouterLink>

            <RouterLink :to="{ name: 'Cart' }" class="relative">
              <font-awesome-icon :icon="faCartShopping" />
              <span v-if="cartStore.items.length > 0" class="absolute -top-2 -right-2 bg-red-500 text-[9px] w-4 h-4 flex items-center justify-center rounded-full">
                {{ cartStore.items.length }}
              </span>
            </RouterLink>

            <button @click="isOpen = !isOpen">
              <font-awesome-icon :icon="isOpen ? faXmark : faBars" class="text-xl" />
            </button>
          </div>
        </div>

        <div class="bg-white p-2 px-4 relative">
          <div class="relative">
            <input 
              v-model="localSearch"
              @focus="isSearchFocused = true"
              @blur="handleSearchBlur"
              type="text" 
              class="w-full bg-gray-100 border-none rounded-lg py-2 pl-4 pr-10 text-sm text-gray-800 focus:ring-2 focus:ring-sky-500"
              :placeholder="t('common.search') + '...'"
            />
            <font-awesome-icon :icon="faMagnifyingGlass" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <div v-if="isSearchFocused && localSearch" class="absolute left-0 right-0 top-full bg-white shadow-2xl z-[60] border-t max-h-80 overflow-y-auto text-gray-900">
            <RouterLink v-for="product in searchResults" :key="product.id" :to="`/product/${product.id}`" @click="isSearchFocused = false" class="flex items-center gap-4 p-4 border-b border-gray-50">
              <img :src="product.image" class="w-12 h-12 object-cover rounded" />
              <div class="flex flex-col">
                <span class="text-sm font-bold truncate">{{ product.name }}</span>
                <span class="text-xs text-sky-600 font-bold">${{ product.price }}</span>
              </div>
            </RouterLink>
          </div>
        </div>

        <Transition name="slide">
          <ul v-if="isOpen" class="fixed top-[108px] right-0 h-[calc(100vh-108px)] w-4/5 bg-white text-gray-800 z-50 shadow-2xl overflow-y-auto">
            <li v-for="category in categories" :key="category.id" class="border-b border-gray-50">
              <RouterLink :to="`/category/${category.slug}`" @click="closeMenu" class="block py-5 px-8 text-lg font-medium uppercase hover:bg-sky-50 transition">
                {{ t(`categories.${category.slug}`) }}
              </RouterLink>
            </li>
          </ul>
        </Transition>
      </nav>
      <div class="pt-[108px]"></div>
    </div>

    <div class="hidden lg:block">
      <div class="p-2 text-center bg-amber-500 text-white text-sm font-semibold uppercase tracking-wide">
        {{ t('shippingAbove20') }}
      </div>

      <nav class="bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md relative">
        <div class="container mx-auto px-4 flex items-center h-16 gap-6">
          <RouterLink to="/" class="flex-shrink-0">
            <h1 class="text-xl font-black uppercase tracking-tighter">Webshop</h1>
          </RouterLink>

          <div class="relative flex-grow max-w-md group">
            <input 
              v-model="localSearch"
              @focus="isSearchFocused = true"
              @blur="handleSearchBlur"
              type="text" 
              class="w-full bg-white/10 border border-white/20 rounded-full py-2 pl-5 pr-12 text-sm text-white placeholder-white/60 focus:outline-none focus:bg-white focus:text-gray-900 focus:ring-4 focus:ring-white/20 transition-all duration-300 shadow-inner"
              :placeholder="t('common.search') + '...'"
            />
            
            <div v-if="isSearchFocused && localSearch" class="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] text-gray-900">
              <div v-if="searchResults.length > 0">
                <RouterLink 
                  v-for="product in searchResults" :key="product.id" :to="`/products/${product.id}`" @click="isSearchFocused = false"
                  class="flex items-center gap-3 p-3 hover:bg-sky-50 transition-colors border-b border-gray-50 last:border-none"
                >
                  <img :src="product.image" class="w-10 h-10 object-cover rounded-md" />
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold truncate w-64">{{ product.name }}</span>
                    <span class="text-xs text-sky-600 font-bold">${{ product.price }}</span>
                  </div>
                </RouterLink>
                <RouterLink v-if="filteredProducts.length > 5" to="/shop" @click="isSearchFocused = false" class="block p-3 text-center text-xs font-bold text-gray-500 hover:bg-gray-100 uppercase border-t">
                  {{ t('common.viewAll') }} ({{ filteredProducts.length }})
                </RouterLink>
              </div>
              <div v-else class="p-4 text-center text-sm text-gray-500">
                {{ t('common.noResults') }} "{{ localSearch }}"
              </div>
            </div>

            <button v-if="localSearch" @click="productStore.clearSearch" class="absolute right-10 top-1/2 -translate-y-1/2 text-white/50 hover:text-red-500 group-focus-within:text-gray-400">
              <font-awesome-icon :icon="faXmark" class="text-xs" />
            </button>
            <div class="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-gray-400">
              <font-awesome-icon :icon="faMagnifyingGlass" class="text-sm" />
            </div>
          </div>

          <ul class="flex space-x-6 items-center">
            <li v-for="category in categories" :key="category.id">
              <RouterLink :to="`/category/${category.slug}`" class="text-xs font-bold uppercase tracking-widest hover:text-sky-200 transition">
                {{ t(`categories.${category.slug}`) }}
              </RouterLink>
            </li>
          </ul>

          <div class="flex items-center space-x-5 ml-auto">
            <select v-model="locale" class="bg-transparent border-none text-xs font-bold cursor-pointer uppercase outline-none">
              <option v-for="lang in languages" :key="lang.code" :value="lang.code" class="text-gray-900">
                {{ lang.code.toUpperCase() }}
              </option>
            </select>

            <div class="flex items-center space-x-4">
              <RouterLink :to="{ name: 'Profile' }"><font-awesome-icon :icon="faUser" class="text-lg" /></RouterLink>
              <RouterLink :to="{ name: 'Cart' }" class="relative">
                <font-awesome-icon :icon="faCartShopping" class="text-lg" />
                <span v-if="cartStore.items.length > 0" class="absolute -top-3 -right-3 bg-red-500 text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-indigo-500">
                  {{ cartStore.items.length }}
                </span>
              </RouterLink>
            </div>
          </div>
        </div>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: transform 0.3s ease-in-out; }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }
input:focus { box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.1); }
</style>