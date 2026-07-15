import { defineStore } from "pinia";
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
            console.warn("Megpróbáltak undefined vagy hiányos terméket hozzáadni a kívánságlistához.");
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

    return {
        wishlist,
        wishlistCount,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        clearWhishlist
    };
}, {
    persist: true
});