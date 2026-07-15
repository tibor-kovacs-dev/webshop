<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const route = useRoute()

const props = defineProps<{
  productName?: string
  categoryName?: string
}>()

const crumbs = computed(() => {
  const items: { label: string; to: string | null; isLast: boolean }[] = []

  items.push({
    label: t('breadcrumb.home'),
    to: '/',
    isLast: false
  })

  if (route.name === 'CategoryProducts' && props.categoryName) {
    items.push({
      label: props.categoryName,
      to: null,
      isLast: true
    })
  } 
  else if (route.name === 'ProductDetail') {
    if (props.categoryName) {
      items.push({
        label: props.categoryName,
        to: `/category/${props.categoryName.toLowerCase().replace(/\s+/g, '-')}`,
        isLast: false
      })
    }
    if (props.productName) {
      items.push({
        label: props.productName,
        to: null,
        isLast: true
      })
    }
  } 
  else {
    let label = ''
    switch (route.name?.toString()) {
      case 'Cart': label = t('breadcrumb.cart'); break
      case 'Checkout': label = t('breadcrumb.checkout'); break
      case 'CheckoutComplete': label = t('breadcrumb.orderComplete'); break
      case 'NewArrivals': label = t('breadcrumb.newArrivals'); break
      case 'DiscountedProducts': label = t('breadcrumb.discounted'); break
      case 'Profile': label = t('breadcrumb.profile'); break
      case 'Wishlist': label = t('breadcrumb.wishlist'); break
      default: label = ''
    }

    if (label) {
      items.push({
        label,
        to: null,
        isLast: true
      })
    }
  }

  return items
})
</script>

<template>
  <nav v-if="crumbs.length > 1" aria-label="Breadcrumb" class="max-w-7xl mx-auto px-4 py-4 text-sm">
    <ol class="flex items-center space-x-2 text-gray-600">
      <li v-for="(crumb, index) in crumbs" :key="index" class="flex items-center">
        <span v-if="index > 0" class="mx-2 text-gray-300">/</span>
        <component
          :is="crumb.isLast ? 'span' : RouterLink"
          :to="crumb.to"
          class="transition-colors"
          :class="crumb.isLast 
            ? 'text-gray-900 font-semibold' 
            : 'text-gray-500 hover:text-sky-600'"
        >
          {{ crumb.label }}
        </component>
      </li>
    </ol>
  </nav>
</template>