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

<template>
    <div>
        <h3 class="text-xl font-bold text-gray-900 mb-4 border-b pb-2">{{ t('profile.data') }}</h3>

        <div v-if="userStore.error" class="text-red-600 p-3 mb-4 bg-red-50 rounded-lg">
            {{ userStore.error }}
        </div>

        <div v-if="userStore.updateSuccess" class="text-green-700 p-3 mb-4 bg-green-50 rounded-lg">
            {{ userStore.updateSuccess }}
        </div>

        <div v-if="!userStore.user" class="text-center p-6 text-gray-500">
            {{ t('common.loading') }}
        </div>

        <form v-else @submit.prevent="handleSave">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                <div v-if="!isEditing">
                    <p class="font-semibold text-gray-800">{{ t('profile.fullName') }}:</p>
                    <p>{{ formData.first_name }} {{ formData.last_name }}</p>
                </div>

                <template v-else>
                    <div>
                        <label class="font-semibold text-gray-800 block mb-1">{{ t('checkout.form.firstName') }}</label>
                        <input type="text" v-model="formData.first_name" class="w-full border rounded-lg p-2 focus:ring-sky-500 outline-none">
                    </div>
                    <div>
                        <label class="font-semibold text-gray-800 block mb-1">{{ t('checkout.form.lastName') }}</label>
                        <input type="text" v-model="formData.last_name" class="w-full border rounded-lg p-2 focus:ring-sky-500 outline-none">
                    </div>
                </template>

                <div class="mt-2">
                    <label class="font-semibold text-gray-800 block mb-1">{{ t('checkout.form.email') }}:</label>
                    <p class="break-all">{{ formData.email }}</p>
                </div>

                <div class="mt-2">
                    <label class="font-semibold text-gray-800 block mb-1">{{ t('profile.settings.phone') }}:</label>
                    <input v-if="isEditing" type="text" v-model="formData.phone"
                        class="w-full border rounded-lg p-2 focus:ring-sky-500 outline-none">
                    <p v-else>{{ formData.phone || '-' }}</p>
                </div>

                <div class="md:col-span-2 mt-4 space-y-3">
                    <p class="font-semibold text-gray-800 border-b pb-1">{{ t('checkout.form.addressTitle') }}:</p>

                    <div v-if="isEditing" class="grid grid-cols-6 gap-3">
                        <input type="text" v-model="formData.zipcode" :placeholder="t('checkout.form.zip')"
                            class="col-span-2 border rounded-lg p-2 focus:ring-sky-500 outline-none">
                        <input type="text" v-model="formData.city" :placeholder="t('checkout.form.city')"
                            class="col-span-4 border rounded-lg p-2 focus:ring-sky-500 outline-none">
                        <input type="text" v-model="formData.street" :placeholder="t('checkout.form.street')"
                            class="col-span-6 border rounded-lg p-2 focus:ring-sky-500 outline-none">
                        <input type="text" v-model="formData.house_number" :placeholder="t('checkout.form.house_number')"
                            class="col-span-3 border rounded-lg p-2 focus:ring-sky-500 outline-none">
                        <input type="text" v-model="formData.apartment" placeholder="Emelet / ajtó"
                            class="col-span-3 border rounded-lg p-2 focus:ring-sky-500 outline-none">
                    </div>
                    <p v-else>
                        {{ formData.zipcode }} {{ formData.city }}, {{ formData.street }} {{ formData.house_number }}
                        <span v-if="formData.apartment">({{ formData.apartment }})</span>
                    </p>
                </div>
            </div>

            <div class="flex justify-end space-x-3 mt-6">
                <button v-if="isEditing" type="button" @click="cancelEditing" :disabled="userStore.isUpdating"
                    class="rounded-lg bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 transition duration-200">
                    {{ t('profile.settings.cancel') }}
                </button>
                <button v-if="isEditing" type="submit" :disabled="userStore.isUpdating"
                    class="rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 shadow-md transition duration-200 disabled:bg-sky-300">
                    <font-awesome-icon v-if="userStore.isUpdating" :icon="['fas', 'spinner']" spin class="mr-2" />
                    <span v-else>{{ t('profile.settings.save') }}</span>
                </button>
                <button v-else type="button" @click="startEditing"
                    class="rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 shadow-md transition duration-200">
                    {{ t('profile.settings.edit') }}
                </button>
            </div>
        </form>
    </div>
</template>