import { test, expect } from '@playwright/test';

test.describe('Bejelentkezés folyamat', () => {
  test('sikeres login és átirányítás', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'tibii9423@gmail.com');
    await page.fill('input[type="password"]', '98765432');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });
});