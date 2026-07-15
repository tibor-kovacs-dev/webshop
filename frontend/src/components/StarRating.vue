<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  rating: number | string
}>()

const numericRating = computed(() => {
  const val = typeof props.rating === 'string' ? parseFloat(props.rating) : props.rating
  return isNaN(val) ? 0 : val
})

const fullStars = computed(() => Math.floor(numericRating.value))
const hasHalfStar = computed(() => (numericRating.value - fullStars.value) >= 0.5)
</script>

<template>
  <div class="flex text-yellow-400 items-center">
    <template v-for="i in 5" :key="i">
      <font-awesome-icon
        v-if="i <= fullStars"
        :icon="['fas', 'star']"
        class="mr-0.5"
      />
      <font-awesome-icon
        v-else-if="i === fullStars + 1 && hasHalfStar"
        :icon="['fas', 'star-half-alt']"
        class="mr-0.5"
      />
      <font-awesome-icon
        v-else
        :icon="['far', 'star']"
        class="mr-0.5 text-gray-300"
      />
    </template>
  </div>
</template>