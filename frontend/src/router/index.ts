import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Home from '@/views/Home.vue'
import { useAuthStore } from '@/stores/authStore'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/category/:categoryName',
    name: 'CategoryProducts',
    component: () => import('@/views/CategoryProducts.vue')
  },
  {
    path: '/products/:id',
    name: 'ProductDetail',
    component: () => import('@/views/ProductDetail.vue')
  },
  {
    path: '/products/new',
    name: 'NewArrivals',
    component: () => import('@/views/newArrivalsView.vue')
  },
  {
    path: '/products/discounts',
    name: 'DiscountedProducts',
    component: () => import('@/views/discountedProductsView.vue')
  },
  {
    path: '/checkout/cart',
    name: 'Cart',
    component: () => import('@/views/cartView.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/loginView.vue')
  },
  {
    path: '/email-verified',
    name: 'EmailVerified',
    component: () => import('@/views/EmailVerifiedView.vue'),
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/ForgotPassword.vue')
  },
  {
    path: '/password-reset/:token',
    name: 'PasswordReset',
    component: () => import('@/views/PasswordReset.vue'),
    props: true
  },
  {
    path: '/checkout',
    name: 'Checkout',
    component: () => import('@/views/checkoutView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/checkout/complete',
    name: 'CheckoutComplete',
    component: () => import('@/views/checkoutCompleteView.vue'),
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
    component: () => import('@/views/profileView.vue'),
    meta: { requiresAuth: true}
  },
  {
    path: '/wishlist',
    name: 'Wishlist',
    component: () => import('@/components/WishlistContent.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return { top: 0 }
  },
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (!authStore.isInitialized) {
    await authStore.checkAuth() 
  }

  if (to.name === 'CheckoutComplete') {
    next()
    return
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router