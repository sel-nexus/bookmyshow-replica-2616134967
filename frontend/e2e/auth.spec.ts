import { expect, test, type Page } from '@playwright/test';

function captureBrowserErrors(page: Page): string[] {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  return browserErrors;
}

test.describe('authentication', () => {
  test('redirects an unauthenticated visitor from a protected route to the login form', async ({ page }) => {
    const browserErrors = captureBrowserErrors(page);

    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Sign in to continue.' })).toBeVisible();
    await expect(page.getByLabel('Mobile number')).toBeVisible();
    expect(browserErrors).toEqual([]);
  });

  test('completes the real OTP journey and captures the auth API contracts', async ({ page }) => {
    const browserErrors = captureBrowserErrors(page);

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to continue.' })).toBeVisible();
    await page.getByLabel('Mobile number').fill('9123456789');

    const loginResponsePromise = page.waitForResponse((response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/v1/auth/login' &&
      response.status() === 200,
    );
    await page.getByRole('button', { name: 'Continue to OTP' }).click();
    await loginResponsePromise;
    await expect(page).toHaveURL(/\/verify$/);

    await page.getByLabel('One-time password').fill('1234');
    const verifyResponsePromise = page.waitForResponse((response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/v1/auth/verify' &&
      response.status() === 200,
    );
    await page.getByRole('button', { name: 'Verify & enter' }).click();
    await verifyResponsePromise;
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Make room for a great story.' })).toBeVisible();
    expect(browserErrors).toEqual([]);
  });

  test('shows a visible alert for an invalid OTP before submission', async ({ page }) => {
    const browserErrors = captureBrowserErrors(page);

    await page.goto('/login');
    await page.getByLabel('Mobile number').fill('9123456788');
    const loginResponsePromise = page.waitForResponse((response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/v1/auth/login' &&
      response.status() === 200,
    );
    await page.getByRole('button', { name: 'Continue to OTP' }).click();
    await loginResponsePromise;

    await page.getByLabel('One-time password').fill('9999');
    await page.getByLabel('One-time password').fill('12');
    await page.getByRole('button', { name: 'Verify & enter' }).click();
    await expect(page.getByRole('alert').filter({ hasText: '4-digit OTP' })).toContainText('4-digit OTP');
    expect(browserErrors).toEqual([]);
  });
});
