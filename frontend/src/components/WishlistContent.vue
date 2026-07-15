<script setup lang="ts">
import ProductCard from '@/components/ProductCard.vue';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { faHeartBroken, faTrash } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';

library.add(faHeartBroken, faTrash);

const { t } = useI18n();
const wishlistStore = useWishlistStore();
const { wishlist: wishlistItems } = storeToRefs(wishlistStore);

const handleRemoveItem = (productId: number | string): void => {
    wishlistStore.removeFromWishlist(productId);
};

const handleClearWishlist = (): void => {
    if (confirm(t('profile.wishlist.confirmClear'))) {
        wishlistStore.clearWhishlist();
    }
};
</script>

<template>
    <div class="container mx-auto my-10 p-5">
        <div v-if="wishlistItems.length === 0" class="text-center p-10 bg-gray-100 rounded-lg shadow-inner">
            <font-awesome-icon :icon="['fas', 'heart-broken']" class="text-6xl text-gray-400 mb-4" />
            <p class="text-xl text-gray-600 mb-4">{{ t('profile.wishlist.emptyTitle') }}</p>
            <router-link to="/" class="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition duration-150">
                {{ t('profile.wishlist.toShop') }}
            </router-link>
        </div>

        <div v-else>
            <div class="flex justify-end mb-4">
                <button 
                    @click="handleClearWishlist" 
                    class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition duration-150"
                >
                    {{ t('profile.wishlist.clearButton') }}
                </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div v-for="product in wishlistItems" :key="product.id">
                    <ProductCard :product="product">
                        <template #action-icon>
                            <button 
                                @click.stop="handleRemoveItem(product.id)" 
                                class="p-1 text-2xl text-gray-400 hover:text-red-600 transition duration-150 cursor-pointer"
                                :aria-label="t('profile.wishlist.removeItem')"
                            >
                                <font-awesome-icon :icon="['fas', 'trash']" />
                            </button>
                        </template>
                    </ProductCard>
                </div>
            </div>
        </div>
    </div>
</template>