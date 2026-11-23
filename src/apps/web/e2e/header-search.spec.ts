import { expect, test, type Page } from '@playwright/test';

function headerSearch(page: Page) {
  return page.locator('.desktop-search').getByRole('combobox');
}

function pageSearch(page: Page) {
  return page.locator('main form.stack-form').getByRole('combobox');
}

async function stubNih(page: Page) {
  await page.route('**/api/nih/conditions**', async (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get('q') || '';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ query: q, suggestions: [], error: null }),
    });
  });
}

test('searching from Home fills the page field and leaves the header search empty', async ({ page }) => {
  await stubNih(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const homeSearch = page.locator('main form.stack-form').getByRole('combobox');
  await homeSearch.fill('migraine');
  await page.locator('main form.stack-form').getByRole('button', { name: 'Search' }).click();

  await expect(pageSearch(page)).toHaveValue('migraine');
  await expect(headerSearch(page)).toHaveValue('');
});

test('opening the menu on a narrow screen leaves the header search empty', async ({ page }) => {
  await stubNih(page);
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');

  const homeSearch = page.locator('main form.stack-form').getByRole('combobox');
  await homeSearch.fill('migraine');
  await page.locator('main form.stack-form').getByRole('button', { name: 'Search' }).click();

  await expect(pageSearch(page)).toHaveValue('migraine');
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await expect(page.locator('.mobile-menu').getByRole('combobox')).toHaveValue('');
});

test('submitting a new query from the page field leaves the header search empty', async ({ page }) => {
  await stubNih(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  await page.locator('main form.stack-form').getByRole('combobox').fill('migraine');
  await page.locator('main form.stack-form').getByRole('button', { name: 'Search' }).click();

  await pageSearch(page).fill('diabetes');
  await page.locator('main form.stack-form').getByRole('button', { name: 'Search' }).click();

  await expect(pageSearch(page)).toHaveValue('diabetes');
  await expect(headerSearch(page)).toHaveValue('');
  await expect(page.getByText(/result(?:s)? for/i)).toContainText('"diabetes"');
});

test('submitting from the header search updates the page field and clears the header', async ({ page }) => {
  await stubNih(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  await page.locator('main form.stack-form').getByRole('combobox').fill('migraine');
  await page.locator('main form.stack-form').getByRole('button', { name: 'Search' }).click();

  await headerSearch(page).fill('diabetes');
  await expect(pageSearch(page)).toHaveValue('migraine');

  await page.locator('.desktop-search').getByRole('button', { name: 'Search' }).click();

  await expect(pageSearch(page)).toHaveValue('diabetes');
  await expect(headerSearch(page)).toHaveValue('');
  await expect(page.getByText(/result(?:s)? for/i)).toContainText('"diabetes"');
});

test('choosing a catalog condition from the header opens it and clears the header', async ({ page }) => {
  await page.route('**/api/nih/conditions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        query: 'acou',
        suggestions: [
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
      }),
    });
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Search', exact: true }).click();

  await headerSearch(page).fill('acou');
  const listbox = page.locator('.desktop-search').getByRole('listbox', { name: 'Condition suggestions' });
  await expect(listbox).toBeVisible();
  await listbox.getByRole('option').first().click();

  await expect(page.getByRole('heading', { name: /Acoustic Neuroma/i })).toBeVisible();
  await expect(headerSearch(page)).toHaveValue('');
});

test('choosing a suggestion that is not in the catalog searches it and clears the header', async ({ page }) => {
  await page.route('**/api/nih/conditions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        query: 'zz',
        suggestions: [
          {
            keyId: 'zz-1',
            label: 'Zzyzx fever',
            primaryName: 'Zzyzx fever',
            synonyms: [],
            icd10: [],
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

  await headerSearch(page).fill('zz');
  const listbox = page.locator('.desktop-search').getByRole('listbox', { name: 'Condition suggestions' });
  await expect(listbox).toBeVisible();
  await listbox.getByRole('option').first().click();

  await expect(pageSearch(page)).toHaveValue('Zzyzx fever');
  await expect(headerSearch(page)).toHaveValue('');
  await expect(page.getByRole('heading', { name: /No results for/ })).toContainText('Zzyzx fever');
});

test('Home has no header search field', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  await expect(page.locator('.desktop-search')).toHaveCount(0);
  await expect(page.locator('main form.stack-form').getByRole('combobox')).toBeVisible();
});

test('leaving search does not prefill the header on other pages', async ({ page }) => {
  await stubNih(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  await page.locator('main form.stack-form').getByRole('combobox').fill('migraine');
  await page.locator('main form.stack-form').getByRole('button', { name: 'Search' }).click();
  await expect(pageSearch(page)).toHaveValue('migraine');

  const nav = page.getByRole('navigation', { name: 'Primary' });

  await page.getByRole('button', { name: /Headache or Migraine/ }).click();
  await expect(page.getByRole('heading', { name: /Headache or Migraine/i })).toBeVisible();
  await expect(headerSearch(page)).toHaveValue('');

  await nav.getByRole('button', { name: 'Conditions', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Browse Conditions' })).toBeVisible();
  await expect(headerSearch(page)).toBeVisible();
  await expect(headerSearch(page)).toHaveValue('');

  await nav.getByRole('button', { name: 'Search', exact: true }).click();
  await pageSearch(page).fill('migraine');
  await page.locator('main form.stack-form').getByRole('button', { name: 'Search' }).click();
  await page.getByRole('button', { name: /Sumatriptan/ }).click();
  await expect(page.getByRole('heading', { name: /Sumatriptan/i })).toBeVisible();
  await expect(headerSearch(page)).toHaveValue('');

  await nav.getByRole('button', { name: 'How This Works', exact: true }).click();
  await expect(headerSearch(page)).toBeVisible();
  await expect(headerSearch(page)).toHaveValue('');

  await nav.getByRole('button', { name: 'About', exact: true }).click();
  await expect(headerSearch(page)).toBeVisible();
  await expect(headerSearch(page)).toHaveValue('');
});
