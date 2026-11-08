import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import ProductCard from '@/components/ProductCard.vue'
import { useCartStore } from '@/stores/cartStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { makeProduct, makePrices } from './fixtures'

const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

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

describe('ProductCard.vue', () => {
  const mockProduct = makeProduct({
    id: 1,
    slug: 'test-laptop',
    name: 'Test Laptop',
    price: 100,
    discount: 10,
    category: 'Home Electronics',
    rating: { rate: 4.5, count: 10 },
    prices: makePrices(29520, 82, { huf: 32800, eur: 91 }),
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mountComponent = (product = mockProduct) => {
    return mount(ProductCard, {
      props: { product },
      global: {
        stubs: {
          'font-awesome-icon': true,
          StarRating: true,
        },
        mocks: {
          $n: (val: number) => String(val),
        },
      },
    })
  }

  it('displays the product name and the discounted price calculated by the server', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('Test Laptop')

    const textWithoutSpaces = wrapper.text().replace(/\s/g, '')
    expect(textWithoutSpaces).toContain('29520')
    expect(textWithoutSpaces).not.toContain('32800')
  })

  it('displays a placeholder instead of zero when the price list is missing', () => {
    const wrapper = mountComponent(makeProduct({ name: 'No price', prices: undefined, rating: { rate: 4, count: 7 } }))

    expect(wrapper.text()).toContain('–')
    expect(wrapper.text()).not.toContain('0')
  })

  it('navigates to the slug-based product page when the name is clicked', async () => {
    const wrapper = mountComponent()

    await wrapper.find('.cursor-pointer').trigger('click')

    expect(mockPush).toHaveBeenCalledWith({
      name: 'ProductDetail',
      params: {
        categorySlug: 'home-electronics',
        productSlug: 'test-laptop',
      },
    })
  })

  it('generates the correct slug from a category name containing accented characters', async () => {
    const wrapper = mountComponent(makeProduct({ slug: 'cafe-equipment', category: 'Café Equipment' }))

    await wrapper.find('.cursor-pointer').trigger('click')

    expect(mockPush).toHaveBeenCalledWith({
      name: 'ProductDetail',
      params: { categorySlug: 'cafe-equipment', productSlug: 'cafe-equipment' },
    })
  })

  it('does not navigate when the slug is missing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mountComponent(makeProduct({ slug: '' }))

    await wrapper.find('.cursor-pointer').trigger('click')

    expect(mockPush).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('calls the cartStore addToCart method when the button is clicked', async () => {
    const wrapper = mountComponent()
    const cartStore = useCartStore()
    const spy = vi.spyOn(cartStore, 'addToCart')

    await wrapper.find('button').trigger('click')

    expect(spy).toHaveBeenCalledWith(mockProduct)
    expect(cartStore.items).toHaveLength(1)
  })

  it('removes the product if it is already in the wishlist', async () => {
    const wishlistStore = useWishlistStore()
    wishlistStore.wishlist = [mockProduct]

    const removeSpy = vi.spyOn(wishlistStore, 'removeFromWishlist')
    const wrapper = mountComponent()

    const heartBtn = wrapper.findComponent({ name: 'font-awesome-icon' })
    await heartBtn.trigger('click')

    expect(removeSpy).toHaveBeenCalledWith(1)
  })

  it('adds the product if it is not already in the wishlist', async () => {
    const wishlistStore = useWishlistStore()
    wishlistStore.wishlist = []

    const addSpy = vi.spyOn(wishlistStore, 'addToWishlist')
    const wrapper = mountComponent()

    const heartBtn = wrapper.findComponent({ name: 'font-awesome-icon' })
    await heartBtn.trigger('click')

    expect(addSpy).toHaveBeenCalledWith(mockProduct)
  })
})