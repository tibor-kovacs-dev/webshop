<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import StarRating from '@/components/StarRating.vue';
import { useAuthStore } from '@/stores/authStore'; 
import { useI18n } from 'vue-i18n';

interface CommentUser {
    name?: string;
}

interface Comment {
    id: number;
    rating: number;
    comment_text: string;
    created_at: string;
    user?: CommentUser;
}

const props = defineProps<{
    productId: string | number
}>();

const { t } = useI18n();
const authStore = useAuthStore(); 

const comments = ref<Comment[]>([]);
const newCommentText = ref<string>('');
const newCommentRating = ref<number>(0);
const isSubmitting = ref<boolean>(false);
const error = ref<string | null>(null);

const isAuthenticated = computed(() => authStore.isAuthenticated); 

const fetchComments = async (): Promise<void> => {
    try {
        const response = await axios.get(`/api/products/${props.productId}/comments`);
        comments.value = response.data;
    } catch (err) {
        console.error("Hiba a kommentek lekérésekor:", err);
        error.value = t('comments.fetchError');
    }
};

const submitComment = async (): Promise<void> => {
    if (!newCommentText.value || newCommentRating.value === 0) {
        error.value = t('comments.missingFields');
        return;
    }
    
    isSubmitting.value = true;
    error.value = null;

    try {
        // Ha be van jelentkezve, küldjük a tokent a kérésben
        const config = authStore.token ? {
            headers: { Authorization: `Bearer ${authStore.token}` }
        } : {};

        const response = await axios.post(
            `/api/products/${props.productId}/comments`,
            {
                rating: newCommentRating.value,
                comment_text: newCommentText.value,
            },
            config
        );

        comments.value.unshift(response.data);
        newCommentText.value = '';
        newCommentRating.value = 0;

    } catch (err: any) {
        console.error("Hiba a komment küldésekor:", err);
        error.value = err.response?.data?.message || t('comments.submitError');
    } finally {
        isSubmitting.value = false;
    }
};

onMounted(fetchComments);

const reviewPlaceholder = computed<string>(() => {
    let placeholder = t('comments.commentPlaceholder');
    if (newCommentRating.value > 0) {
        placeholder += ` (${newCommentRating.value} ${t('comments.star')})`;
    }
    return placeholder;
});
</script>

<template>
    <div class="mt-16 border-t pt-8">
        <h2 class="text-3xl font-bold mb-8 text-gray-900">
            {{ $t('comments.reviewTitle') }} ({{ comments.length }})
        </h2>
        
        <div v-if="isAuthenticated" class="mb-10 p-6 bg-gray-50 rounded-xl shadow-sm border border-gray-100">
            <h3 class="text-xl font-semibold mb-4 text-gray-800">{{ $t('comments.writeComment') }}</h3>
            
            <div class="flex items-center mb-4">
                <span class="mr-3 text-gray-700 font-medium">{{ $t('comments.rating') }}:</span>
                <div class="flex gap-1">
                    <font-awesome-icon 
                        v-for="i in 5" 
                        :key="i"
                        :icon="['fas', 'star']" 
                        class="h-5 w-5 transition-colors duration-150 cursor-pointer"
                        :class="i <= newCommentRating ? 'text-yellow-400' : 'text-gray-300'"
                        @click="newCommentRating = i"
                    />
                </div>
            </div>

            <textarea 
                v-model="newCommentText"
                rows="4" 
                :placeholder="reviewPlaceholder"
                class="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
            ></textarea>

            <p v-if="error" class="text-red-500 text-sm mt-2 font-medium">{{ error }}</p>

            <button 
                @click="submitComment"
                :disabled="isSubmitting || !newCommentText || newCommentRating === 0"
                class="mt-4 px-8 py-3 bg-sky-500 text-white font-bold rounded-lg hover:bg-sky-600 transition-colors disabled:bg-sky-200 disabled:cursor-not-allowed shadow-md shadow-sky-100"
            >
                <template v-if="isSubmitting">
                    <span class="flex items-center">
                        {{ $t('comments.submitting') }}
                    </span>
                </template>
                <template v-else>
                    {{ $t('comments.submit') }}
                </template>
            </button>
        </div>
        
        <div v-else class="mb-10 p-5 rounded-lg border border-sky-100 bg-sky-50">
            <p class="text-sky-800 flex items-center">
                <font-awesome-icon :icon="['fas', 'circle-info']" class="mr-2" />
                {{ $t('comments.loginRequired') }}
                <RouterLink to="/login" class="ml-1 font-bold underline hover:text-sky-900">
                    {{ $t('login') }}
                </RouterLink>!
            </p>
        </div>

        <div v-if="comments.length > 0" class="space-y-6">
            <div v-for="comment in comments" :key="comment.id" class="border-b border-gray-100 pb-8 last:border-0">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex flex-col">
                        <p class="font-bold text-gray-900 text-lg">
                            {{ comment.user?.name || $t('comments.anonymous') }}
                        </p>
                        <StarRating :rating="comment.rating" />
                    </div>
                    <p class="text-sm text-gray-400 italic">
                        {{ comment.created_at 
                           ? new Date(comment.created_at).toLocaleDateString($i18n.locale)
                           : $t('comments.noDate')
                        }}
                    </p>
                </div>
                <p class="text-gray-700 leading-relaxed text-left bg-white p-3 rounded-lg border border-gray-50">
                    {{ comment.comment_text }}
                </p>
            </div>
        </div>

        <div v-else class="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-100">
            <font-awesome-icon :icon="['far', 'comments']" class="text-4xl text-gray-200 mb-3" />
            <p class="text-gray-400 italic">{{ $t('comments.noReviews') }}</p>
        </div>
    </div>
</template>