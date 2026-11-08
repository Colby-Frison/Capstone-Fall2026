import { expect, test } from '@playwright/test';

test.describe('Condition detail NIH context (#33)', () => {
  test('mapped condition shows About this condition and educational links', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?condition=valvular-disease');

    await expect(
      page.getByRole('heading', { name: 'About this condition', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Common medical name')).toBeVisible();
    await expect(page.getByText(/Valvular heart disease/i).first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Related educational links \(NIH\)/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'What the guide says', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/not medical or legal advice/i).first()).toBeVisible();
  });

  test('unmapped condition shows graceful notice without fake medical blurb', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?condition=allergies');

    await expect(
      page.getByRole('heading', { name: 'About this condition', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/No NIH educational summary is mapped/i),
    ).toBeVisible();
    await expect(page.getByText('Common medical name')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: /Related educational links \(NIH\)/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Search conditions', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Browse catalog', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'What the guide says', exact: true }),
    ).toBeVisible();
  });
});
