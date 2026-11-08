import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useCartStore } from '@/stores/cartStore'
import ProductCard from '@/components/ProductCard.vue'
import CartNotification from '@/components/CartNotification.vue'
import { makeProduct, makePrices } from './fixtures'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/i18n/i18n', () => ({
  getCurrentCurrency: () => 'huf',
  default: {},
}))

const i18n = createI18n({
  legacy: false,
  locale: 'hu',
  messages: {
    hu: {
      addToCart: 'Add to cart',
      ratingCount: 'reviews',
      notification: {
        addedToCart: 'Added to cart',
        goToCart: 'View cart',
        continueShopping: 'Continue shopping',
        close: 'Close',
        quantity: 'pcs',
      },
    },
  },
  numberFormats: {
    hu: { currency: { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 } },
  },
})

describe('Cart Integration Test', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mountShop = (product: ReturnType<typeof makeProduct>) =>
    mount(
      {
        template: `
        <div>
          <ProductCard :product="product" />
          <CartNotification />
        </div>
      `,
        components: { ProductCard, CartNotification },
        setup() {
          return { product }
        },
      },
      {
        global: {
          plugins: [i18n],
          components: { 'font-awesome-icon': FontAwesomeIcon },
          stubs: { RouterLink: true },
        },
      },
    )

  it('clicking ProductCard adds the product to the cart and displays the notification', async () => {
    const cartStore = useCartStore()

    const wrapper = mountShop(
      makeProduct({
        id: 1,
        slug: 'test-shoes',
        name: 'Test Shoes',
        discount: 10,
        description: { hu: 'Comfortable running shoes' },
        rating: { rate: 4.5, count: 10 },
        prices: makePrices(29520, 82, { huf: 32800, eur: 91 }),
      }),
    )

    expect(cartStore.items).toHaveLength(0)
    expect(wrapper.findComponent(CartNotification).find('div').exists()).toBe(false)

    await wrapper.find('button.bg-sky-500').trigger('click')

    expect(cartStore.items).toHaveLength(1)

    await wrapper.vm.$nextTick()
    const notification = wrapper.findComponent(CartNotification)

    expect(notification.find('div').exists()).toBe(true)
    expect(notification.text()).toContain('Added to cart')
    expect(notification.text()).toContain('Test Shoes')
    expect(notification.text()).toContain('Comfortable running shoes')
    expect(notification.text()).toContain('1 pcs')
  })

  it('the card and notification display the same server-side price', async () => {
    const wrapper = mountShop(
      makeProduct({
        id: 2,
        slug: 'another-pair-of-shoes',
        name: 'Another Pair of Shoes',
        description: { hu: 'Product description' },
        prices: makePrices(29520, 82, { huf: 32800, eur: 91 }),
      }),
    )

    const digits = (text: string) => text.replace(/[^0-9]/g, '')

    expect(digits(wrapper.findComponent(ProductCard).text())).toContain('29520')

    await wrapper.find('button.bg-sky-500').trigger('click')
    await wrapper.vm.$nextTick()

    expect(digits(wrapper.findComponent(CartNotification).text())).toContain('29520')
  })
})