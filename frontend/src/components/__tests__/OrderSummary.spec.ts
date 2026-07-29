import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import OrderSummary from '../checkout/OrderSummary.vue'
import { useCartStore } from '@/stores/cartStore'

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

// A usePrice a valódi i18n singleton-ból olvassa ki a pénznemet (böngésző
// nyelve alapján), ami kiszámíthatatlanná tenné az átváltott összegeket a
// tesztben. Ezért stuboljuk, hogy az összegek változatlanul menjenek át.
vi.mock('@/composables/usePrice', () => ({
  usePrice: () => ({
    convertPrice: (price: number) => price
  })
}))

describe('OrderSummary.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const globalConfig = (pinia: any) => ({
    global: {
      plugins: [pinia],
      mocks: {
        $t: (msg: string) => msg,
        $n: (val: number) => val.toFixed(2)
      },
      stubs: { 'font-awesome-icon': true }
    }
  })

  it('helyesen jeleníti meg a termékeket és a végösszeget', async () => {
    const pinia = createPinia()
    const cartStore = useCartStore(pinia)
    
    cartStore.items = [
      { 
        id: 1, 
        name: 'Teszt Termék', 
        price: 100, 
        quantity: 2, 
        discount: 0, 
        image: '', 
        category: 'cat', 
        description: 'desc' 
      }
    ]

    const wrapper = mount(OrderSummary, globalConfig(pinia))
    await wrapper.vm.$nextTick()

    const output = wrapper.text()
    expect(output).toContain('Teszt Termék')
    expect(output).toContain('200.00')
  })
})