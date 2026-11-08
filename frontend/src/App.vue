<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import CartNotification from './components/CartNotification.vue'
import { useCartStore } from './stores/cartStore'
import { useWishlistStore } from './stores/wishlistStore'

const cartStore = useCartStore()
const wishlistStore = useWishlistStore()

onMounted(() => {
  void cartStore.refreshPrices()
  void wishlistStore.refreshPrices()
})
</script>

<template>
  <RouterView />
  <CartNotification />
</template>

<style scoped></style>