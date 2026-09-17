import { expect, test } from '@playwright/test';

/** Covers the real browser-to-Next-to-Express mobile authentication journey. */
test('user can complete real mobile OTP authentication', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in to continue.' })).toBeVisible();
  await page.getByLabel('Mobile number').fill('9123456789');
  await page.getByRole('button', { name: 'Continue to OTP' }).click();
  await expect(page).toHaveURL(/\/verify$/);
  await page.getByLabel('One-time password').fill('1234');
  await page.getByRole('button', { name: 'Verify & enter' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Make room for a great story.' })).toBeVisible();
  expect(browserErrors).toEqual([]);
});
