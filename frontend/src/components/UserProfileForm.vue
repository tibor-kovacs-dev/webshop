<script setup lang="ts">
import { useUserStore } from '@/stores/userStore';
import { ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

interface UserFormData {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    zipcode: string;
    city: string;
    street: string;
    house_number: string;
    apartment: string;
}

const userStore = useUserStore();
const { t } = useI18n();

const formData = ref<UserFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    zipcode: '',
    city: '',
    street: '',
    house_number: '',
    apartment: '',
});

const isEditing = ref<boolean>(false);

const syncFormData = (): void => {
    if (userStore.user) {
        formData.value = {
            first_name: userStore.user.first_name || '',
            last_name: userStore.user.last_name || '',
            email: userStore.user.email || '',
            phone: userStore.user.phone || '',
            zipcode: userStore.user.zipcode || '',
            city: userStore.user.city || '',
            street: userStore.user.street || '',
            house_number: userStore.user.house_number || '',
            apartment: userStore.user.apartment || '',
        };
    }
};

onMounted(() => {
    if (userStore.user === null && !userStore.isLoading) {
        userStore.getUserData();
    }
    syncFormData();
});

watch(() => userStore.user, () => {
    syncFormData();
    isEditing.value = false;
});

const startEditing = (): void => {
    isEditing.value = true;
};

const cancelEditing = (): void => {
    syncFormData();
    isEditing.value = false;
};

const handleSave = async (): Promise<void> => {
    const success = await userStore.updateUserData(formData.value);
    if (success) {
        isEditing.value = false;
    } else {
        isEditing.value = true;
    }
};
</script>