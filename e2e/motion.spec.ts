import { expect, test, type Page } from '@playwright/test';

const cell = (page: Page, m: number) => page.locator('.kmap .cell').filter({ has: page.locator(`.m-no:text-is("${m}")`) });

async function runningAnimations(page: Page, selector: string): Promise<number> {
  return page.locator(selector).first().evaluate((el) => el.getAnimations({ subtree: true }).length);
}

async function animationMs(page: Page, selector: string): Promise<number> {
  return page.locator(selector).first().evaluate((el) => parseFloat(getComputedStyle(el).animationDuration) * 1000);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.goto('./');
});

test('a cell that becomes 1 pops and bursts', async ({ page }) => {
  await page.getByRole('button', { name: 'Clear' }).click();
  await page.waitForTimeout(1000); // let the first ripple finish
  await cell(page, 5).click();
  await expect(cell(page, 5).locator('.val.pop')).toHaveCount(1);
  await expect(cell(page, 5).locator('.burst')).toHaveCount(1);
  expect(await animationMs(page, '.burst')).toBeGreaterThan(300);
});

test('toggles slide a pill to the selected option', async ({ page }) => {
  const seg = page.locator('.result .segmented');
  await expect(seg).toHaveAttribute('data-indicator', '');
  const before = await seg.evaluate((el) => el.style.getPropertyValue('--ind-x'));
  await page.getByRole('radio', { name: /Product of sums/ }).check();
  await expect.poll(() => seg.evaluate((el) => el.style.getPropertyValue('--ind-x'))).not.toBe(before);
});

test('counts roll and settle on the new value', async ({ page }) => {
  await page.getByRole('button', { name: 'Next answer' }).click();
  await expect(page.locator('.roll-in').first()).toBeAttached();
  await expect(page.locator('.picker > span[aria-live]')).toHaveText('Answer 2 of 2');
});

test('sharing confirms with a toast that is announced', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Share' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Link copied to clipboard' })).toBeAttached();
  await expect(page.locator('.toast')).toContainText('Link copied to clipboard');
  await expect(page.locator('.toast')).toHaveCount(0, { timeout: 5000 });
});

test('a toast shows above the settings dialog', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('tab', { name: 'Data' }).click();
  await page.getByRole('button', { name: 'Reset' }).click();
  const toast = page.locator('.toast');
  await expect(toast).toContainText('Settings reset');
  await expect(page.locator('.toasts')).toHaveJSProperty('popover', 'manual');
  expect(await page.locator('.toasts').evaluate((el) => el.matches(':popover-open'))).toBe(true);
  // It sits in the top layer, opened after the dialog, so it paints above it. (Hit-testing
  // can't confirm this: a modal dialog makes everything outside it inert.)
  await expect(toast).toBeVisible();
});

test('invalid input shakes the composer', async ({ page }) => {
  const box = page.getByRole('textbox', { name: 'Function' });
  await box.fill('A + (B');
  await box.press('Enter');
  expect(await runningAnimations(page, '.composer')).toBeGreaterThan(0);
});

test('the Animations setting turns motion off', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('tab', { name: 'Appearance' }).click();
  await page.getByRole('switch', { name: 'Animations' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Clear' }).click();
  await cell(page, 5).click();
  expect(await animationMs(page, '.val.pop')).toBeLessThan(1);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
});

test('reduced motion turns motion off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  expect(await animationMs(page, '.kmap .loop')).toBeLessThan(1);
  await page.getByRole('button', { name: 'Clear' }).click();
  await cell(page, 5).click();
  expect(await animationMs(page, '.val.pop')).toBeLessThan(1);
});
