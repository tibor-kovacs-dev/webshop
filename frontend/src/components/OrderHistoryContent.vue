<script setup lang="ts">
import { useOrderHistoryStore } from '@/stores/orderHistoryStore';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { usePrice } from '@/composables/usePrice';

const { t } = useI18n();
const historyStore = useOrderHistoryStore();
const { orderAmount } = usePrice();

const processingRefund = ref<Record<string | number, boolean>>({});
const { orders, isLoading, error, refundFeedback } = storeToRefs(historyStore);

onMounted(() => {
    if (orders.value.length === 0 && !isLoading.value) {
        historyStore.fetchUserOrders();
    }
});

onBeforeUnmount(() => {
    historyStore.clearRefundFeedback();
});

const handleRefund = async (orderId: string | number): Promise<void> => {
    if (!confirm(t('profile.orderHistory.confirmRefund'))) return;

    processingRefund.value[orderId] = true;
    try {
        await historyStore.requestRefund(orderId);
    } catch (e) {
        console.error('Refund request failed:', e);
    } finally {
        processingRefund.value[orderId] = false;
    }
};

const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
};

const formatOrderAmount = (amount: number, currency: string | undefined): string => {
    const normalizedCurrency = (currency || 'huf').toUpperCase();
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: normalizedCurrency,
        maximumFractionDigits: normalizedCurrency === 'HUF' ? 0 : 2,
    }).format(amount);
};
</script>

<template>
    <div class="p-6 bg-white rounded-lg shadow-md min-h-full">
        <h2 class="text-2xl font-bold mb-6 border-b pb-2 text-gray-900">
            {{ $t('profile.orderHistory.title') }}
        </h2>

        <div
            v-if="refundFeedback"
            role="status"
            class="mb-4 rounded-lg p-3 text-sm"
            :class="refundFeedback.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'"
        >
            {{ $t(refundFeedback.key, refundFeedback.params ?? {}) }}
        </div>

        <div v-if="isLoading" class="text-center p-10">
            <font-awesome-icon :icon="['fas', 'spinner']" spin class="text-3xl text-sky-500" />
            <p class="mt-2 text-gray-500">{{ $t('common.loading') }}</p>
        </div>

        <div v-else-if="error" class="text-center p-10 bg-red-50 text-red-700 rounded-lg">
            <p>{{ $t(error) }}</p>
        </div>

        <div v-else-if="orders.length === 0" class="text-center p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <p class="text-xl text-gray-600 mb-4">{{ $t('profile.orderHistory.noOrders') }}</p>
            <router-link to="/" class="inline-block px-6 py-2 bg-sky-500 text-white rounded-lg">
                {{ $t('profile.orderHistory.backToHome') }}
            </router-link>
        </div>

        <div v-else class="space-y-6">
            <div
                v-for="order in orders"
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
                    <span class="text-2xl font-black text-gray-900">
                        {{ formatOrderAmount(orderAmount(order.order_total_minor, order.order_total), order.currency) }}
                    </span>
                </div>

                <div class="mt-4 bg-gray-50 p-3 rounded-lg">
                    <p class="font-bold text-xs uppercase text-gray-400 mb-3">{{ $t('profile.orderHistory.products') }}:</p>
                    <ul class="text-sm space-y-3">
                        <li
                            v-for="item in order.items"
                            :key="item.id"
                            class="flex items-center gap-3"
                        >
                            <div class="w-14 h-14 flex-shrink-0 rounded-lg bg-white border border-gray-100 overflow-hidden flex items-center justify-center">
                                <img
                                    v-if="item.product?.image"
                                    :src="item.product.image"
                                    :alt="item.product?.title || $t('profile.orderHistory.unknownProduct')"
                                    class="w-full h-full object-contain"
                                />
                                <div
                                    v-else
                                    class="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs"
                                >
                                    —
                                </div>
                            </div>

                            <div class="flex-1 min-w-0">
                                <p class="text-gray-800 font-medium truncate">
                                    {{ item.product?.title || $t('profile.orderHistory.unknownProduct') }}
                                </p>
                                <p class="text-gray-500 text-xs mt-0.5">
                                    {{ item.quantity }}×
                                </p>
                            </div>

                            <span class="font-semibold text-gray-900 whitespace-nowrap">
                                {{ formatOrderAmount(orderAmount(item.price_at_purchase_minor, item.price_at_purchase), order.currency) }}
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