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

test('completes checkout with click navigation and persists confirmation after reload', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await signIn(page, '9123456791');

  const moviesResponsePromise = page.waitForResponse((response) =>
    response.request().method() === 'GET' &&
    new URL(response.url()).pathname === '/api/v1/movies' &&
    response.status() === 200,
  );
  await page.getByRole('link', { name: 'Browse movies' }).click();
  await moviesResponsePromise;
  await expect(page.getByRole('heading', { name: 'Choose your story.' })).toBeVisible();
  await page.getByRole('link', { name: 'Choose Paradise' }).click();
  await expect(page).toHaveURL(/\/theatres\?movieId=1$/);
  await expect(page.getByRole('heading', { name: 'Pick a theatre.' })).toBeVisible();

  await page.getByRole('link', { name: 'Choose Sandhya 70mm' }).click();
  await expect(page).toHaveURL(/\/seats\?movieId=1&theatreId=1$/);
  await expect(page.getByRole('heading', { name: 'Pick your seats.' })).toBeVisible();
  await page.getByRole('button', { name: 'Select Seats' }).click();
  await expect(page).toHaveURL(/\/payment\?movieId=1&theatreId=1&seats=A1%2CA2%2CA3&totalPrice=450$/);
  await expect(page.getByText('A1, A2, A3 · Rs. 450')).toBeVisible();

  await page.getByLabel('Card Number').fill('4111111111111111');
  await page.getByLabel('Expiry Date').fill('12/30');
  await page.getByLabel('CVV').fill('123');
  const bookingResponsePromise = page.waitForResponse((response) =>
    response.request().method() === 'POST' &&
    new URL(response.url()).pathname === '/api/v1/bookings' &&
    response.status() === 201,
  );
  await page.getByRole('button', { name: 'Pay & confirm' }).click();
  await expect(page.getByRole('button', { name: 'Processing Payment...' })).toBeVisible();
  await bookingResponsePromise;
  await expect(page).toHaveURL(/\/confirmation\?confirmationId=BMS-[A-Z0-9]{12}&movieId=1&theatreId=1$/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: 'Congratulations!' })).toBeVisible();
  await expect(page.getByText('Paradise')).toBeVisible();
  await expect(page.getByText('Sandhya 70mm')).toBeVisible();
  await expect(page.getByText('A1, A2, A3')).toBeVisible();
  const confirmationId = page.getByText(/^BMS-[A-Z0-9]{12}$/);
  await expect(confirmationId).toBeVisible();
  await page.screenshot();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Congratulations!' })).toBeVisible();
  await expect(page.getByText('Paradise')).toBeVisible();
  await expect(page.getByText('Sandhya 70mm')).toBeVisible();
  await expect(page.getByText('A1, A2, A3')).toBeVisible();
  await expect(confirmationId).toBeVisible();
  expect(browserErrors).toEqual([]);
});
