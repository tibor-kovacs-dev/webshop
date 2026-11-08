
import { test, expect } from '@playwright/test'

test.describe('Checkout Flow E2E', () => {
  test('completes the checkout and payment flow successfully', async ({ page }) => {
    const product = {
      id: 1,
      slug: 'test-product',
      name: 'E2E Test Product',
      price: 10,
      prices: {
        eur: {
          list: 10,
          final: 10,
        },
        huf: {
          list: 3900,
          final: 3900,
        },
      },
      discount: 0,
      image: '',
      category: 'Electronics',
      description: 'Test product for checkout E2E.',
      stock: 10,
      rating: {
        rate: 5,
        count: 1,
      },
    }

    const user = {
      id: 1,
      first_name: 'Test',
      last_name: 'User',
      name: 'Test User',
      email: 'e2e@example.com',
      email_verified_at: '2026-01-01T10:00:00.000000Z',
    }

    let createIntentPayload: any = null
    let orderPayload: any = null
    let finalizePayload: any = null

    // Mock authenticated user.
    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user }),
      })
    })

    // Mock product API endpoints.
    await page.route('**/api/products**', async (route) => {
      const url = new URL(route.request().url())
      const pathname = url.pathname

      if (pathname.endsWith('/prices')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            '1': {
              prices: product.prices,
            },
          }),
        })

        return
      }

      if (pathname.endsWith('/categories')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(['Electronics']),
        })

        return
      }

      if (
        pathname.endsWith('/new') ||
        pathname.endsWith('/discounted')
      ) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([product]),
        })

        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          products: [product],
        }),
      })
    })

    // Mock Stripe.js and Payment Element.
    await page.route(/https:\/\/js\.stripe\.com\/v3\/?/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          (() => {
            class MockStripe {
              elements() {
                return {
                  create(type) {
                    return {
                      mount() {
                        if (type === 'payment') {
                          window.__stripePaymentElementMounted = true
                        }
                      },
                      destroy() {},
                      on() {},
                      update() {},
                    }
                  },

                  submit: async () => ({}),
                }
              }

              confirmPayment() {
                window.__stripeConfirmCalled = true

                return Promise.resolve({})
              }

              retrievePaymentIntent() {
                return Promise.resolve({
                  paymentIntent: {
                    id: 'pi_mock_123',
                    status: 'succeeded',
                  },
                })
              }
            }

            window.Stripe = function () {
              return new MockStripe()
            }

            window.Stripe.version = 'mock'
          })()
        `,
      })
    })

    // Mock PaymentIntent creation.
    await page.route('**/api/checkout/create-intent', async (route) => {
      createIntentPayload = route.request().postDataJSON()

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          client_secret: 'pi_mock_123_secret_mock',
          payment_intent_id: 'pi_mock_123',
          amount: 1000,
          total: 10,
          currency: 'eur',
        }),
      })
    })

    // Mock order creation and order history.
    await page.route('**/api/orders', async (route) => {
      if (route.request().method() === 'POST') {
        orderPayload = route.request().postDataJSON()

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Order successfully created.',
            order_id: 42,
          }),
        })

        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    // Mock payment finalization.
    await page.route('**/api/orders/finalize', async (route) => {
      finalizePayload = route.request().postDataJSON()

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Payment verified.',
          payment_verified: true,
          order_id: 42,
          status: 'completed',
          webhook_pending: false,
        }),
      })
    })

    // Open homepage.
    await page.goto('/')

    // Add a product to the cart.
    await page
      .getByRole('button', { name: /Add to Cart/i })
      .first()
      .click()

    // Close the cart notification.
    const cartNotification = page.locator('.fixed.inset-0.z-50')

    await expect(cartNotification).toBeVisible()

    await cartNotification.locator('button').first().click()

    await expect(cartNotification).toBeHidden()

    // Open cart.
    await page.goto('/checkout/cart')

    await expect(
      page.getByText('E2E Test Product'),
    ).toBeVisible()

    // Proceed to checkout.
    await page
      .getByRole('button', { name: /Proceed to Checkout/i })
      .click()

    await expect(page).toHaveURL(/\/checkout$/)

    // Fill shipping information.
    await page.locator('#firstName').fill('Test')
    await page.locator('#lastName').fill('User')
    await page.locator('#email').fill('e2e@example.com')
    await page.locator('#zipcode').fill('1234')
    await page.locator('#city').fill('Budapest')
    await page.locator('#street').fill('Test Street')
    await page.locator('#house_number').fill('10')

    // Continue to payment method.
    await page
      .getByRole('button', { name: 'Continue', exact: true })
      .click()

    await expect(
      page.getByRole('heading', {
        name: 'Choose Payment Method',
      }),
    ).toBeVisible()

    // Select Stripe card payment.
    await page
      .getByRole('radio', { name: 'Credit Card Payment' })
      .click()

    await page
      .getByRole('button', { name: 'Continue', exact: true })
      .click()

    // Verify that Stripe Payment Element was mounted.
    await expect(
      page.locator('#payment-element'),
    ).toBeAttached()

    await expect.poll(async () => {
      return page.evaluate(
        () => (window as any).__stripePaymentElementMounted === true,
      )
    }).toBe(true)

    // Accept terms and conditions.
    await page.locator('input[type="checkbox"]').check()

    // Submit order and payment.
    await page
      .getByRole('button', { name: 'Place Order', exact: true })
      .click()

    // Verify successful checkout.
    await expect(
      page.getByRole('heading', {
        name: 'Thank you for your purchase!',
      }),
    ).toBeVisible({
      timeout: 10000,
    })

    // Verify PaymentIntent request.
    expect(createIntentPayload).toMatchObject({
      currency: 'eur',
      items: [
        {
          id: 1,
          quantity: 1,
        },
      ],
    })

    // Verify order creation request.
    expect(orderPayload).toMatchObject({
      payment_method: 'credit_card_stripe',
      payment_intent_id: 'pi_mock_123',
      currency: 'EUR',
      items: [
        {
          product_id: 1,
          quantity: 1,
        },
      ],
    })

    expect(JSON.parse(orderPayload.shipping_details)).toMatchObject({
      first_name: 'Test',
      last_name: 'User',
      email: 'e2e@example.com',
      city: 'Budapest',
    })

    // Verify Stripe confirmation.
    expect(
      await page.evaluate(
        () => (window as any).__stripeConfirmCalled,
      ),
    ).toBe(true)

    // Verify payment finalization.
    expect(finalizePayload).toEqual({
      payment_intent_id: 'pi_mock_123',
    })
  })
})
