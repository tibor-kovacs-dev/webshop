// src/stores/__tests__/cartStore.spec.ts
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'

import { type Product } from '@/stores/productStore'
import { useCartStore } from '@/stores/cartStore'
describe('CartStore Specifikáció', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const createMockProduct = (id: number | string, name: string, price: number): Product => ({
    id,
    name,
    price,
    discount: 0,
    image: '',
    category: 'test',
    description: 'test description'
  })

  it('termék hozzáadásakor bekerül a kosárba', () => {
    const store = useCartStore()
    const mockProduct = createMockProduct(1, 'Test Product', 100)
    
    store.addToCart(mockProduct)

    expect(store.items.length).toBe(1)

    expect(store.items[0]!.name).toBe('Test Product')
    expect(store.items[0]!.quantity).toBe(1)
  })

  it('ugyanazon termék többszöri hozzáadásakor csak a mennyiség nő', () => {
    const store = useCartStore()
    const mockProduct = createMockProduct(1, 'Test Product', 100)
    
    store.addToCart(mockProduct)
    store.addToCart(mockProduct)

    expect(store.items.length).toBe(1)
    expect(store.items[0]!.quantity).toBe(2)
  })

  it('removeFromCart csökkenti a mennyiséget vagy törli a terméket', () => {
    const store = useCartStore()
    const mockProduct = createMockProduct(1, 'A', 100)
    
    store.addToCart(mockProduct)
    store.addToCart(mockProduct) // Quantity: 2

    store.removeFromCart(1)
    expect(store.items[0]!.quantity).toBe(1)

    store.removeFromCart(1)
    expect(store.items.length).toBe(0)
  })
})