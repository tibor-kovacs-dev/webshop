import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import CartNotification from '@/components/CartNotification.vue'
import { useCartStore } from '@/stores/cartStore'

// i18n és RouterLink mockolása
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: { value: 'hu' }
  }),
  createI18n: () => ({
    global: {
      locale: 'hu',
      t: (key: string) => key
    }
  })
}))

describe('CartNotification.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mountComponent = () => {
    return mount(CartNotification, {
      global: {
        stubs: {
          RouterLink: true 
        },
        mocks: {
          $t: (key: string) => {
            const translations: Record<string, string> = {
              'notification.addedToCart': 'Kosárba téve!',
              'notification.close': 'Bezárás',
              'notification.quantity': 'db',
              'notification.continueShopping': 'Vásárlás folytatása',
              'notification.goToCart': 'Kosár megtekintése',
            }
            return translations[key] ?? key
          }
        }
      }
    })
  }

  it('nem renderel semmit, ha a showNotification false', () => {
    const wrapper = mountComponent()
    const cartStore = useCartStore()
    cartStore.showNotification = false
    
    expect(wrapper.find('div').exists()).toBe(false)
  })

  it('megjeleníti a termék adatait, ha van utoljára hozzáadott termék', async () => {
    const cartStore = useCartStore()
    cartStore.lastAddedProduct = {
      id: 1,
      name: 'Teszt Laptop',
      price: 100,
      quantity: 2,
      image: 'image.jpg',
      description: 'Szuper gép'
    } as any
    cartStore.showNotification = true
    
    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Teszt Laptop')
    expect(wrapper.text()).toContain('2 db')
    expect(wrapper.find('img').attributes('src')).toBe('image.jpg')
  })

  it('helyesen kezeli az objektum alapú többnyelvű leírást', async () => {
    const cartStore = useCartStore()
    cartStore.lastAddedProduct = {
      id: 1,
      name: 'Telefon',
      description: { hu: 'Magyar leírás', en: 'English desc' }
    } as any
    cartStore.showNotification = true
    
    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Magyar leírás')
  })

  it('bezárja a tálcát a "Vásárlás folytatása" gombra kattintva', async () => {
    const cartStore = useCartStore()
    cartStore.lastAddedProduct = { id: 1, name: 'X' } as any
    cartStore.showNotification = true
    
    const wrapper = mountComponent()
    const continueBtn = wrapper.find('button.order-2')
    
    await continueBtn.trigger('click')
    
    expect(cartStore.showNotification).toBe(false)
  })

  it('bezárja a tálcát, ha a háttérre (overlay) kattintunk', async () => {
    const cartStore = useCartStore()
    cartStore.lastAddedProduct = { id: 1, name: 'X' } as any
    cartStore.showNotification = true
    
    const wrapper = mountComponent()
    
    await wrapper.find('.fixed').trigger('click')
    
    expect(cartStore.showNotification).toBe(false)
  })
})