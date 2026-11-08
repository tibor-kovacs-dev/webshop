import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import { useAuthStore } from '@/stores/authStore';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: HomeView
  },
  {
    path: '/category/:categoryName',
    name: 'CategoryProducts',
    component: () => import('@/views/CategoryProductsView.vue')
  },
  {
    path: '/products/new',
    name: 'NewArrivals',
    component: () => import('@/views/NewArrivalsView.vue')
  },
  {
    path: '/products/discounts',
    name: 'DiscountedProducts',
    component: () => import('@/views/DiscountedProductsView.vue')
  },
  {
    path: '/checkout/cart',
    name: 'Cart',
    component: () => import('@/views/CartView.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue')
  },
  {
    path: '/email-verified',
    name: 'EmailVerified',
    component: () => import('@/views/EmailVerifiedView.vue')
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/ForgotPasswordView.vue')
  },
  {
    path: '/password-reset/:token',
    name: 'PasswordReset',
    component: () => import('@/views/PasswordResetView.vue'),
    props: true
  },
  {
    path: '/checkout',
    name: 'Checkout',
    component: () => import('@/views/CheckoutView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/checkout/complete',
    name: 'CheckoutComplete',
    component: () => import('@/views/CheckoutCompleteView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/payment/retry/:orderId',
    name: 'PaymentRetry',
    component: () => import('@/views/RetryPaymentView.vue'),
    props: true,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/wishlist',
    name: 'Wishlist',
    component: () => import('@/components/WishlistContent.vue')
  },
  {
    path: '/:categorySlug/:productSlug',
    name: 'ProductDetail',
    component: () => import('@/views/ProductDetailView.vue')
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return { top: 0 };
  }
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  if (!authStore.isInitialized) {
    await authStore.checkAuth();
  }

  if (to.name === 'CheckoutComplete') {
    next();
    return;
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
  } else {
    next();
  }
});

export default router;