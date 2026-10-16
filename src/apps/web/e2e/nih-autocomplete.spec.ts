import { expect, test } from '@playwright/test';

const mockResponse = {
  query: 'migr',
  suggestions: [
    {
      keyId: '9001',
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
  ],
  error: null,
};

test.describe('NIH condition autocomplete', () => {
  test('shows suggestions and selects with keyboard', async ({ page }) => {
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
    await input.fill('migr');
    const listbox = page.getByRole('listbox', { name: 'Condition suggestions' });
    await expect(listbox).toBeVisible({ timeout: 5000 });
    await expect(listbox.getByRole('option').first()).toContainText('Migraine');

    await input.press('Enter');

    // Client enriches matches against the local catalog; Migraine typically opens condition detail.
    await expect(
      page
        .getByRole('heading', { name: /migraine/i })
        .or(page.getByText(/results for/i))
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
    await input.fill('migr');
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 });
    await input.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
  });
});
