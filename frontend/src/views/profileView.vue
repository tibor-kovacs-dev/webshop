<script setup lang="ts">
import { ref, markRaw, onMounted, watch, type Component } from 'vue'; 
import { useRoute, useRouter } from 'vue-router'; 
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useI18n } from 'vue-i18n';
import { library } from '@fortawesome/fontawesome-svg-core';
import { 
  faUser, faBoxOpen, faHeart, faCog, 
  faSpinner, faExclamationCircle, faKey 
} from '@fortawesome/free-solid-svg-icons';

import TheNavigation from '@/components/TheNavigation.vue';
import TheFooter from '@/components/TheFooter.vue';
import TheBreadcrumb from '@/components/TheBreadcrumb.vue';
import UserProfileForm from '@/components/UserProfileForm.vue';
import OrderHistoryContent from '@/components/OrderHistoryContent.vue';
import WishlistContent from '@/components/WishlistContent.vue';
import UserSettingsContent from '@/components/UserSettingsContent.vue';

type TabId = 'profile' | 'history' | 'wishlist' | 'settings';

interface Tab {
  id: TabId;
  label: string;
  icon: string[];
}

library.add(faUser, faBoxOpen, faHeart, faCog, faSpinner, faExclamationCircle, faKey);

const { t } = useI18n();
const authStore = useAuthStore();
const userStore = useUserStore();
const route = useRoute();
const router = useRouter();

const components: Record<TabId, Component> = {
  profile: markRaw(UserProfileForm),
  history: markRaw(OrderHistoryContent),
  wishlist: markRaw(WishlistContent),
  settings: markRaw(UserSettingsContent),
};

const tabs: Tab[] = [
  { id: 'profile', label: 'profile.data', icon: ['fas', 'user'] },
  { id: 'history', label: 'profile.history', icon: ['fas', 'box-open'] },
  { id: 'wishlist', label: 'profile.wishlist.title', icon: ['fas', 'heart'] },
  { id: 'settings', label: 'profile.settings.title', icon: ['fas', 'cog'] },
];

const activeTab = ref<TabId>((route.query.tab as TabId) || 'profile');
const activeComponent = ref<Component>(components[activeTab.value]);

const switchTab = (tabId: TabId): void => {
  activeTab.value = tabId;
  activeComponent.value = components[tabId];
  router.push({ name: 'Profile', query: { tab: tabId } });
};

watch(() => route.query.tab, (newTab) => {
  if (newTab && newTab !== activeTab.value) {
    activeTab.value = newTab as TabId;
    activeComponent.value = components[activeTab.value];
  }
});
</script>

<template>
  <TheNavigation />
  <TheBreadcrumb />

  <div v-if="!authStore.isInitialized" class="container mx-auto my-10 p-5 min-h-[60vh] flex flex-col justify-center items-center">
    <font-awesome-icon icon="spinner" spin class="text-5xl text-sky-500 mb-4" />
    <p class="text-gray-500">{{ t('auth.loading') }}</p>
  </div>

  <div v-else-if="authStore.isAuthenticated" class="container mx-auto my-10 p-5 min-h-[60vh]">
    <h1 class="text-4xl font-extrabold mb-8 text-center text-gray-800">{{ t('profile.account') }}</h1>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="md:col-span-1 bg-white p-4 rounded-lg shadow-lg h-min">
        <nav class="space-y-2">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            @click="switchTab(tab.id)"
            :class="[
              'w-full text-left cursor-pointer py-3 px-4 font-semibold transition duration-200 flex items-center rounded-md',
              activeTab === tab.id ? 'bg-sky-500 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
            ]"
          >
            <font-awesome-icon :icon="tab.icon" class="w-5 h-5 mr-3" />
            {{ t(tab.label) }}
          </button>
        </nav>
      </div>

      <div class="md:col-span-3">
        <div v-if="userStore.isLoading" class="flex justify-center p-10">
          <font-awesome-icon icon="spinner" spin class="text-3xl text-sky-500" />
        </div>
        <div v-else class="bg-white p-6 rounded-lg shadow-sm border border-gray-50">
          <component :is="activeComponent" :key="activeTab" /> 
        </div>
      </div>
    </div>
  </div>

  <div v-else class="container mx-auto my-10 p-5 min-h-[60vh] flex flex-col justify-center items-center">
    <div class="bg-white p-8 rounded-xl shadow-lg text-center max-w-md border border-gray-100">
      <font-awesome-icon icon="exclamation-circle" class="text-red-500 text-5xl mb-4" />
      <h2 class="text-2xl font-bold text-gray-800 mb-2">{{ t('auth.access_denied') || 'Hozzáférés megtagadva' }}</h2>
      <p class="text-gray-600 mb-6">{{ t('auth.login_required_profile') || 'A profilod megtekintéséhez kérjük, jelentkezz be.' }}</p>
      <router-link to="/login" class="bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-8 rounded-lg transition-all block text-center">
        {{ t('auth.login') || 'Bejelentkezés' }}
      </router-link>
    </div>
  </div>
  <TheFooter />
</template>