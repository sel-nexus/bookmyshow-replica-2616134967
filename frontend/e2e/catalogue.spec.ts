import { expect, test, type Page } from '@playwright/test';

function captureBrowserErrors(page: Page): string[] {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  return browserErrors;
}

async function signIn(page: Page, mobileNumber: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Mobile number').fill(mobileNumber);
  const loginResponsePromise = page.waitForResponse((response) =>
    response.request().method() === 'POST' &&
    new URL(response.url()).pathname === '/api/v1/auth/login' &&
    response.status() === 200,
  );
  await page.getByRole('button', { name: 'Continue to OTP' }).click();
  await loginResponsePromise;
  await page.getByLabel('One-time password').fill('1234');
  const verifyResponsePromise = page.waitForResponse((response) =>
    response.request().method() === 'POST' &&
    new URL(response.url()).pathname === '/api/v1/auth/verify' &&
    response.status() === 200,
  );
  await page.getByRole('button', { name: 'Verify & enter' }).click();
  await verifyResponsePromise;
}

test.describe('catalogue selection', () => {
  test('renders real movies and mapped theatres through click navigation', async ({ page }) => {
    const browserErrors = captureBrowserErrors(page);
    await signIn(page, '9876543210');
    await page.getByRole('link', { name: 'Browse movies' }).click();

    await expect(page.getByRole('heading', { name: 'Choose your story.' })).toBeVisible();
    const moviesResponsePromise = page.waitForResponse((response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/v1/movies' &&
      response.status() === 200,
    );
    await page.reload();
    await moviesResponsePromise;
    await expect(page.getByRole('heading', { name: 'Paradise' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bloody Romeo' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'OG2' })).toBeVisible();

    const theatresResponsePromise = page.waitForResponse((response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/v1/theatres' &&
      new URL(response.url()).search === '?movieId=1' &&
      response.status() === 200,
    );
    await page.getByRole('link', { name: 'Choose Paradise' }).click();
    await theatresResponsePromise;
    await expect(page).toHaveURL(/\/theatres\?movieId=1$/);
    await expect(page.getByRole('heading', { name: 'Sandhya 70mm' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sudharsham 70mm' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Allu Cinemas' })).toBeVisible();
    await page.screenshot();
    expect(browserErrors).toEqual([]);
  });

  test('shows the live empty state for an unknown movie mapping', async ({ page }) => {
    const browserErrors = captureBrowserErrors(page);
    await signIn(page, '9876543211');

    const emptyMappingResponsePromise = page.waitForResponse((response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/v1/theatres' &&
      new URL(response.url()).search === '?movieId=999999' &&
      response.status() === 200,
    );
    await page.getByRole('link', { name: 'Try empty theatre demo' }).click();
    await emptyMappingResponsePromise;
    await expect(page.getByRole('status').filter({ hasText: 'Nothing is showing here yet' })).toContainText('Nothing is showing here yet');
    expect(browserErrors).toEqual([]);
  });

  test('shows a loading indicator while the real movies response is pending', async ({ page }) => {
    const browserErrors = captureBrowserErrors(page);
    await signIn(page, '9876543212');

    await page.route('**/api/v1/movies', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });
    await page.getByRole('link', { name: 'Browse movies' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Loading the cinema catalogue' })).toContainText('Loading the cinema catalogue');
    await expect(page.getByRole('heading', { name: 'Paradise' })).toBeVisible();
    expect(browserErrors).toEqual([]);
  });
});
