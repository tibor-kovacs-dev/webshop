import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import ProductCard from '@/components/ProductCard.vue'
import { useCartStore } from '@/stores/cartStore'
import { useWishlistStore } from '@/stores/wishlistStore'

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: { value: 'hu' }
  })
}))

describe('ProductCard.vue', () => {
  const mockProduct = {
    id: 1,
    name: 'Teszt Laptop',
    price: 100,
    discount: 10,
    image: 'test.jpg',
    category: 'electronics',
    rating: { rate: 4.5, count: 10 }
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mountComponent = () => {
    return mount(ProductCard, {
      props: { product: mockProduct as any },
      global: {
        stubs: {
          'font-awesome-icon': true,
          'StarRating': true
        },
        mocks: {
          $n: (val: number) => val.toLocaleString()
        }
      }
    })
  }

  it('megjeleníti a termék nevét és kiszámolja a kedvezményes árat', () => {
  const wrapper = mountComponent()
  expect(wrapper.text()).toContain('Teszt Laptop')
  
  const textWithoutSpaces = wrapper.text().replace(/\s/g, '')
  expect(textWithoutSpaces).toContain('29520')
})

  it('a név kattintásakor a részletekre navigál', async () => {
    const wrapper = mountComponent()
    await wrapper.find('.cursor-pointer').trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/products/1')
  })

  it('meghívja a cartStore addToCart metódusát gombnyomásra', async () => {
    const wrapper = mountComponent()
    const cartStore = useCartStore()
    const spy = vi.spyOn(cartStore, 'addToCart')

    await wrapper.find('button').trigger('click')
    expect(spy).toHaveBeenCalled()
  })

  it('eltávolítja a terméket, ha már benne volt a kívánságlistában', async () => {
    const wishlistStore = useWishlistStore()
    wishlistStore.wishlist = [mockProduct as any]
    
    const removeSpy = vi.spyOn(wishlistStore, 'removeFromWishlist')
    const wrapper = mountComponent()

    const heartBtn = wrapper.find('.fa-heart').exists() 
      ? wrapper.find('.fa-heart') 
      : wrapper.findComponent({ name: 'font-awesome-icon' })
    
    await heartBtn.trigger('click')

    expect(removeSpy).toHaveBeenCalledWith(1)
  })

  it('hozzáadja a terméket, ha még nem volt a kívánságlistában', async () => {
    const wishlistStore = useWishlistStore()
    wishlistStore.wishlist = [] 
    
    const addSpy = vi.spyOn(wishlistStore, 'addToWishlist')
    const wrapper = mountComponent()

    const heartBtn = wrapper.findComponent({ name: 'font-awesome-icon' })
    await heartBtn.trigger('click')

    expect(addSpy).toHaveBeenCalled()
  })
})