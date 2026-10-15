import { expect, test } from '@playwright/test';

test.describe('search to checklist flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('finds a condition from home and tracks the checklist', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/Search a condition or medication/).fill('allergies');
    await page.getByPlaceholder(/Search a condition or medication/).press('Enter');

    await expect(page.getByText(/results? for/)).toBeVisible();
    await page.locator('main').getByRole('button', { name: /^Allergies/ }).first().click();

    await expect(page).toHaveURL(/\?condition=allergies$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Allergies' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What to bring' })).toBeVisible();
  });

  test('deep link survives a reload and back navigation', async ({ page }) => {
    await page.goto('/?condition=valvular-disease');
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    const title = await heading.textContent();

    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title ?? '');

    await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Conditions' }).click();
    await expect(page.getByRole('heading', { name: 'Browse Conditions' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title ?? '');
  });

  test('checking items updates the progress counter', async ({ page }) => {
    await page.goto('/?condition=valvular-disease');
    const counter = page.getByText(/^0\/\d+$/);
    await expect(counter).toBeVisible();
    const total = (await counter.textContent())!.split('/')[1];

    const firstItem = page.getByRole('heading', { name: 'What to bring' })
      .locator('xpath=ancestor::section[1]')
      .locator('section button')
      .first();
    await firstItem.click();
    await expect(page.getByText(`1/${total}`, { exact: true })).toBeVisible();
    await firstItem.click();
    await expect(page.getByText(`0/${total}`, { exact: true })).toBeVisible();
  });
});
