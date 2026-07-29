<script setup lang="ts">
import { useCheckoutStore } from '@/stores/checkoutStore';
import { useUserStore } from '@/stores/userStore';
import { onMounted, watchEffect } from 'vue';

const checkoutStore = useCheckoutStore();
const userStore = useUserStore();

const validateRequired = (value: string | undefined | null): boolean => {
  return !!(value && value.trim().length > 0);
};

const validateEmail = (email: string | undefined | null): boolean => {
  if (!email || email.trim().length === 0) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const preFillShippingData = (): void => {
  const user = userStore.user;
  const details = checkoutStore.shippingDetails;

  if (user && user.email && (!details.first_name || details.first_name.length === 0)) {
    if (typeof user.name === 'object' && user.name !== null) {
      details.first_name = (user.name as any).firstname || '';
      details.last_name = (user.name as any).lastname || '';
    } else if (typeof user.name === 'string') {
      const parts = user.name.split(' ');
      details.first_name = parts[0] || '';
      details.last_name = parts.slice(1).join(' ') || '';
    }

    details.email = user.email;

    if (user.zipcode || user.city || user.street || user.house_number) {
      details.zipcode = user.zipcode || '';
      details.city = user.city || '';
      details.street = user.street || '';
      details.house_number = user.house_number || '';
    }

    console.log('Szállítási adatok automatikusan kitöltve.');
  }
};

watchEffect(() => {
  preFillShippingData();
});

onMounted(async () => {
  if (!userStore.user && !userStore.isLoading) {
    await userStore.getUserData();
  }
});
</script>

<template>
  <div>
    <h2 id="shipping-form-title" class="text-2xl font-bold text-gray-900 mb-8">
      {{ $t('checkout.step1.formTitle') }}
    </h2>

    <form class="space-y-8" aria-labelledby="shipping-form-title" novalidate @submit.prevent>
      <fieldset class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <legend class="sr-only">Személyes adatok</legend>

        <div class="relative">
          <input
            id="firstName"
            type="text"
            v-model="checkoutStore.shippingDetails.first_name"
            :aria-invalid="!validateRequired(checkoutStore.shippingDetails.first_name)"
            class="peer block w-full px-4 py-4 text-gray-900 bg-transparent border border-gray-300 rounded-xl focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition-all duration-200 placeholder-transparent focus:outline-none"
            placeholder=" "
            required
          />
          <label for="firstName" class="absolute left-4 -top-2.5 px-2 bg-white text-sm font-medium text-gray-600 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-sky-600">
            {{ $t('checkout.form.firstName') }} <span class="text-red-500">*</span>
          </label>
          <p v-if="!validateRequired(checkoutStore.shippingDetails.first_name)" class="text-red-600 text-sm mt-2" role="alert">
            {{ $t('common.required_field') }}
          </p>
        </div>

        <div class="relative">
          <input
            id="lastName"
            type="text"
            v-model="checkoutStore.shippingDetails.last_name"
            :aria-invalid="!validateRequired(checkoutStore.shippingDetails.last_name)"
            class="peer block w-full px-4 py-4 text-gray-900 bg-transparent border border-gray-300 rounded-xl focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition-all duration-200 placeholder-transparent focus:outline-none"
            placeholder=" "
            required
          />
          <label for="lastName" class="absolute left-4 -top-2.5 px-2 bg-white text-sm font-medium text-gray-600 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-sky-600">
            {{ $t('checkout.form.lastName') }} <span class="text-red-500">*</span>
          </label>
          <p v-if="!validateRequired(checkoutStore.shippingDetails.last_name)" class="text-red-600 text-sm mt-2" role="alert">
            {{ $t('common.required_field') }}
          </p>
        </div>
      </fieldset>

      <div class="relative">
        <input
          id="email"
          type="email"
          v-model="checkoutStore.shippingDetails.email"
          :aria-invalid="!validateEmail(checkoutStore.shippingDetails.email)"
          class="peer block w-full px-4 py-4 text-gray-900 bg-transparent border border-gray-300 rounded-xl focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition-all duration-200 placeholder-transparent focus:outline-none"
          placeholder=" "
          required
        />
        <label for="email" class="absolute left-4 -top-2.5 px-2 bg-white text-sm font-medium text-gray-600 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-sky-600">
          {{ $t('checkout.form.email') }} <span class="text-red-500">*</span>
        </label>
        <p v-if="!validateEmail(checkoutStore.shippingDetails.email)" class="text-red-600 text-sm mt-2" role="alert">
          {{ $t('common.invalid_email') }}
        </p>
      </div>

      <h3 class="text-xl font-semibold text-gray-900 mt-10 mb-6">{{ $t('checkout.form.addressTitle') }}</h3>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="relative">
          <input id="zipcode" v-model="checkoutStore.shippingDetails.zipcode" class="peer block w-full px-4 py-4 border border-gray-300 rounded-xl focus:border-sky-500 focus:outline-none placeholder-transparent" placeholder=" " />
          <label for="zipcode" class="absolute left-4 -top-2.5 px-2 bg-white text-sm text-gray-600">{{ $t('checkout.form.zip') }} *</label>
        </div>
        <div class="relative md:col-span-2">
          <input id="city" v-model="checkoutStore.shippingDetails.city" class="peer block w-full px-4 py-4 border border-gray-300 rounded-xl focus:border-sky-500 focus:outline-none placeholder-transparent" placeholder=" " />
          <label for="city" class="absolute left-4 -top-2.5 px-2 bg-white text-sm text-gray-600">{{ $t('checkout.form.city') }} *</label>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="relative md:col-span-2">
          <input id="street" v-model="checkoutStore.shippingDetails.street" class="peer block w-full px-4 py-4 border border-gray-300 rounded-xl focus:border-sky-500 focus:outline-none placeholder-transparent" placeholder=" " />
          <label for="street" class="absolute left-4 -top-2.5 px-2 bg-white text-sm text-gray-600">{{ $t('checkout.form.street') }} *</label>
        </div>
        <div class="relative">
          <input id="house_number" v-model="checkoutStore.shippingDetails.house_number" class="peer block w-full px-4 py-4 border border-gray-300 rounded-xl focus:border-sky-500 focus:outline-none placeholder-transparent" placeholder=" " />
          <label for="house_number" class="absolute left-4 -top-2.5 px-2 bg-white text-sm text-gray-600">{{ $t('checkout.shippingDetails.house_number') }} *</label>
        </div>
      </div>
    </form>
  </div>
</template>