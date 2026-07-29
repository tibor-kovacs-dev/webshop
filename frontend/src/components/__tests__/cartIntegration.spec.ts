import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useCartStore } from '@/stores/cartStore'
import ProductCard from '@/components/ProductCard.vue'
import CartNotification from '@/components/CartNotification.vue'
import { createI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const i18n = createI18n({
  legacy: false,
  locale: 'hu',
  messages: {
    hu: {
      addToCart: 'Kosárba',
      ratingCount: 'értékelés',
      notification: {
        addedToCart: 'Hozzáadva a kosárhoz',
        goToCart: 'Kosárba',
        continueShopping: 'Vásárlás folytatása',
        close: 'Bezárás',
        quantity: 'db',
      },
    },
  },
  numberFormats: {
    hu: { currency: { style: 'currency', currency: 'HUF' } },
  },
})

describe('Kosár Integrációs Teszt', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mock('vue-router', () => ({
      useRouter: () => ({ push: vi.fn() }),
    }))
  })

  it('ProductCard-ra kattintva a termék bekerül a kosárba és a Notification megjelenik', async () => {
    const cartStore = useCartStore()

    const product = {
      id: 1,
      name: 'Teszt Cipő',
      price: 100,
      image: 'test.jpg',
      discount: 10,
      description: { hu: 'Kényelmes futócipő' },
      rating: { rate: 4.5, count: 10 },
    }

    const wrapper = mount(
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

    expect(cartStore.items.length).toBe(0)

    expect(wrapper.findComponent(CartNotification).find('div').exists()).toBe(false)

    
    const addButton = wrapper.find('button.bg-sky-500')
    await addButton.trigger('click')

    
    expect(cartStore.items.length).toBe(1)

    
    await wrapper.vm.$nextTick()
    const notification = wrapper.findComponent(CartNotification)

    
    expect(notification.find('div').exists()).toBe(true)
    expect(notification.text()).toContain('Hozzáadva a kosárhoz')
    expect(notification.text()).toContain('Teszt Cipő')
    expect(notification.text()).toContain('Kényelmes futócipő') 
    expect(notification.text()).toContain('1 db')
  })
})