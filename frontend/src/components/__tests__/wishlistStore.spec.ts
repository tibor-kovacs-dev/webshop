import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useWishlistStore } from '@/stores/wishlistStore'

describe('WishlistStore Specifikáció', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mockProduct = { 
    id: 10, 
    name: 'Kedvenc Termék', 
    price: 5000, 
    discount: 0, 
    image: '', 
    category: 'test', 
    description: '' 
  }

  it('hozzáadás és törlés megfelelően módosítja a listát', () => {
    const store = useWishlistStore()
    
    store.addToWishlist(mockProduct)
    expect(store.wishlistCount).toBe(1)
    expect(store.isInWishlist(10)).toBe(true)

    store.removeFromWishlist(10)
    expect(store.wishlistCount).toBe(0)
    expect(store.isInWishlist(10)).toBe(false)
  })

  it('nem ad hozzá duplikált terméket', () => {
    const store = useWishlistStore()
    store.addToWishlist(mockProduct)
    store.addToWishlist(mockProduct)
    
    expect(store.wishlist.length).toBe(1)
  })
})