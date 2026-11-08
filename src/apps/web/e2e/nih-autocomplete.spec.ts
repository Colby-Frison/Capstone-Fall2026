import { expect, test } from '@playwright/test';

/** Mixed NIH payload: one catalog match + one NIH-only term (client enrich fills matches). */
const mockResponse = {
  query: 'acou',
  suggestions: [
    {
      keyId: '9002',
      label: 'Migraine',
      primaryName: 'Migraine',
      synonyms: ['sick headache'],
      icd10: ['G43.909'],
      infoLinks: [
        {
          url: 'https://medlineplus.gov/migraine.html',
          title: 'Migraine — MedlinePlus',
        },
      ],
      matchedConditionIds: [],
    },
    {
      keyId: '9001',
      label: 'Acoustic neuroma',
      primaryName: 'Acoustic neuroma',
      synonyms: ['vestibular schwannoma'],
      icd10: ['D33.3'],
      infoLinks: [],
      matchedConditionIds: [],
    },
  ],
  error: null,
};

test.describe('NIH condition autocomplete', () => {
  test('lists catalog matches first, then NIH-only behind a divider', async ({
    page,
  }) => {
    await page.route('**/api/nih/conditions**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      });
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const input = page.locator('main form.stack-form').getByRole('combobox');
    await input.fill('acou');
    const listbox = page.getByRole('listbox', { name: 'Condition suggestions' });
    await expect(listbox).toBeVisible({ timeout: 5000 });

    const options = listbox.getByRole('option');
    await expect(options).toHaveCount(2);
    await expect(options.nth(0)).toContainText(/Acoustic Neuroma|Acoustic neuroma/i);
    await expect(options.nth(0)).toContainText('In this guide');
    await expect(listbox.getByText('Not in this guide', { exact: true })).toBeVisible();
    await expect(options.nth(1)).toContainText('Migraine');
    await expect(options.nth(1)).toContainText('not in this guide');
  });

  test('shows suggestions and selects catalog match with keyboard', async ({
    page,
  }) => {
    await page.route('**/api/nih/conditions**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      });
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const input = page.locator('main form.stack-form').getByRole('combobox');
    await input.fill('acou');
    const listbox = page.getByRole('listbox', { name: 'Condition suggestions' });
    await expect(listbox).toBeVisible({ timeout: 5000 });
    await expect(listbox.getByRole('option').first()).toContainText(/Acoustic/i);

    await input.press('Enter');

    await expect(
      page
        .getByRole('heading', { name: /Acoustic Neuroma/i })
        .or(page.getByRole('heading', { name: /What the guide says/i }))
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Escape closes the suggestion list', async ({ page }) => {
    await page.route('**/api/nih/conditions**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      });
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const input = page.locator('main form.stack-form').getByRole('combobox');
    await input.fill('acou');
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 });
    await input.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
  });
});
