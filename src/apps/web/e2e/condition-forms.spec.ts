import { expect, test } from '@playwright/test';

const PACEMAKER_PDF = 'https://www.faa.gov/ame_guide/media/Pacemaker_Status_Summary.pdf';

test.describe('Condition forms (#43)', () => {
  test('shows a summarised form card next to the checklist', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?condition=pacemaker');

    await expect(
      page.getByRole('heading', { name: 'Forms for this situation', exact: true }),
    ).toBeVisible();

    const card = page
      .getByTestId('situation-forms')
      .getByTestId('form-card')
      .filter({ hasText: 'Pacemaker Status Summary' });
    await expect(card).toBeVisible();
    await expect(card.getByText(/Filled in by: Your heart doctor/)).toBeVisible();
    const cardLink = card.getByRole('link');
    await expect(cardLink).toContainText('Download PDF');
    await expect(cardLink).toHaveAttribute('href', PACEMAKER_PDF);
    await expect(cardLink).toHaveAttribute('target', '_blank');

    await expect(page.getByRole('heading', { name: 'Related FAA Forms' })).toHaveCount(0);
  });

  test('checklist items that have a url render as working links', async ({ page, request }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?condition=pacemaker');

    const link = page.locator('[data-testid="checklist-form-link"][data-form-id="pacemaker-status-summary"]').first();
    await expect(link).toBeVisible();
    await expect(link).toContainText('Download PDF');
    await expect(link).toHaveAttribute('href', PACEMAKER_PDF);

    // The link is inside the app; the PDF itself must also answer on faa.gov.
    const response = await request.head(PACEMAKER_PDF, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0 Safari/537.36' },
    });
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('pdf');
  });

  test('forms follow the selected situation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?condition=pacemaker');

    const situationForms = page.getByTestId('situation-forms').getByTestId('form-card');
    const before = await situationForms.evaluateAll((cards) => cards.map((c) => c.getAttribute('data-form-id')));
    await page.getByRole('button', { name: /Implantable Cardiac Defibrillator/i }).first().click();
    await expect
      .poll(async () =>
        page.getByTestId('situation-forms').getByTestId('form-card').evaluateAll((cards) =>
          cards.map((c) => c.getAttribute('data-form-id')),
        ),
      )
      .not.toEqual(before);
  });

  test('form cards fit a phone screen without sideways scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/?condition=pacemaker');

    await expect(page.getByTestId('form-card').first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe('Forms & Documents page (#43)', () => {
  test('lists every form, filters by type and search, and links to conditions', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Forms', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Forms & Documents', level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/\?page=forms$/);
    await expect(page.getByTestId('form-card')).toHaveCount(27);

    await page.getByRole('button', { name: /^Questionnaires/ }).click();
    await expect(page.getByTestId('form-card')).toHaveCount(4);

    await page.getByRole('button', { name: /^All \(/ }).click();
    await page.getByRole('searchbox', { name: 'Search forms or conditions' }).fill('pacemaker');
    const cards = page.getByTestId('form-card');
    await expect(cards.filter({ hasText: 'Pacemaker Status Summary' })).toBeVisible();
    await expect(cards.filter({ hasText: 'Berlin Questionnaire' })).toHaveCount(0);

    await cards
      .filter({ hasText: 'Pacemaker Status Summary' })
      .getByRole('button', { name: 'Pacemaker', exact: true })
      .click();
    await expect(page).toHaveURL(/\?condition=pacemaker$/);
  });

  test('site search finds a form', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?page=forms');
    const search = page.getByRole('banner').getByRole('combobox').or(page.getByRole('banner').getByRole('searchbox')).first();
    await search.fill('COPD status summary');
    await search.press('Enter');

    const hit = page.getByTestId('search-hit-form-copd-status-summary');
    await expect(hit).toBeVisible();
    await expect(hit).toHaveAttribute('href', 'https://www.faa.gov/ame_guide/media/COPD_Status_Summary.pdf');
  });
});
