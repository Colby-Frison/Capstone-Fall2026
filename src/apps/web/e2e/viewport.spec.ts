import { expect, test, type Page } from '@playwright/test';

const widths = [320, 390, 767, 768, 1024, 1279, 1280, 1440];

async function assertNoOverflow(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
}

async function goTo(page: Page, label: string, narrow: boolean) {
  if (narrow) {
    const menu = page.locator('.mobile-menu');
    if (!(await menu.isVisible())) {
      await page.getByRole('button', { name: 'Toggle navigation' }).click();
    }
    await expect(menu).toBeVisible();
    await menu.getByRole('button', { name: label, exact: true }).click();
    await expect(menu).toBeHidden();
    return;
  }
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: label, exact: true }).click();
}

async function walk(page: Page, width: number) {
  const narrow = width < 1280;
  await page.goto('/');
  await assertNoOverflow(page);

  const menuButton = page.getByRole('button', { name: 'Toggle navigation' });
  const desktopNav = page.getByRole('navigation', { name: 'Primary' });
  if (narrow) {
    await expect(menuButton).toBeVisible();
    await expect(desktopNav).toBeHidden();
  } else {
    await expect(menuButton).toBeHidden();
    await expect(desktopNav).toBeVisible();
  }

  await goTo(page, 'Search', narrow);
  await expect(page.getByRole('heading', { name: 'Try searching for a condition or medication' })).toBeVisible();
  await assertNoOverflow(page);
  if (!narrow) {
    await expect(page.getByRole('navigation', { name: 'Primary' }).locator('xpath=..').getByPlaceholder('Search conditions, medications…')).toBeVisible();
  }

  const searchForm = page.locator('main form.stack-form');
  await searchForm.getByRole('searchbox').fill('zzzz-no-match-xyz');
  await searchForm.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('heading', { name: /No results for/ })).toBeVisible();
  await assertNoOverflow(page);

  await searchForm.getByRole('searchbox').fill('x'.repeat(180));
  await searchForm.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('heading', { name: /No results for/ })).toBeVisible();
  await assertNoOverflow(page);

  await goTo(page, 'Conditions', narrow);
  await expect(page.getByRole('heading', { name: 'Browse Conditions' })).toBeVisible();
  const filter = page.getByPlaceholder('Filter within conditions…');
  await filter.fill('zzzz-none');
  await expect(page.getByText('No conditions match your filter.')).toBeVisible();
  await assertNoOverflow(page);
  if (narrow) {
    const categories = await page.getByText('Categories', { exact: true }).boundingBox();
    const empty = await page.getByText('No conditions match your filter.').boundingBox();
    expect(categories && empty && categories.y < empty.y).toBeTruthy();
  }
  await filter.fill('');
  await page.locator('.category-list').getByRole('button').nth(1).click();
  await assertNoOverflow(page);

  await page.goto('/?condition=valvular-disease');
  const pathway = page.getByRole('button', { name: /Single Valve Replacement \(Tissue, Mechanical, or Valvuloplasty\)/ });
  await expect(pathway).toBeVisible();
  await expect(pathway).toContainText(/special issuance/i);
  const row = await pathway.evaluate((el) => ({
    scroll: el.scrollWidth,
    client: el.clientWidth,
  }));
  expect(row.scroll).toBeLessThanOrEqual(row.client + 1);
  await assertNoOverflow(page);

  await goTo(page, 'How This Works', narrow);
  await expect(page.getByRole('heading', { name: 'Step-by-step' })).toBeVisible();
  await assertNoOverflow(page);

  await goTo(page, 'About', narrow);
  await expect(page.getByRole('heading', { name: 'About & Disclaimer' })).toBeVisible();
  await assertNoOverflow(page);

  await goTo(page, 'Search', narrow);
  await searchForm.getByRole('searchbox').fill('sertraline');
  await searchForm.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('button', { name: /Sertraline/ }).click();
  await expect(page.getByRole('heading', { name: 'Sertraline', exact: true })).toBeVisible();
  await assertNoOverflow(page);
}

test.describe('viewport layout', () => {
  for (const width of widths) {
    test(`fits without horizontal scrolling at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await walk(page, width);
    });
  }

  test('short landscape keeps the last menu item reachable', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 320 });
    await page.goto('/');
    await assertNoOverflow(page);
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    const about = page.locator('#mobile-nav').getByRole('button', { name: 'About' });
    await about.scrollIntoViewIfNeeded();
    await expect(about).toBeInViewport();
    await assertNoOverflow(page);
  });

  test('menu closes on Escape and on navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Toggle navigation' });
    await toggle.click();
    await expect(page.locator('#mobile-nav')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#mobile-nav')).toBeHidden();
    await toggle.click();
    await page.locator('#mobile-nav').getByRole('button', { name: 'About', exact: true }).click();
    await expect(page.locator('#mobile-nav')).toBeHidden();
    await expect(page.locator('#site-menu')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'About & Disclaimer' })).toBeVisible();
  });

  test('focused search text is at least 16px on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    const input = page.getByPlaceholder(/Search a condition/);
    await input.focus();
    const size = await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(16);
  });

  for (const width of [390, 1280]) {
    test(`main flows work at ${width}px`, async ({ page }) => {
      const narrow = width < 1280;
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');

      const homeSearch = page.locator('main form.stack-form');
      await homeSearch.getByRole('searchbox').fill('valvular');
      await homeSearch.getByRole('button', { name: 'Search' }).click();
      await expect(page.getByText(/results for/i)).toBeVisible();
      await page.getByRole('button', { name: /Valvular Disease/ }).click();
      await expect(page.getByRole('heading', { name: 'What the guide says' })).toBeVisible();

      const pathway = page.getByRole('button', { name: /Single Valve Replacement \(Tissue, Mechanical, or Valvuloplasty\)/ });
      await pathway.click();
      await expect(page.getByRole('heading', { name: 'What the guide says' })).toBeVisible();

      const bring = page.locator('section', { has: page.getByRole('heading', { name: 'What to bring' }) });
      const item = bring.getByRole('button').first();
      await item.click();
      await expect(item.locator('div').nth(1).locator('div').first()).toHaveCSS('text-decoration-line', /line-through/);
      await assertNoOverflow(page);

      await goTo(page, 'Conditions', narrow);
      await page.getByPlaceholder('Filter within conditions…').fill('zzzz-none');
      await expect(page.getByText('No conditions match your filter.')).toBeVisible();
      await page.getByPlaceholder('Filter within conditions…').fill('');
      await page.locator('.category-list').getByRole('button', { name: /Neurology|Cardiovascular|All/ }).first().click();
      await assertNoOverflow(page);

      await goTo(page, 'Search', narrow);
      const searchForm = page.locator('main form.stack-form');
      await searchForm.getByRole('searchbox').fill('sertraline');
      await searchForm.getByRole('button', { name: 'Search' }).click();
      await page.getByRole('button', { name: /Sertraline/ }).click();
      await expect(page.getByRole('heading', { name: 'Sertraline', exact: true })).toBeVisible();
      await assertNoOverflow(page);
    });
  }
});
