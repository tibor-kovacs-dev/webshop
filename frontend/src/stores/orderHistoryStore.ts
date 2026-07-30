import { defineStore } from "pinia";
import { ref } from "vue";
import axios from 'axios';
import { useAuthStore } from "./authStore";

export interface OrderItem {
    id: number;
    product_id: number;
    quantity: number;
    price_at_purchase: string | number;
    product?: {
        title: string;
        image?: string;
    }
}

export interface Order {
    id: number | string;
    order_total: string | number;
    status: 'pending' | 'processing' | 'completed' | 'refunded' | 'pending_payment';
    created_at: string;
    items: OrderItem[];
    payment_method: string;
    shipping_details: string;
    currency: string;
}

export const useOrderHistoryStore = defineStore('orderHistory', () => {
    const API_URL = (import.meta as any).env.VITE_API_BASE_URL as string;

    const orders = ref<Order[]>([]); 
    const isLoading = ref<boolean>(false);
    const error = ref<string | null>(null);

    async function fetchUserOrders(): Promise<void> {
        const authStore = useAuthStore();
        if (!authStore.isAuthenticated) {
            error.value = "A felhasználó nincs bejelentkezve.";
            orders.value = [];
            return;
        }

        isLoading.value = true;
        error.value = null;

        try {
            const response = await axios.get(`${API_URL}/api/orders`); 
            // Itt kényszerítjük a típust, hogy a TS tudja: ez egy Order lista
            orders.value = response.data as Order[];
        } catch (err: any) {
            console.error("Hiba a rendelések lekérésekor:", err);
            error.value = "Nem sikerült betölteni a rendelési előzményeket.";
        } finally {
            isLoading.value = false;
        }
    }

    async function requestRefund(orderId: number | string): Promise<boolean> {
        if (!orderId) {
            console.error("Hiányzó rendelés azonosító.");
            return false;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            alert("A visszatérítés kéréséhez kérjük, jelentkezzen be.");
            return false;
        }

        try {
            const response = await axios.post(`${API_URL}/api/order/${orderId}/refund`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.status >= 200 && response.status < 300) {
                await fetchUserOrders(); 
                alert(response.data?.message || "Visszatérítési kérelem sikeres.");
                return true;
            }
            return false;

        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message;
            console.error("Refund hiba:", err);
            alert(`Visszatérítési hiba: ${errorMessage}`);
            return false;
        }
    }

    return {
        orders,
        isLoading,
        error,
        fetchUserOrders,
        requestRefund,
    }
});