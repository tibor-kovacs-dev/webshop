<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useProductStore, type Product } from '@/stores/productStore';
import { useCartStore } from '@/stores/cartStore';
import { useI18n } from 'vue-i18n';
import { useErrorMessage } from '@/composables/useErrorMessage';
import { usePrice } from '@/composables/usePrice';
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import {
  faStar as fasStar,
  faStarHalfAlt,
  faTimes,
  faChevronLeft,
  faChevronRight,
  faCartShopping
} from '@fortawesome/free-solid-svg-icons';
import { faStar as farStar } from '@fortawesome/free-regular-svg-icons';

import TheNavigation from '@/components/TheNavigation.vue';
import TheFooter from '@/components/TheFooter.vue';
import TheBreadcrumb from '@/components/TheBreadcrumb.vue';
import StarRating from '@/components/StarRating.vue';
import CommentSection from '@/components/CommentSection.vue';

library.add(
  fasStar,
  faStarHalfAlt,
  farStar,
  faTimes,
  faChevronLeft,
  faChevronRight,
  faCartShopping
);

const { locale, t } = useI18n();
const { translateError } = useErrorMessage();
const { unitPrice, listPrice } = usePrice();

const route = useRoute();
const cartStore = useCartStore();
const productStore = useProductStore();

const productSlug = ref<string>(String(route.params.productSlug ?? ''));
const product = ref<Product | null>(null);
const mainImage = ref<string>('');
const isModalOpen = ref<boolean>(false);
const currentImageIndex = ref<number>(0);

const touch_start_x = ref<number>(0);
const touch_end_x = ref<number>(0);
const SWIPE_THRESHOLD = 50;

let loadRequestId = 0;

watch(
  () => route.params.productSlug,
  async (newSlug) => {
    productSlug.value = String(newSlug ?? '');

    product.value = null;
    mainImage.value = '';
    currentImageIndex.value = 0;
    isModalOpen.value = false;

    await loadProductDetails();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
);

const displayPrice = computed((): number => {
  if (!product.value) return 0;

  return unitPrice(product.value);
});

const originalPrice = computed((): number => {
  if (!product.value) return 0;

  return listPrice(product.value);
});

const galleryImages = computed((): string[] => {
  if (!product.value) return [];

  const baseImage = product.value.image;
  const gallery = product.value.gallery_images || [];

  return Array.from(new Set([baseImage, ...gallery]));
});

const modalImageURL = computed((): string => {
  const images = galleryImages.value;

  if (images.length === 0) return '';

  return images[currentImageIndex.value] || '';
});

const preloadImage = (url: string | undefined): void => {
  if (!url) return;

  const img = new Image();
  img.src = url;
};

const preloadNeighborImages = (): void => {
  const imgs = galleryImages.value;

  if (imgs.length <= 1) return;

  const total = imgs.length;
  const nextImg = imgs[(currentImageIndex.value + 1) % total];
  const prevImg = imgs[(currentImageIndex.value - 1 + total) % total];

  if (nextImg) preloadImage(nextImg);
  if (prevImg) preloadImage(prevImg);
};

const setMainImage = (url: string): void => {
  mainImage.value = url;
};

const openModal = (url: string): void => {
  const index = galleryImages.value.indexOf(url);

  currentImageIndex.value = index >= 0 ? index : 0;
  isModalOpen.value = true;

  preloadNeighborImages();
};

const closeModal = (): void => {
  isModalOpen.value = false;
};

const prevImage = (): void => {
  const total = galleryImages.value.length;

  if (total === 0) return;

  currentImageIndex.value =
    (currentImageIndex.value - 1 + total) % total;

  preloadNeighborImages();
};

const nextImage = (): void => {
  const total = galleryImages.value.length;

  if (total === 0) return;

  currentImageIndex.value =
    (currentImageIndex.value + 1) % total;

  preloadNeighborImages();
};

const handleSwipe = (): void => {
  const imgs = galleryImages.value;

  if (!isModalOpen.value || imgs.length <= 1) return;

  const diff = touch_start_x.value - touch_end_x.value;

  if (Math.abs(diff) > SWIPE_THRESHOLD) {
    diff > 0 ? nextImage() : prevImage();
  }
};

const handleKeydown = (e: KeyboardEvent): void => {
  if (!isModalOpen.value) return;

  if (e.key === 'Escape') closeModal();
  else if (e.key === 'ArrowLeft') prevImage();
  else if (e.key === 'ArrowRight') nextImage();
};

const loadProductDetails = async (): Promise<void> => {
  const currentRequestId = ++loadRequestId;

  if (!productSlug.value) {
    productStore.error = 'errors.products.slugMissing';
    return;
  }

  const fetched = await productStore.fetchProductBySlug(productSlug.value);

  if (currentRequestId !== loadRequestId) return;

  if (fetched) {
    product.value = fetched;
    mainImage.value = fetched.image;

    if (galleryImages.value.length > 1) {
      preloadNeighborImages();
    }
  }
};

const translatedDescription = computed((): string => {
  if (!product.value || !product.value.description) return '';

  const desc = product.value.description;

  if (typeof desc === 'string') return desc;

  return desc[locale.value]
    || desc['en']
    || Object.values(desc)[0]
    || '';
});

onMounted(() => {
  loadProductDetails();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  loadRequestId++;
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <TheNavigation />

  <TheBreadcrumb
    :product-name="product?.name || ''"
    :category-name="product?.category || ''"
  />

  <div class="p-10 container mx-auto min-h-screen">
    <div v-if="productStore.isLoading" class="text-center p-20">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent mb-4">
      </div>

      <p class="text-gray-500 font-medium">
        {{ t('common.loading') }}...
      </p>
    </div>

    <div
      v-else-if="productStore.error"
      class="bg-red-50 text-red-600 p-8 rounded-2xl text-center border border-red-100 max-w-lg mx-auto"
    >
      <font-awesome-icon
        :icon="['fas', 'times']"
        class="text-3xl mb-4"
      />

      <p class="font-bold mb-2">{{ t('errors.title') }}</p>
      <p>{{ translateError(productStore.error) }}</p>

      <button
        @click="loadProductDetails"
        class="mt-4 text-sm font-bold underline cursor-pointer"
      >
        {{ t('errors.retry') }}
      </button>
    </div>

    <div v-else-if="product" class="text-center">
      <div class="grid max-sm:grid-cols-1 grid-cols-1 md:grid-cols-2 gap-12 items-start">
        <div class="w-full">
          <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-50 overflow-hidden mb-6">
            <Transition name="main-fade" mode="out-in">
              <img
                :key="mainImage"
                :src="mainImage"
                :alt="product.name"
                class="max-h-[450px] w-full object-contain cursor-zoom-in hover:scale-105 transition-transform duration-500"
                @click="openModal(mainImage)"
              />
            </Transition>
          </div>

          <div
            v-if="galleryImages.length > 1"
            class="flex justify-center gap-3 overflow-x-auto p-2 custom-scrollbar"
          >
            <img
              v-for="(image, index) in galleryImages"
              :key="index"
              :src="image"
              @click="setMainImage(image)"
              class="h-20 w-20 object-cover cursor-pointer transition-all rounded-xl border-2 flex-shrink-0"
              :class="image === mainImage
                ? 'border-sky-500 shadow-md scale-105'
                : 'border-gray-100 opacity-60 hover:opacity-100'"
            />
          </div>
        </div>

        <div class="text-left space-y-6">
          <div>
            <span class="text-sky-600 font-bold text-sm uppercase tracking-widest">
              {{ product.category }}
            </span>

            <h1 class="text-4xl font-black text-gray-900 mt-2 mb-4 leading-tight">
              {{ product.name }}
            </h1>

            <div class="flex items-center gap-4">
              <StarRating :rating="product.rating?.rate || 0" />

              <span class="text-gray-400 text-sm">
                ({{ product.rating?.count || 0 }} {{ t('reviews') }})
              </span>
            </div>
          </div>

          <div class="h-[2px] w-20 bg-sky-500"></div>

          <p class="text-gray-600 leading-relaxed text-lg">
            {{ translatedDescription }}
          </p>

          <div class="py-4">
            <div
              v-if="Number(product.discount) > 0"
              class="text-sm text-gray-400 line-through mb-1"
            >
              {{ $n(originalPrice, 'currency') }}
            </div>

            <p class="font-black text-4xl text-sky-600">
              {{ $n(displayPrice, 'currency') }}
            </p>
          </div>

          <button
            @click="cartStore.addToCart(product)"
            class="w-full bg-sky-500 py-5 px-8 cursor-pointer text-white font-black rounded-2xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-200 active:scale-95 flex items-center justify-center gap-3"
          >
            <font-awesome-icon :icon="['fas', 'cart-shopping']" />
            {{ t('addToCart') }}
          </button>
        </div>
      </div>

      <div class="mt-20 border-t border-gray-100 pt-16">
        <CommentSection
          v-if="product.id"
          :product-id="product.id"
        />
      </div>
    </div>
  </div>

  <Transition name="fade">
    <div
      v-if="isModalOpen"
      @click="closeModal"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
      @touchstart="touch_start_x = $event.touches[0]?.clientX ?? 0"
      @touchend="touch_end_x = $event.changedTouches[0]?.clientX ?? 0; handleSwipe();"
    >
      <button
        @click="closeModal"
        class="absolute top-8 right-8 text-white text-4xl hover:text-sky-400 cursor-pointer z-[110]"
      >
        <FontAwesomeIcon :icon="['fas', 'times']" />
      </button>

      <div
        @click.stop=""
        class="relative flex flex-col items-center w-full max-w-6xl"
      >
        <div class="relative flex items-center justify-center w-full h-[80vh]">
          <button
            @click.stop="prevImage"
            v-if="galleryImages.length > 1"
            class="absolute left-0 md:-left-16 p-4 text-white hover:text-sky-400 cursor-pointer transition-colors"
          >
            <FontAwesomeIcon
              :icon="['fas', 'chevron-left']"
              size="3x"
            />
          </button>

          <Transition name="slide-fade" mode="out-in">
            <img
              :key="modalImageURL"
              :src="modalImageURL"
              class="max-h-full max-w-full object-contain shadow-2xl rounded-lg"
            />
          </Transition>

          <button
            @click.stop="nextImage"
            v-if="galleryImages.length > 1"
            class="absolute right-0 md:-right-16 p-4 text-white hover:text-sky-400 cursor-pointer transition-colors"
          >
            <FontAwesomeIcon
              :icon="['fas', 'chevron-right']"
              size="3x"
            />
          </button>
        </div>

        <div class="mt-6 text-white/60 text-sm font-mono tracking-widest">
          {{ currentImageIndex + 1 }} / {{ galleryImages.length }}
        </div>
      </div>
    </div>
  </Transition>

  <TheFooter />
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.main-fade-enter-active,
.main-fade-leave-active {
  transition: opacity 0.4s ease;
}

.main-fade-enter-from,
.main-fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: scale(1.05);
  opacity: 0;
}
</style>