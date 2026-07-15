<script setup>
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<template>
  <picture>
    <source 
      media="(max-width: 768px)" 
      :srcset="t('hero.mobile_image')" 
      type="image/avif"
    >
    
    <source 
      :srcset="t('hero.desktop_image')" 
      type="image/avif"
    >
    
    <img 
      :src="t('hero.desktop_image')" 
      :alt="t('hero.alt_text')" 
      fetchpriority="high" 
      style="width: 100%; height: auto;"
    >
  </picture>
</template>