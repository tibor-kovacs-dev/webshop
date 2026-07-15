<script setup lang="ts">
import TheNavigation from '@/components/TheNavigation.vue';
import TheFooter from '@/components/TheFooter.vue';
import { useOrderHistoryStore } from '@/stores/orderHistoryStore';
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import TheBreadcrumb from '@/components/TheBreadcrumb.vue';

const { t } = useI18n();
const historyStore = useOrderHistoryStore();

const { orders, isLoading, error } = storeToRefs(historyStore);

onMounted((): void => {
    if (orders.value.length === 0 && !isLoading.value) {
        historyStore.fetchUserOrders();
    }
});

const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
};
</script>

<template>
    <TheNavigation />
    <TheBreadcrumb/>
    <div class="container mx-auto my-10 p-5">
        <h1 class="text-3xl font-bold mb-6 text-center">{{ t('orderHistory.title') }}</h1>

        <div v-if="isLoading" class="text-center p-10">
            <font-awesome-icon :icon="['fas', 'spinner']" spin class="text-3xl text-blue-500" />
            <p class="mt-2">{{ t('orderHistory.loading') }}</p>
        </div>

        <div v-else-if="error" class="text-center p-10 bg-red-100 text-red-700 rounded">
            <p>{{ error }}</p>
            <p>{{ t('orderHistory.errorMessage') }}</p>
        </div>

        <div v-else-if="orders.length === 0" class="text-center p-10 bg-gray-100 rounded-lg shadow-inner">
            <p class="text-xl text-gray-600 mb-4">{{ t('orderHistory.emptyMessage') }}</p>
            <router-link to="/" class="text-blue-500 hover:underline">
                {{ t('orderHistory.browseProducts') }}
            </router-link>
        </div>

        <div v-else class="space-y-6">
            <div 
                v-for="order in orders" 
                :key="order.id" 
                class="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-600 transition hover:shadow-xl"
            >
                <div class="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 class="text-xl font-bold text-gray-800">Rendelés #{{ order.id }}</h2>
                    <span class="text-sm text-gray-500">
                        {{ t('orderHistory.date') }}: {{ formatDate(order.created_at) }}
                    </span>
                </div>

                <div class="flex justify-between items-center py-2 bg-gray-50 p-3 rounded-md mb-4">
                    <span class="text-lg font-semibold">{{ t('orderHistory.total') }}:</span>
                    <span class="text-2xl font-bold text-red-600">${{ order.order_total }}</span>
                </div>
                
                <div class="mt-4">
                    <p class="font-medium mb-3 text-gray-700">{{ t('orderHistory.products') }}:</p>
                    <ul class="space-y-2 border-t pt-3">
                        <li v-for="item in order.items" :key="item.id" class="flex justify-between items-start text-sm border-b last:border-b-0 pb-2">
                            <span class="flex-1 mr-4">
                                <span class="font-medium text-gray-800">{{ item.product?.title || 'Ismeretlen termék' }}</span> 
                                ({{ item.quantity }} db)
                            </span>
                            <span class="font-semibold text-gray-600">
                                ${{ (Number(item.price_at_purchase) * item.quantity).toFixed(2) }}
                            </span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
    <TheFooter />
</template>