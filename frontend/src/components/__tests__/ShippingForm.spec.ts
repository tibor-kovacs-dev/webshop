import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import ShippingForm from '../checkout/ShippingForm.vue'
import { useCheckoutStore } from '@/stores/checkoutStore'
import { useUserStore } from '@/stores/userStore'

describe('ShippingForm.vue', () => {
  const createGlobalConfig = (pinia: any) => ({
    global: {
      plugins: [pinia],
      mocks: {
        $t: (msg: string) => msg
      }
    }
  })

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  it('megjeleníti a hibaüzenetet, ha az email érvénytelen', async () => {
    const pinia = createPinia()
    const checkoutStore = useCheckoutStore(pinia)
    const userStore = useUserStore(pinia)
    
    userStore.user = null
    checkoutStore.shippingDetails.email = 'rossz-email'
    
    const wrapper = mount(ShippingForm, createGlobalConfig(pinia))
    await wrapper.vm.$nextTick()

    const errors = wrapper.findAll('p[role="alert"]')
    
    const emailErrorFound = errors.some(error => error.text().includes('common.invalid_email'))
    
    expect(emailErrorFound).toBe(true)
  })

  it('automatikusan kitölti az adatokat, ha a userStore-ba megérkezik a felhasználó', async () => {
    const pinia = createPinia()
    const userStore = useUserStore(pinia)
    const checkoutStore = useCheckoutStore(pinia)

    const mockUser = {
      email: 'teszt@elek.hu',
      name: { firstname: 'Elek', lastname: 'Teszt' },
      zipcode: '1234',
      city: 'Sopron',
      street: 'Fő utca'
    }

    const wrapper = mount(ShippingForm, createGlobalConfig(pinia))

    userStore.user = mockUser as any
    
    await wrapper.vm.$nextTick()

    expect(checkoutStore.shippingDetails.first_name).toBe('Elek')
    expect(checkoutStore.shippingDetails.email).toBe('teszt@elek.hu')
    expect(checkoutStore.shippingDetails.city).toBe('Sopron')
  })

  it('helyesen kezeli a stringként érkező nevet (szétválasztás)', async () => {
    const pinia = createPinia()
    const userStore = useUserStore(pinia)
    const checkoutStore = useCheckoutStore(pinia)

    const wrapper = mount(ShippingForm, createGlobalConfig(pinia))

    userStore.user = {
      email: 'istvan@kovacs.hu',
      name: 'István Kovács'
    } as any

    await wrapper.vm.$nextTick()

    expect(checkoutStore.shippingDetails.first_name).toBe('István')
    expect(checkoutStore.shippingDetails.last_name).toBe('Kovács')
  })

  it('meghívja a getUserData-t onMounted során, ha nincs user', () => {
    const pinia = createPinia()
    const userStore = useUserStore(pinia)
    const spy = vi.spyOn(userStore, 'getUserData')

    mount(ShippingForm, createGlobalConfig(pinia))

    expect(spy).toHaveBeenCalled()
  })
})