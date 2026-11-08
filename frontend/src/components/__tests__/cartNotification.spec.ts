import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import CartNotification from '@/components/CartNotification.vue'
import { useCartStore } from '@/stores/cartStore'
import { makeCartItem, makePrices } from './fixtures'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: { value: 'hu' },
  }),
  createI18n: () => ({
    global: {
      locale: 'hu',
      t: (key: string) => key,
    },
  }),
}))

vi.mock('@/i18n/i18n', () => ({
  getCurrentCurrency: () => 'huf',
  default: {},
}))

describe('CartNotification.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mountComponent = () => {
    return mount(CartNotification, {
      global: {
        stubs: {
          RouterLink: true,
        },
        mocks: {
          $n: (val: number) => val.toFixed(2),
          $t: (key: string) => {
            const translations: Record<string, string> = {
              'notification.addedToCart': 'Added to cart!',
              'notification.close': 'Close',
              'notification.quantity': 'pcs',
              'notification.continueShopping': 'Continue shopping',
              'notification.goToCart': 'View cart',
            }
            return translations[key] ?? key
          },
        },
      },
    })
  }

  it('renders nothing when showNotification is false', () => {
    const wrapper = mountComponent()
    const cartStore = useCartStore()
    cartStore.showNotification = false

    expect(wrapper.find('div').exists()).toBe(false)
  })

  it('displays product details and the line total when a recently added product exists', async () => {
    const cartStore = useCartStore()
    cartStore.lastAddedProduct = makeCartItem({
      name: 'Test Laptop',
      quantity: 2,
      image: 'image.jpg',
      description: 'Great machine',
      prices: makePrices(900, 2.7, { huf: 1000, eur: 3 }),
    })
    cartStore.showNotification = true

    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Test Laptop')
    expect(wrapper.text()).toContain('Great machine')
    expect(wrapper.text()).toContain('2 pcs')
    expect(wrapper.text()).toContain('1800.00')
    expect(wrapper.find('img').attributes('src')).toBe('image.jpg')
  })

  it('correctly handles object-based multilingual descriptions', async () => {
    const cartStore = useCartStore()
    cartStore.lastAddedProduct = makeCartItem({
      name: 'Phone',
      description: { hu: 'Hungarian description', en: 'English description' },
    })
    cartStore.showNotification = true

    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Hungarian description')
    expect(wrapper.text()).not.toContain('English description')
  })

  it('uses English when the current language is missing, then falls back to the first available description', async () => {
    const cartStore = useCartStore()
    cartStore.lastAddedProduct = makeCartItem({
      name: 'Phone',
      description: { en: 'English description', de: 'German description' },
    })
    cartStore.showNotification = true

    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('English description')
  })

  it('closes the drawer when the "Continue shopping" button is clicked', async () => {
    const cartStore = useCartStore()
    cartStore.lastAddedProduct = makeCartItem({ name: 'X' })
    cartStore.showNotification = true

    const wrapper = mountComponent()
    const continueBtn = wrapper.find('button.order-2')

    await continueBtn.trigger('click')

    expect(cartStore.showNotification).toBe(false)
  })

  it('closes the drawer when the overlay is clicked', async () => {
    const cartStore = useCartStore()
    cartStore.lastAddedProduct = makeCartItem({ name: 'X' })
    cartStore.showNotification = true

    const wrapper = mountComponent()

    await wrapper.find('.fixed').trigger('click')

    expect(cartStore.showNotification).toBe(false)
  })
})