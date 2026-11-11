import { expect, test as setup } from '@playwright/test';

const authFile = 'tests/e2e/.auth/buyer.json';

setup('authenticate as seeded buyer', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(
    page.getByRole('heading', { name: 'Sign in to your workspace' })
  ).toBeVisible();

  await page.getByLabel('Email').fill('buyer@paytrust.demo');
  await page.getByLabel('Password').fill('PayTrustDemo123!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('**/dashboard');
  await expect(
    page.getByRole('heading', { name: /Good morning/ })
  ).toBeVisible();

  await page.context().storageState({ path: authFile });
});
