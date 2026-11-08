import { defineStore } from "pinia";
import axios from "axios";
import { computed, ref } from "vue";
import { type Product } from "./productStore";

export const useWishlistStore = defineStore('wishlist', () => {
    const wishlist = ref<Product[]>([]);

    const wishlistCount = computed<number>(() => wishlist.value.length);

    const isInWishlist = computed(() => (productId: number | string): boolean => {
        return wishlist.value.some(item => item.id === productId);
    });

    function addToWishlist(product: Product): void {
        if (!product || !product.id) {
            console.warn('Attempted to add an undefined or incomplete product to the wishlist.');
            return;
        }

        if (!isInWishlist.value(product.id)) {
            wishlist.value.push(product);
        }
    }

    function removeFromWishlist(productId: number | string): void {
        wishlist.value = wishlist.value.filter(item => item.id !== productId);
    }

    function clearWhishlist(): void {
        wishlist.value = [];
    }

    async function refreshPrices(): Promise<void> {
        if (wishlist.value.length === 0) return;

        try {
            const response = await axios.get<Record<string, { prices: Product['prices'] }>>(
                '/api/products/prices',
                {
                    params: {
                        ids: wishlist.value.map(item => item.id).join(','),
                    },
                },
            );

            const priceMap = response.data ?? {};

            wishlist.value = wishlist.value
                .filter(item => priceMap[String(item.id)])
                .map(item => ({
                    ...item,
                    prices: priceMap[String(item.id)]?.prices,
                }));
        } catch (error) {
            console.error('Wishlist price refresh failed:', error);
        }
    }

    return {
        wishlist,
        wishlistCount,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        clearWhishlist,
        refreshPrices
    };
}, {
    persist: true
});