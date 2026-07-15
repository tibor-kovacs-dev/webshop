import axios from 'axios';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore, type User } from './authStore';

export const useUserStore = defineStore('user', () => {
    const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL as string;

    const user = ref<User | null>(null);
    const isLoading = ref<boolean>(false);
    const isUpdating = ref<boolean>(false); 
    const error = ref<string | null>(null);
    const updateSuccess = ref<string | null>(null);

    const getUserData = async (): Promise<void> => {
        const authStore = useAuthStore();
        const token = authStore.token || (authStore.user as any)?.token;

        if (!token) {
            error.value = 'A felhasználó nincs bejelentkezve';
            return;
        }

        isLoading.value = true;
        error.value = null;

        try {
            const response = await axios.get(`${API_BASE_URL}/api/users/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });
            user.value = response.data.user as User;
        } catch (err: any) {
            error.value = 'A profil adatok betöltése sikertelen';
            if (err.response?.status === 401) {
                authStore.logout();
            }
        } finally {
            isLoading.value = false;
        }
    };
    
    const updateUserData = async (updatedData: Partial<User>): Promise<boolean> => {
        const authStore = useAuthStore();
        const token = authStore.token || (authStore.user as any)?.token;

        if (!token) {
            error.value = 'A felhasználó nincs bejelentkezve frissítéshez';
            return false;
        }

        isUpdating.value = true;
        error.value = null;
        updateSuccess.value = null;

        try {
            const response = await axios.patch(`${API_BASE_URL}/api/users/profile`, updatedData, {
                headers: {
                    Authorization: `Bearer ${token}`, 
                }
            });
            
            user.value = response.data.user as User;
            updateSuccess.value = response.data.message || 'A profil adatok sikeresen frissültek!';
            return true;
        } catch (err: any) {
            if (err.response && err.response.status === 422) {
                error.value = 'Hibás adatok. Kérjük ellenőrizze az űrlapot.';
            } else {
                error.value = err.response?.data?.message || 'Ismeretlen hiba történt a mentés során';
            }
            return false;
        } finally {
            isUpdating.value = false;
        }
    };

    return { 
        user, 
        isLoading, 
        isUpdating,
        error, 
        updateSuccess,
        getUserData, 
        updateUserData 
    };
});