import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import PaymentMethod from '../checkout/PaymentMethod.vue'
import { useCheckoutStore } from '@/stores/checkoutStore'

describe('PaymentMethod.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('kiválasztja a fizetési módot kattintásra', async () => {
    const pinia = createPinia()
    const store = useCheckoutStore(pinia)
    const wrapper = mount(PaymentMethod, {
      global: {
        plugins: [pinia],
        mocks: { $t: (msg: string) => msg },
        stubs: { 'font-awesome-icon': true }
      }
    })

    const stripeOption = wrapper.find('[role="radio"]')
    await stripeOption.trigger('click')

    expect(store.paymentMethod).toBe('credit_card_stripe')
  })
})