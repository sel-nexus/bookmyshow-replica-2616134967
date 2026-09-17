import { expect, test } from '@playwright/test';

test.describe('catalogue selection', () => {
  test('renders real movies and theatre mappings from the backend', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    await page.goto('/login');
    await page.getByLabel('Mobile number').fill('9876543210');
    await page.getByRole('button', { name: 'Continue to OTP' }).click();
    await page.getByLabel('One-time password').fill('1234');
    await page.getByRole('button', { name: 'Verify & enter' }).click();
    await page.waitForURL('**/dashboard');

    await expect(page.getByRole('heading', { name: 'Paradise' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bloody Romeo' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'OG2' })).toBeVisible();

    await page.getByRole('link', { name: 'Choose Paradise' }).click();
    await page.waitForURL('**/theatres?movieId=1');
    await expect(page.getByRole('heading', { name: 'Sandhya 70mm' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sudharsham 70mm' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Allu Cinemas' })).toBeVisible();
    expect(browserErrors).toEqual([]);
  });
});
