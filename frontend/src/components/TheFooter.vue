<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { faCreditCard, faTruck } from '@fortawesome/free-regular-svg-icons';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import QuotesSlideshow from './QuotesSlideshow.vue';
import { library } from '@fortawesome/fontawesome-svg-core';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
library.add(faTruck, faArrowLeft, faCreditCard);

const firstName = ref('');
const lastName = ref('');
const email = ref('');
const isSubscribed = ref(false);

function send(): void {
    if (!firstName.value || !lastName.value || !email.value) return;

    isSubscribed.value = true;
    firstName.value = '';
    lastName.value = '';
    email.value = '';

    setTimeout(() => {
        isSubscribed.value = false;
    }, 5000);
}

const thisYear = new Date().getFullYear();
</script>

<template>
    <footer>
        <div class="my-5 p-5 text-xl font-light flex justify-evenly max-sm:flex-col gap-5 bg-gray-300">
            <p><font-awesome-icon :icon="faTruck" class="pr-3" />{{ t('shipping') }}</p>
            <p><font-awesome-icon :icon="faCreditCard" class="pr-3" />{{ t('payWithCard') }}</p>
            <p><font-awesome-icon :icon="faArrowLeft" class="pr-3" />{{ t('return') }}</p>
        </div>

        <div class="mb-5 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
            <div class="w-full px-5 flex justify-center py-8 bg-gradient-to-r from-sky-500 to-indigo-500 text-white">
                <form class="max-w-lg w-full" @submit.prevent="send">
                    <h2 class="text-2xl mb-2">{{ t('dontMiss') }}</h2>
                    <p class="font-bold mb-4">{{ t('subscribe') }}</p>

                    <Transition name="fade">
                        <div v-if="isSubscribed"
                            class="mb-4 p-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg shadow-md">
                            {{ t('newsletterSuccessMessage') }}
                        </div>
                    </Transition>

                    <div class="mb-2 flex flex-wrap gap-2">
                        <input v-model="firstName"
                            class="flex-1 px-3 py-2 border-none rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-sky-300 outline-none"
                            type="text" :placeholder="t('firstName')" required />
                        <input v-model="lastName"
                            class="flex-1 px-3 py-2 border-none rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-sky-300 outline-none"
                            type="text" :placeholder="t('lastName')" required />
                    </div>

                    <div class="mb-4">
                        <input v-model="email"
                            class="w-full px-3 py-2 border-none rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-sky-300 outline-none"
                            type="email" :placeholder="t('email')" required />
                    </div>

                    <button
                        class="bg-sky-900 hover:bg-sky-950 text-white font-semibold rounded-xl px-8 py-3 cursor-pointer transition duration-300 shadow-lg active:scale-95">
                        {{ t('subscribeButton') }}
                    </button>
                </form>
            </div>

            <div class="hidden lg:block">
                <img class="h-72 w-full object-cover" src="/images/newsletter.webp" alt="Newsletter" loading="lazy" />
            </div>
        </div>

        <QuotesSlideshow />

        <div class="flex justify-evenly max-sm:flex-col gap-10 leading-7 bg-gray-50 p-10 text-gray-700">
            <div class="flex flex-col">
                <h3 class="font-bold text-gray-900 mb-3 text-lg">Demo Webshop</h3>
                <ul class="space-y-1">
                    <li>1234 New York, NY 10001, United States</li>
                    <li><a href="mailto:hello@demowebshop.com" class="hover:text-sky-600 transition">hello@demowebshop.com</a></li>
                    <li><a href="tel:+12125550123" class="hover:text-sky-600 transition">+1 (212) 555-0123</a></li>
                    <li>{{ t('customerService') }}: 9:00 - 17:00</li>
                </ul>
            </div>

            <div class="flex flex-col">
                <h3 class="font-bold text-gray-900 mb-3 text-lg">{{ t('info') }}</h3>
                <ul class="space-y-1">
                    <li>
                        <RouterLink to="/contact" class="hover:text-sky-600 transition">{{ t('contact') }}</RouterLink>
                    </li>
                    <li>
                        <RouterLink to="/terms" class="hover:text-sky-600 transition">{{ t('terms') }}</RouterLink>
                    </li>
                    <li>
                        <RouterLink to="/privacy" class="hover:text-sky-600 transition">{{ t('dataProcessingInfo') }}</RouterLink>
                    </li>
                    <li>
                        <RouterLink to="/shipping" class="hover:text-sky-600 transition">{{ t('shippingInfo') }}</RouterLink>
                    </li>
                    <li>
                        <RouterLink to="/withdrawal" class="hover:text-sky-600 transition">{{ t('withdrawal') }}</RouterLink>
                    </li>
                </ul>
            </div>

            <div class="flex flex-col">
                <h3 class="font-bold text-gray-900 mb-3 text-lg">{{ t('brands') }}</h3>
                <ul class="space-y-1 italic text-gray-500">
                    <li>TechNova</li>
                    <li>UrbanStyle</li>
                    <li>GreenHome</li>
                    <li>EliteWear</li>
                    <li>SmartGear</li>
                </ul>
            </div>
        </div>

        <div class="flex justify-center py-6 border-t border-gray-100 bg-gray-50 text-gray-400 text-sm">
            &copy; {{ thisYear }} Demo Webshop • Portfolio Project
        </div>
    </footer>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>