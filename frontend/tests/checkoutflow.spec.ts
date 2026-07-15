import { test, expect } from '@playwright/test'

test.describe('Checkout Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/checkout/payment-intent', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ client_secret: 'pi_mock_secret_123' }),
      })
    })

    await page.route('**/api/checkout/finalize', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })
  })

  test('Full Journey - Reliable Selectors', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('button', { name: /Add to Cart|Kosárba/i })
      .first()
      .click()

    await page.getByRole('link', { name: /Cart|Kosár/i }).click()

    await expect(page).toHaveURL(/\/checkout\/cart/)
    await page.click(
      'button:has-text("Proceed to checkout"), button:has-text("Tovább a pénztárhoz")',
    )

    await expect(page).toHaveURL(/\/login/)
    await page.locator('input[type="email"]').fill('tibii9423@gmail.com')
    await page.locator('input[type="password"]').fill('98765432')
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/localhost:5173\/?$/);

    await page.getByRole('link', { name: '1', exact: true }).click();
    await page.click(
      'button:has-text("Proceed to checkout"), button:has-text("Tovább a pénztárhoz")',
    )
    await expect(page).toHaveURL(/.*checkout/)

    await page.fill('#firstName', 'Tibor')
    await page.fill('#lastName', 'Teszt')
    await page.fill('#email', 'tibii9423@gmail.com')
    await page.fill('#zipcode', '1234')
    await page.fill('#city', 'Budapest')
    await page.fill('#street', 'Teszt utca')
    await page.fill('#house_number', '10')

    await page.click('button:has-text("Continue"), button:has-text("Tovább")')
    await page.getByRole('radio', { name: 'Kártyás fizetés' }).click();
    await page.click('button:has-text("Continue"), button:has-text("Tovább")')


    const terms = page.locator('input[type="checkbox"]').first()
    if (await terms.isVisible()) await terms.check()
    
   
    await page.locator('button:has-text("Order"), button:has-text("Rendelés")').click({ force: true })
    await page.goto('/checkout/success?payment_intent_client_secret=pi_mock_secret_123')
    await expect(page.locator('.animate-spin')).not.toBeVisible()


    const successTitle = page.locator('.bg-green-50 h1')
    await expect(successTitle).toBeVisible()
    await expect(successTitle).toContainText(/Thank you for your purchase!|Köszönjük/i)
    await expect(page.locator('text=/5|4|3|2|1/')).toBeVisible()
  })
})
