import { expect, test } from '@playwright/test';

/** Exercises real auth, catalogue, checkout, and backend confirmation wiring. */
test('user can complete a real booking checkout and see backend confirmation', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto('/login');
  await page.getByLabel('Mobile number').fill('9123456791');
  await page.getByRole('button', { name: 'Continue to OTP' }).click();
  await page.getByLabel('One-time password').fill('1234');
  await page.getByRole('button', { name: 'Verify & enter' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Choose your story.' })).toBeVisible();
  await page.getByRole('link', { name: 'Choose Paradise' }).click();
  await expect(page).toHaveURL(/\/theatres\?movieId=1$/);
  await expect(page.getByRole('heading', { name: 'Pick a theatre.' })).toBeVisible();
  await expect(page.getByText('Sandhya 70mm')).toBeVisible();

  await page.goto('/seats?movieId=1&theatreId=1');
  await expect(page.getByRole('heading', { name: 'Pick your seats.' })).toBeVisible();
  await page.getByRole('button', { name: 'Select Seats' }).click();
  await expect(page).toHaveURL(/\/payment\?movieId=1&theatreId=1&seats=A1%2CA2%2CA3&totalPrice=450$/);
  await expect(page.getByText('A1, A2, A3 · Rs. 450')).toBeVisible();

  await page.getByLabel('Card Number').fill('4111111111111111');
  await page.getByLabel('Expiry Date').fill('12/30');
  await page.getByLabel('CVV').fill('123');
  await page.getByRole('button', { name: 'Pay & confirm' }).click();
  await expect(page.getByRole('button', { name: 'Processing Payment...' })).toBeVisible();
  await expect(page).toHaveURL(/\/confirmation\?movieId=1&theatreId=1$/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: 'Congratulations!' })).toBeVisible();
  await expect(page.getByText('Paradise')).toBeVisible();
  await expect(page.getByText('Sandhya 70mm')).toBeVisible();
  await expect(page.getByText('A1, A2, A3')).toBeVisible();
  await expect(page.getByText(/^BMS-[A-Z0-9]{12}$/)).toBeVisible();
  expect(browserErrors).toEqual([]);
});
