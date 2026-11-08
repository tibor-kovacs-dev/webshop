import { test, expect } from '@playwright/test'

test.describe('Login E2E', () => {
  test('successfully logs in and redirects to home', async ({ page }) => {
    let authenticated = false

    await page.route('**/sanctum/csrf-cookie', async (route) => {
      await route.fulfill({
        status: 204,
        body: '',
      })
    })

    await page.route('**/api/users/me', async (route) => {
      if (!authenticated) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Unauthenticated.',
          }),
        })

        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 1,
            email: 'e2e@example.com',
            first_name: 'Test',
            last_name: 'User',
            email_verified_at: '2026-01-01T10:00:00.000000Z',
          },
        }),
      })
    })

    await page.route('**/api/users/login', async (route) => {
      const body = route.request().postDataJSON()

      if (
        body.email === 'e2e@example.com' &&
        body.password === 'TestPassword123!'
      ) {
        authenticated = true

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Login successful.',
          }),
        })

        return
      }

      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Invalid credentials.',
        }),
      })
    })

    await page.goto('/login')

    const loginForm = page.locator('form').filter({
      has: page.locator('input[type="password"]'),
    })

    await loginForm.locator('input[type="email"]').fill('e2e@example.com')
    await loginForm.locator('input[type="password"]').fill('TestPassword123!')

    await loginForm.locator('button[type="submit"]').click()

    await expect(page).toHaveURL('/')
  })

  test('displays an error when credentials are invalid', async ({ page }) => {
    await page.route('**/sanctum/csrf-cookie', async (route) => {
      await route.fulfill({
        status: 204,
        body: '',
      })
    })

    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Unauthenticated.',
        }),
      })
    })

    await page.route('**/api/users/login', async (route) => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Invalid credentials.',
        }),
      })
    })

    await page.goto('/login')

    const loginForm = page.locator('form').filter({
      has: page.locator('input[type="password"]'),
    })

    await loginForm.locator('input[type="email"]').fill('wrong@example.com')
    await loginForm.locator('input[type="password"]').fill('WrongPassword123!')

    await loginForm.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('.text-red-800')).toBeVisible()
  })
})