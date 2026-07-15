<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface Quote {
  text: string;
  author: string;
}

const { t } = useI18n()

const quotes = computed<Quote[]>(() => [
  {
    text: t('quotes.quote_1_text'),
    author: t('quotes.quote_1_author')
  },
  {
    text: t('quotes.quote_2_text'),
    author: t('quotes.quote_2_author')
  },
  {
    text: t('quotes.quote_3_text'),
    author: t('quotes.quote_3_author')
  }
])

const currentIndex = ref(0)
const isDragging = ref(false)
const startX = ref(0)
const currentTranslate = ref(0)
const prevTranslate = ref(0)

const handleTouchStart = (e: TouchEvent) => {
  if (!e.touches[0]) return
  isDragging.value = true
  startX.value = e.touches[0].clientX
  prevTranslate.value = currentTranslate.value
}

const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value || !e.touches[0]) return
  const currentX = e.touches[0].clientX
  currentTranslate.value = prevTranslate.value + currentX - startX.value
}

const handleTouchEnd = () => {
  if (!isDragging.value) return
  isDragging.value = false

  const movedBy = currentTranslate.value - prevTranslate.value

  if (movedBy < -50 && currentIndex.value < quotes.value.length - 2) {
    currentIndex.value += 2
  } else if (movedBy > 50 && currentIndex.value > 0) {
    currentIndex.value -= 2
  }

  currentTranslate.value = 0
}
</script>

<template>
  <section class="bg-sky-950/90 py-16">
    <div class="container mx-auto px-4">
      <h2 class="text-xl md:text-2xl text-white text-left mb-12 uppercase tracking-widest opacity-80">
        {{ t('quotes.title') }}
      </h2>

      <div class="relative overflow-hidden"
           @touchstart="handleTouchStart"
           @touchmove="handleTouchMove"
           @touchend="handleTouchEnd">
           
        <div class="flex transition-transform duration-1000 ease-in-out"
             :style="{ transform: `translateX(-${currentIndex * 50}%)` }">
             
          <div v-for="(quote, index) in quotes" :key="index" class="w-full md:w-1/2 flex-shrink-0 px-4 md:px-6">
            <div class="backdrop-blur-md rounded-2xl p-8 md:p-12 text-center h-full flex flex-col justify-center border border-white/10 bg-white/5 shadow-2xl">
              <font-awesome-icon :icon="['fas', 'quote-left']" class="text-sky-400/30 text-4xl mb-6 mx-auto" />
              
              <p class="text-xl md:text-2xl text-sky-50 italic mb-8 leading-relaxed font-light">
                "{{ quote.text }}"
              </p>
              
              <div class="w-12 h-0.5 bg-sky-500 mx-auto mb-4"></div>
              
              <p class="text-lg text-white font-semibold tracking-wide">
                {{ quote.author }}
              </p>
            </div>
          </div>
        </div>

        <button @click="currentIndex = Math.max(0, currentIndex - 2)"
                :disabled="currentIndex === 0"
                class="absolute left-2 md:left-0.5 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 disabled:opacity-5 text-white p-4 rounded-full transition-all backdrop-blur-sm border border-white/10 group">
          <svg class="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button @click="currentIndex = Math.min(quotes.length - 2, currentIndex + 2)"
                :disabled="currentIndex >= quotes.length - 2"
                class="absolute right-2 md:right-0.5 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 disabled:opacity-5 text-white p-4 rounded-full transition-all backdrop-blur-sm border border-white/10 group">
          <svg class="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div class="flex justify-center space-x-4 mt-12">
          <button @click="currentIndex = 0"
                  class="h-1.5 rounded-full transition-all duration-300"
                  :class="currentIndex === 0 ? 'w-8 bg-sky-500' : 'w-4 bg-white/20'"
                  aria-label="Go to slide 1"></button>
          <button v-if="quotes.length > 2" @click="currentIndex = 1"
                  class="h-1.5 rounded-full transition-all duration-300"
                  :class="currentIndex > 0 ? 'w-8 bg-sky-500' : 'w-4 bg-white/20'"
                  aria-label="Go to slide 2"></button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.container {
  max-width: 1200px;
}
</style>