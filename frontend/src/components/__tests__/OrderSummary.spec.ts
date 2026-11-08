import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import OrderSummary from '../checkout/OrderSummary.vue'
import { useCartStore } from '@/stores/cartStore'
import { useCheckoutStore } from '@/stores/checkoutStore'
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

vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

describe('OrderSummary.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mountSummary = () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const cartStore = useCartStore(pinia)
    const checkoutStore = useCheckoutStore(pinia)

    const wrapper = () =>
      mount(OrderSummary, {
        global: {
          plugins: [pinia],
          mocks: {
            $t: (msg: string) => msg,
            $n: (val: number) => val.toFixed(2),
          },
          stubs: { 'font-awesome-icon': true },
        },
      })

    return { cartStore, checkoutStore, mountSummary: wrapper }
  }

  it('calculates line totals and the grand total from server-side unit prices', async () => {
    const { cartStore, mountSummary: mountIt } = mountSummary()

    cartStore.items = [
      makeCartItem({ id: 1, name: 'Test Product', quantity: 2, prices: makePrices(900, 2.7, { huf: 1000, eur: 3 }) }),
      makeCartItem({ id: 2, name: 'Another Product', quantity: 1, prices: makePrices(250, 0.7) }),
    ]

    const wrapper = mountIt()
    await wrapper.vm.$nextTick()

    const output = wrapper.text()

    expect(output).toContain('Test Product')
    expect(output).toContain('Another Product')
    expect(output).toContain('1800.00')
    expect(output).toContain('250.00')
    expect(output).toContain('2050.00')
  })

  it('displays the shipping address and payment method', async () => {
    const { checkoutStore, mountSummary: mountIt } = mountSummary()

    Object.assign(checkoutStore.shippingDetails, {
      first_name: 'Anna',
      last_name: 'Smith',
      email: 'anna@example.com',
      zipcode: '1051',
      city: 'Budapest',
      street: 'Main Street',
      house_number: '12',
    })
    checkoutStore.paymentMethod = 'credit_card_stripe'

    const wrapper = mountIt()
    await wrapper.vm.$nextTick()

    const output = wrapper.text()

    expect(output).toContain('Anna Smith')
    expect(output).toContain('anna@example.com')
    expect(output).toContain('1051 Budapest')
    expect(output).toContain('Main Street 12')
    expect(output).toContain('checkout.payment.credit_card_stripe')
  })

  it('the edit buttons navigate back to the correct step', async () => {
    const { checkoutStore, mountSummary: mountIt } = mountSummary()
    checkoutStore.currentStep = 3

    const wrapper = mountIt()
    const buttons = wrapper.findAll('button')

    await buttons[0]!.trigger('click')
    expect(checkoutStore.currentStep).toBe(1)

    checkoutStore.currentStep = 3
    await buttons[1]!.trigger('click')
    expect(checkoutStore.currentStep).toBe(2)
  })
})