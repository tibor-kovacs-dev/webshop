<script setup lang="ts">
import { useOrderHistoryStore } from '@/stores/orderHistoryStore';
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

interface OrderItem {
    id: number;
    product_id: number;
    quantity: number;
    price_at_purchase: string | number;
    product?: {
        title: string;
        image?: string;
    };
}

interface Order {
    id: string | number;
    order_total: string | number;
    status: "pending" | "processing" | "completed" | "refunded" | "pending_payment";
    created_at: string;
    items: OrderItem[];
    payment_method: string;
}

const { t } = useI18n();
const historyStore = useOrderHistoryStore();

const processingRefund = ref<Record<string | number, boolean>>({});
const { orders, isLoading, error } = storeToRefs(historyStore);

onMounted(() => {
    if (orders.value.length === 0 && !isLoading.value) {
        historyStore.fetchUserOrders();
    }
});

const handleRefund = async (orderId: string | number): Promise<void> => {
    if (!confirm(t('profile.orderHistory.confirmRefund'))) return;

    processingRefund.value[orderId] = true;
    try {
        await historyStore.requestRefund(orderId);
    } catch (e) {
        console.error('Refund hiba:', e);
    } finally {
        processingRefund.value[orderId] = false;
    }
};

const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
};
</script>

<template>
    <div class="p-6 bg-white rounded-lg shadow-md min-h-full">
        <h2 class="text-2xl font-bold mb-6 border-b pb-2 text-gray-900">
            {{ $t('profile.orderHistory.title') }}
        </h2>

        <div v-if="isLoading" class="text-center p-10">
            <font-awesome-icon :icon="['fas', 'spinner']" spin class="text-3xl text-sky-500" />
            <p class="mt-2 text-gray-500">{{ $t('common.loading') }}</p>
        </div>

        <div v-else-if="error" class="text-center p-10 bg-red-50 text-red-700 rounded-lg">
            <p>{{ error }}</p>
        </div>

        <div v-else-if="orders.length === 0" class="text-center p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <p class="text-xl text-gray-600 mb-4">{{ $t('profile.orderHistory.noOrders') }}</p>
            <router-link to="/" class="inline-block px-6 py-2 bg-sky-500 text-white rounded-lg">
                {{ $t('profile.orderHistory.backToHome') }}
            </router-link>
        </div>

        <div v-else class="space-y-6">
            <div 
                v-for="order in (orders as unknown as Order[])" 
                :key="order.id" 
                class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-sky-500"
            >
                <div class="flex justify-between items-center mb-4 border-b border-gray-50 pb-3">
                    <div>
                        <h3 class="font-bold text-lg text-gray-800">#{{ order.id }}</h3>
                        <span class="text-xs font-medium uppercase px-2 py-1 rounded bg-gray-100 text-gray-600">
                            {{ order.status }}
                        </span>
                    </div>
                    <span class="text-sm text-gray-500">{{ formatDate(order.created_at) }}</span>
                </div>

                <div class="flex justify-between items-center py-2">
                    <span class="text-gray-600 font-medium">{{ $t('cart.total') }}:</span>
                    <span class="text-2xl font-black text-gray-900">${{ Number(order.order_total).toFixed(2) }}</span>
                </div>
                
                <div class="mt-4 bg-gray-50 p-3 rounded-lg">
                    <p class="font-bold text-xs uppercase text-gray-400 mb-2">{{ $t('profile.orderHistory.products') }}:</p>
                    <ul class="text-sm space-y-2">
                        <li v-for="item in order.items" :key="item.id" class="flex justify-between items-center">
                            <span class="text-gray-700">{{ item.product?.title || 'Termék' }}</span> 
                            <span class="font-mono text-gray-500">
                                {{ item.quantity }}x <span class="text-gray-900 font-semibold">${{ Number(item.price_at_purchase).toFixed(2) }}</span>
                            </span>
                        </li>
                    </ul>
                </div>

                <div class="flex justify-end pt-4 mt-4 border-t border-gray-50">
                    <button
                        @click="handleRefund(order.id)"
                        :disabled="!['processing', 'completed'].includes(order.status) || processingRefund[order.id]"
                        class="px-5 py-2 text-sm font-bold rounded-lg transition-all"
                        :class="[
                            !['processing', 'completed'].includes(order.status)
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100'
                        ]"
                    >
                        {{ processingRefund[order.id] ? $t('profile.orderHistory.refunding') : $t('profile.orderHistory.requestRefund') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>