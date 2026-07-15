<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCartStore } from '@/stores/cartStore';

const cartStore = useCartStore();
const { locale } = useI18n();

const closeNotification = (): void => {
  cartStore.showNotification = false;
};

const translatedDescription = computed<string>(() => {
  const product = cartStore.lastAddedProduct;
  if (!product || !product.description) return '';

  const desc = product.description;

  if (typeof desc === 'string') {
    return desc;
  }
  
  if (typeof desc === 'object' && desc !== null) {
    const translations = desc as Record<string, string>;
    
    return translations[locale.value] 
        || translations['en'] 
        || Object.values(translations)[0] 
        || '';
  }

  return '';
});
</script>

<template>
  <div v-if="cartStore.showNotification && cartStore.lastAddedProduct"
       @click.self="closeNotification" 
       class="fixed inset-0 z-50 transition-all duration-300 ease-in-out flex items-end justify-center md:items-center md:justify-center md:bg-black/30"
       :class="{ 
           'opacity-100 translate-y-0': cartStore.showNotification,
           'opacity-0 translate-y-full': !cartStore.showNotification
       }">
    
    <div class="w-full max-w-sm bg-white rounded-t-lg shadow-2xl overflow-hidden md:max-w-xl md:rounded-lg md:p-6 transition duration-700 ease-out transform"
         @click.stop
         :class="{
             'scale-100 md:scale-100': cartStore.showNotification,
             'scale-95 md:scale-95': !cartStore.showNotification,
         }"> 
      
      <div class="flex justify-between items-center p-4 md:p-0 md:mb-4">
        <h3 class="text-lg font-bold text-gray-900 flex items-center">
            <svg class="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ $t('notification.addedToCart') }}
        </h3>
        
        <button type="button" @click="closeNotification" class="cursor-pointer inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none">
          <span class="sr-only">{{ $t('notification.close') }}</span>
          <svg class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.293 6.293a1 1 0 011.414 0L10 8.586l2.293-2.293a1 1 0 111.414 1.414L11.414 10l2.293 2.293a1 1 0 01-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 01-1.414-1.414L8.586 10 6.293 7.707a1 1 0 010-1.414z" />
          </svg>
        </button>
      </div>

      <div class="flex p-4 pt-0 md:pt-0 md:p-0 items-start space-x-4">
        <img v-if="cartStore.lastAddedProduct.image" 
             :src="cartStore.lastAddedProduct.image" 
             class="h-20 w-20 object-contain rounded flex-shrink-0" 
             alt="Product image" />
        
        <div class="flex-1">
            <p class="text-base font-semibold text-gray-900 line-clamp-2">
              {{ cartStore.lastAddedProduct.name }}
            </p>
            <p class="mt-1 text-sm text-gray-500">
                {{ translatedDescription }}
            </p>
            <p class="mt-1 text-sm text-gray-700">
                {{ cartStore.lastAddedProduct.quantity }} {{ $t('notification.quantity') }}
            </p>
            <p class="mt-1 text-sm text-gray-500 font-medium">
                ${{ (Number(cartStore.lastAddedProduct.price) * cartStore.lastAddedProduct.quantity).toFixed(2) }}
            </p>
        </div>
      </div>

      <div class="flex flex-col-reverse md:flex-row md:space-x-4 border-t border-gray-100 bg-gray-50 md:bg-white p-4 md:p-0 md:pt-4">
        <button type="button" 
                @click="closeNotification" 
                class="cursor-pointer order-2 w-full p-2 text-center text-sm font-medium text-gray-600 hover:text-gray-500 hover:bg-gray-100 transition duration-150 mt-2 md:mt-0 md:order-last">
          {{ $t('notification.continueShopping') }}
        </button>

        <RouterLink to="/checkout/cart" 
                    @click="closeNotification"
                    class="cursor-pointer order-1 w-full p-2 text-center text-base font-bold text-white bg-sky-500 hover:bg-sky-600 transition duration-150">
          {{ $t('notification.goToCart') }} ({{ cartStore.totalQuantity }} {{ $t('notification.quantity') }})
        </RouterLink>
      </div>
    </div>
  </div>
</template>