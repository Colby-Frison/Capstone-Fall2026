import { test, expect } from '@playwright/test';

test.describe('Scored catalog search', () => {
  test('shows a ranked list with type badges after Search submit', async ({ page }) => {
    await page.route('**/api/nih/conditions**', async (route) => {
      const url = new URL(route.request().url());
      const q = url.searchParams.get('q') || '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          query: q,
          suggestions: [
            {
              keyId: 'dm-1',
              label: 'Diabetes mellitus',
              primaryName: 'Diabetes mellitus',
              synonyms: ['Diabetes', 'Sugar diabetes'],
              icd10: ['E11.9'],
              infoLinks: [],
              matchedConditionIds: [],
            },
          ],
          error: null,
        }),
      });
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Try searching for a condition or medication' })).toBeVisible();

    const searchForm = page.locator('main form.stack-form');
    await searchForm.getByRole('combobox').fill('diabetes');
    await searchForm.getByRole('button', { name: 'Search' }).click();

    await expect(page.getByText(/result(?:s)? for/i)).toBeVisible({ timeout: 15000 });
    const list = page.getByTestId('search-results-list');
    await expect(list).toBeVisible();
    const firstHit = list.locator('button').first();
    await expect(firstHit).toContainText(/diabetes/i);
    await expect(firstHit.getByText('Condition')).toBeVisible();
  });
});
