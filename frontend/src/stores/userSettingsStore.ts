import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from '@/stores/authStore';

export type AppTheme = 'system' | 'dark' | 'light';

export interface UserPreferences {
  notificationsEnabled: boolean;
  appTheme: AppTheme;
}

export const useUserSettingsStore = defineStore('settings', () => {
  const preferences = ref<UserPreferences>({
    notificationsEnabled: true,
    appTheme: 'system',
  });
  
  const isLoading = ref<boolean>(false);
  const successMessage = ref<string>('');
  const errorMessage = ref<string>('');
  
  const authStore = useAuthStore(); 

  const loadPreferences = async (): Promise<void> => {
    if (!preferences.value.appTheme) {
      preferences.value = {
        notificationsEnabled: true,
        appTheme: 'system',
      };
    }
  };
  
  const savePreferences = async (newPrefs: UserPreferences): Promise<void> => {
    isLoading.value = true;
    errorMessage.value = '';
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); 
      preferences.value = newPrefs;
      successMessage.value = 'A beállítások sikeresen elmentve.';
      
      setTimeout(() => {
        successMessage.value = '';
      }, 3000);
      
    } catch (error) {
      errorMessage.value = 'Hiba történt a beállítások mentésekor.';
    } finally {
      isLoading.value = false;
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    errorMessage.value = '';
    authStore.passwordChangeError = null;
    authStore.isChangingPassword = true;

    try {
      const success = await (authStore as any).changePassword(oldPassword, newPassword);
      
      if (!success) {
        return false;
      } else {
        successMessage.value = 'Jelszó sikeresen megváltoztatva!';
        setTimeout(() => { successMessage.value = ''; }, 3000);
        return true;
      }
    } catch (err: any) {
        authStore.passwordChangeError = err.response?.data?.message || 'Sikertelen jelszócsere.';
        return false;
    } finally {
        authStore.isChangingPassword = false;
    }
  };

  return { 
    preferences, 
    isLoading, 
    successMessage, 
    errorMessage, 
    loadPreferences, 
    savePreferences,
    changePassword
  };
});