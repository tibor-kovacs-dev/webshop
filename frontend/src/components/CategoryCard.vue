<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';

export interface Category {
  id: number | string;
  title: string | Record<string, string>;
  description?: string | Record<string, string>;
  image?: string;
  slug?: string;
}

const { t, locale } = useI18n();

const props = defineProps<{
  category: Category
}>();

const getTranslated = (field: string | Record<string, string> | undefined): string => {
  if (!field) return '';
  
  if (typeof field === 'object') {
    return field[locale.value] || field['en'] || field['hu'] || Object.values(field)[0] || '';
  }
  
  if (typeof field === 'string') {
    const translationKey = `categories.${field}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : field;
  }
  
  return field;
};
</script>

<template>
  <div class="p-5 max-w-60 shadow-md flex flex-col justify-between bg-white rounded-lg transition-transform hover:scale-[1.02] h-full">
    <!-- Kép konténer -->
    <div class="h-40 w-full mb-4 overflow-hidden rounded-lg border border-gray-100">
      <img
        v-if="category.image"
        :src="category.image"
        :alt="getTranslated(category.title)"
        class="w-full h-full object-contain bg-white p-2"   <!-- object-contain + padding -->
      />
    </div>

    <div class="flex flex-col flex-grow">
      <p class="font-semibold text-center text-base leading-tight mb-3">
        {{ getTranslated(category.title) }}
      </p>
      
      <p class="text-sm text-gray-600 mb-5 line-clamp-3 text-center flex-grow">
        {{ getTranslated(category.description) }}
      </p>
    </div>

    <RouterLink 
      :to="`/category/${category.slug || category.id}`"
      class="block w-full bg-sky-500 px-4 py-2.5 text-white text-center hover:bg-sky-600 transition duration-150 rounded font-medium text-sm"
    >
      {{ t('viewCategory') }}
    </RouterLink>
  </div>
</template>