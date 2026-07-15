<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faStar as fasStar, faStarHalfAlt, faHeart } from '@fortawesome/free-solid-svg-icons';
import { faStar as farStar } from '@fortawesome/free-regular-svg-icons';
import StarRating from './StarRating.vue';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { type Product } from '@/stores/productStore';
import { useApi } from '@/composables/useApi';

library.add(fasStar, faStarHalfAlt, farStar, faHeart);

const props = defineProps<{
  product: Product
}>();

const router = useRouter();
const { t, locale } = useI18n();
const cartStore = useCartStore();
const wishlistStore = useWishlistStore();
const { getFullUrl } = useApi();

const displayImage = computed(() => getFullUrl(props.product.image));

const displayPrice = computed(() => {
  const basePrice = Number(props.product.price);
  const discount = props.product.discount ? Number(props.product.discount) : 0;
  const priceAfterDiscount = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;

  if (locale.value === 'hu') {
    return priceAfterDiscount * 328;
  } else if (locale.value === 'de' || locale.value === 'en') {
    return priceAfterDiscount * 0.85;
  }
  return priceAfterDiscount;
});

const isProductInWishlist = computed(() => {
  return props.product.id ? wishlistStore.isInWishlist(props.product.id) : false;
});

const goToProductDetail = () => {
  router.push(`/products/${props.product.id}`);
};

const handleAddToCart = () => {
  cartStore.addToCart(props.product);
};

const handleWishlistToggle = () => {
  if (!props.product.id) return;
  
  if (isProductInWishlist.value) {
    wishlistStore.removeFromWishlist(props.product.id);
  } else {
    wishlistStore.addToWishlist(props.product);
  }
};
</script>

<template>
  <div class="p-5 max-w-60 shadow-md flex flex-col justify-between bg-white rounded-lg transition-transform hover:scale-[1.02]">
    <div class="cursor-pointer" @click="goToProductDetail">
      <img 
        :src="displayImage" 
        :alt="product.name" 
        class="justify-self-center object-contain h-40 pb-2 mx-auto" 
      />

      <div class="h-16 flex items-center">
        <h3 class="font-semibold opacity-70 line-clamp-2">{{ product.name }}</h3>
      </div>
    </div>

    <div class="mt-auto">
      <StarRating :rating="product.rating?.rate || 0" />
      <p class="text-sm opacity-60">{{ product.rating?.count || 0 }} {{ t('ratingCount') }}</p>

      <div class="flex flex-row justify-between items-center py-4">
        <p class="font-bold font-mono text-red-500 text-lg">
          {{ $n(displayPrice, 'currency') }}
        </p>

        <slot name="action-icon">
          <font-awesome-icon 
            :icon="['fas', 'heart']" 
            @click="handleWishlistToggle" 
            :class="[
              isProductInWishlist ? 'text-red-600' : 'text-gray-300',
              'hover:text-red-700 cursor-pointer transition-colors duration-150 text-2xl'
            ]" 
          />
        </slot>
      </div>

      <button 
        @click="handleAddToCart"
        class="w-full bg-sky-500 px-3 py-2 cursor-pointer text-white font-medium hover:bg-sky-600 transition duration-150 rounded"
      >
        {{ t('addToCart') }}
      </button>
    </div>
  </div>
</template>