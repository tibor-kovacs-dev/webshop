<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import TheNavigation from '@/components/TheNavigation.vue';
import HeroSection from '@/components/HeroSection.vue';
import { useUserStore } from '@/stores/userStore';

const userStore = useUserStore();

const AsyncCategories = defineAsyncComponent(() => 
  import('@/components/TheCategories.vue')
);

const AsyncFooter = defineAsyncComponent(() => 
  import('@/components/TheFooter.vue')
);
</script>

<template>
  <TheNavigation />
  <main>
    <HeroSection />
    <AsyncCategories />
  </main>
  <AsyncFooter />
</template>