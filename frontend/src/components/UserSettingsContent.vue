<script setup lang="ts">
import { useUserSettingsStore, type UserPreferences, type AppTheme } from '@/stores/userSettingsStore'; // Importált típusok
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { storeToRefs } from 'pinia';
import { ref, watchEffect, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import UserProfileSection from './UserProfileSection.vue';

const { t } = useI18n();
const userSettingsStore = useUserSettingsStore();
const authStore = useAuthStore();
const userStore = useUserStore();

const { preferences, successMessage, errorMessage } = storeToRefs(userSettingsStore);
const { isChangingPassword, passwordChangeError } = storeToRefs(authStore);
const { updateSuccess } = storeToRefs(userStore);

const localPreferences = ref<UserPreferences>({
    notificationsEnabled: false,
    appTheme: 'system'
});

const isPasswordModalOpen = ref(false);
const passwordForm = ref({ oldPassword: '', newPassword: '', newPasswordConfirm: '' });

watchEffect(() => {
    if (preferences.value) {
        localPreferences.value = {
            notificationsEnabled: preferences.value.notificationsEnabled ?? false,
            appTheme: preferences.value.appTheme || 'system'
        };
    }
});

onMounted(async () => {
    if (authStore.isAuthenticated) {
        await userSettingsStore.loadPreferences();
    }
});

const handlePasswordChange = async () => {
    passwordChangeError.value = null;
    if (passwordForm.value.newPassword !== passwordForm.value.newPasswordConfirm) {
        passwordChangeError.value = 'Az új jelszavak nem egyeznek.';
        return;
    }
    const success = await userSettingsStore.changePassword(
        passwordForm.value.oldPassword,
        passwordForm.value.newPassword
    );
    if (success) {
        isPasswordModalOpen.value = false;
        passwordForm.value = { oldPassword: '', newPassword: '', newPasswordConfirm: '' };
    }
};

const handleSavePreferences = () => {
    userSettingsStore.savePreferences(localPreferences.value);
};

const isPasswordFormValid = computed(() => (
    passwordForm.value.oldPassword.length > 0 &&
    passwordForm.value.newPassword.length >= 6 &&
    passwordForm.value.newPassword === passwordForm.value.newPasswordConfirm
));
</script>

<template>
</template>