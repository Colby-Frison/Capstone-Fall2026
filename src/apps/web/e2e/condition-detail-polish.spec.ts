import { expect, test } from '@playwright/test';

test.describe('Condition detail polish (#47)', () => {
  test('breadcrumb category deep-links into Browse filter', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?condition=valvular-disease');

    const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(crumbs).toBeVisible();
    await expect(crumbs.getByText('Valvular Disease', { exact: true })).toBeVisible();

    await crumbs.getByRole('button', { name: /Browse Cardiovascular conditions/i }).click();
    await expect(page.getByRole('heading', { name: 'Browse Conditions' })).toBeVisible();
    await expect(page).toHaveURL(/category=Cardiovascular/);

    const cardiovascular = page
      .locator('.category-list')
      .getByRole('button')
      .filter({ hasText: 'Cardiovascular' });
    await expect(cardiovascular).toHaveCSS('background-color', 'rgb(27, 45, 79)');
  });

  test('detail sections follow the documented hierarchy', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?condition=valvular-disease');

    const about = page.getByRole('heading', { name: 'About this condition', exact: true });
    const pathways = page.getByRole('heading', { name: 'Which situation matches you', exact: true });
    const guide = page.getByRole('heading', { name: 'What the guide says', exact: true });
    const bring = page.getByRole('heading', { name: 'What to bring', exact: true });
    const source = page.getByRole('heading', { name: 'Where this came from', exact: true });

    await expect(about).toBeVisible();
    await expect(pathways).toBeVisible();
    await expect(guide).toBeVisible();
    await expect(bring).toBeVisible();
    await expect(source).toBeVisible();

    const aboutBox = await about.boundingBox();
    const pathwaysBox = await pathways.boundingBox();
    const guideBox = await guide.boundingBox();
    const bringBox = await bring.boundingBox();
    expect(aboutBox && pathwaysBox && aboutBox.y < pathwaysBox.y).toBeTruthy();
    expect(pathwaysBox && guideBox && pathwaysBox.y < guideBox.y).toBeTruthy();
    expect(guideBox && bringBox && guideBox.y < bringBox.y).toBeTruthy();
  });
});
