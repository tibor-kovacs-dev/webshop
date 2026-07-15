<script setup lang="ts">
import { useUserStore } from '@/stores/userStore';
import { storeToRefs } from 'pinia';
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const userStore = useUserStore();
const { user, isLoading: isUserLoading, error: userError, isUpdating } = storeToRefs(userStore);

const isEditingProfile = ref(false);

const localProfile = ref({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    zipcode: '',
    city: '',
    street: '',
    house_number: '',
    apartment: ''
});

const syncLocalData = () => {
    if (user.value) {
        localProfile.value = {
            first_name: user.value.first_name || '',
            last_name: user.value.last_name || '',
            email: user.value.email || '',
            phone: user.value.phone || '',
            zipcode: user.value.zipcode || '',
            city: user.value.city || '',
            street: user.value.street || '',
            house_number: user.value.house_number || '',
            apartment: user.value.apartment || ''
        };
    }
};

watch(user, () => {
    syncLocalData();
}, { immediate: true });

const formattedAddress = computed(() => {
    if (!user.value?.city) return t('profile.address.not_provided');
    const u = user.value;
    return `${u.zipcode} ${u.city}, ${u.street} ${u.house_number || ''} ${u.apartment ? `(${u.apartment})` : ''}`.trim();
});

const handleSaveProfile = async () => {
    if (!user.value || isUpdating.value) return;

    const success = await userStore.updateUserData(localProfile.value);

    if (success) {
        isEditingProfile.value = false;
    }
};

const toggleEditMode = () => {
    if (isEditingProfile.value) {
        syncLocalData();
    }
    isEditingProfile.value = !isEditingProfile.value;
};
</script>

<template>
    <div class="p-5 border border-blue-200 rounded-xl shadow-sm bg-white hover:shadow-md transition duration-200">
        <h3 class="text-xl font-bold text-sky-600 mb-3 border-b pb-2">{{ t('profile.data') }}</h3>

        <div v-if="isUserLoading" class="text-center p-3 text-blue-500">
            <font-awesome-icon :icon="['fas', 'spinner']" spin class="mr-2" />
            {{ t('common.loading') }}
        </div>

        <div v-else-if="userError" class="text-red-600 p-3 bg-red-50 rounded-lg">
            {{ t('common.error_occurred') }}: {{ userError }}
        </div>

        <div v-else-if="user">
            <form @submit.prevent="handleSaveProfile">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                    
                    <div v-if="!isEditingProfile">
                        <p class="font-semibold text-gray-800">{{ t('profile.fullName') }}:</p>
                        <p>{{ user.first_name }} {{ user.last_name }}</p>
                    </div>

                    <template v-else>
                        <div>
                            <label class="font-semibold text-gray-800 block mb-1">{{ t('checkout.form.firstName') }}</label>
                            <input type="text" v-model="localProfile.first_name" class="w-full border rounded-lg p-2 focus:ring-blue-500 outline-none">
                        </div>
                        <div>
                            <label class="font-semibold text-gray-800 block mb-1">{{ t('checkout.form.lastName') }}</label>
                            <input type="text" v-model="localProfile.last_name" class="w-full border rounded-lg p-2 focus:ring-blue-500 outline-none">
                        </div>
                    </template>

                    <div class="mt-2">
                        <label class="font-semibold text-gray-800 block mb-1">{{ t('checkout.form.email') }}:</label>
                        <input v-if="isEditingProfile" type="email" v-model="localProfile.email" disabled
                            class="w-full border rounded-lg p-2 bg-gray-50 text-gray-500 cursor-not-allowed">
                        <p v-else class="break-all">{{ user.email }}</p>
                    </div>

                    <div class="mt-2">
                        <label class="font-semibold text-gray-800 block mb-1">{{ t('profile.settings.phone') }}:</label>
                        <input v-if="isEditingProfile" type="text" v-model="localProfile.phone"
                            class="w-full border rounded-lg p-2 focus:ring-blue-500 outline-none">
                        <p v-else>{{ user.phone || t('common.not_available') }}</p>
                    </div>

                    <div class="md:col-span-2 mt-4 space-y-3">
                        <p class="font-semibold text-gray-800 border-b pb-1">{{ t('checkout.summary.shippingAddress') }}:</p>

                        <div v-if="isEditingProfile" class="grid grid-cols-6 gap-3">
                            <input type="text" v-model="localProfile.zipcode" :placeholder="t('checkout.form.zip')"
                                class="col-span-2 border rounded-lg p-2 focus:ring-blue-500 outline-none">
                            <input type="text" v-model="localProfile.city" :placeholder="t('checkout.form.city')"
                                class="col-span-4 border rounded-lg p-2 focus:ring-blue-500 outline-none">
                            <input type="text" v-model="localProfile.street" :placeholder="t('checkout.form.street')"
                                class="col-span-6 border rounded-lg p-2 focus:ring-blue-500 outline-none">
                            <input type="text" v-model="localProfile.house_number" :placeholder="t('checkout.form.houseNumber')"
                                class="col-span-3 border rounded-lg p-2 focus:ring-blue-500 outline-none">
                            <input type="text" v-model="localProfile.apartment" :placeholder="t('checkout.form.apartment')"
                                class="col-span-3 border rounded-lg p-2 focus:ring-blue-500 outline-none">
                        </div>
                        <p v-else>{{ formattedAddress }}</p>
                    </div>
                </div>

                <div class="flex justify-end space-x-3 mt-6">
                    <button v-if="isEditingProfile" type="button" @click="toggleEditMode" :disabled="isUpdating"
                        class="rounded-lg bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 transition duration-200">
                        {{ t('profile.settings.cancel') }}
                    </button>
                    <button v-if="isEditingProfile" type="submit" :disabled="isUpdating"
                        class="rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 shadow-md transition duration-200 disabled:bg-sky-300">
                        <font-awesome-icon v-if="isUpdating" :icon="['fas', 'spinner']" spin class="mr-2" />
                        <span v-else>{{ t('profile.settings.save') }}</span>
                    </button>
                    <button v-else type="button" @click="toggleEditMode"
                        class="rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 shadow-md transition duration-200">
                        {{ t('profile.settings.edit') }}
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>