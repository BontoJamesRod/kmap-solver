import { expect, test, type Page } from '@playwright/test';

const answer = (page: Page) => page.locator('.answer .expr');
const cell = (page: Page, m: number) => page.locator('.kmap .cell').filter({ has: page.locator(`.m-no:text-is("${m}")`) });

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.goto('./');
});

test('shows the example with both minimal answers', async ({ page }) => {
  await expect(answer(page)).toHaveAttribute('aria-label', 'A prime B prime, plus, C D');
  await expect(page.getByText('Answer 1 of 2')).toBeVisible();
  await page.getByRole('button', { name: 'Next answer' }).click();
  await expect(answer(page)).toHaveAttribute('aria-label', 'A prime D, plus, C D');
  await expect(page.locator('.kmap .loop')).toHaveCount(2);
});

test('clicking cells cycles 0, 1, X and re-solves', async ({ page }) => {
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(answer(page)).toHaveText('0');
  await cell(page, 5).click();
  await expect(cell(page, 5)).toHaveClass(/\bv1\b/);
  await expect(answer(page)).toHaveAttribute('aria-label', 'A prime B C prime D');
  await cell(page, 5).click();
  await expect(cell(page, 5)).toHaveClass(/\bvx\b/);
  await expect(cell(page, 5)).toHaveAccessibleName(/^5 X \(don't-care\), minterm/);
  await cell(page, 5).click();
  await expect(cell(page, 5)).toHaveClass(/\bv0\b/);
});

test('the keyboard moves around the map and sets values', async ({ page }) => {
  await page.getByRole('button', { name: 'Clear' }).click();
  await cell(page, 0).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('1');
  await expect(cell(page, 1)).toHaveClass(/\bv1\b/);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('x');
  await expect(cell(page, 5)).toHaveClass(/\bvx\b/);
});

test('switching to product of sums groups the 0s', async ({ page }) => {
  await page.getByRole('radio', { name: /Product of sums/ }).check();
  await expect(answer(page)).toHaveAttribute('aria-label', /or/);
  await expect(page.getByRole('heading', { name: 'Minimal product of sums' })).toBeVisible();
});

test('typing an expression sets the function, and new variable names are adopted', async ({ page }) => {
  await page.getByRole('tab', { name: 'Expression' }).click();
  const input = page.getByRole('textbox', { name: 'Expression' });
  await input.fill("A'B + AB'");
  await expect(answer(page)).toHaveAttribute('aria-label', 'A prime B, plus, A B prime');
  await input.fill("w'x + yz");
  await expect(page.getByLabel('Name of variable 1')).toHaveValue('w');
  await expect(answer(page)).toHaveAttribute('aria-label', 'w prime x, plus, y z');
  await input.fill('w + (x');
  await expect(page.getByRole('alert')).toContainText('Missing ")"');
});

test('minterm lists validate their input', async ({ page }) => {
  const minterms = page.getByLabel('Minterms', { exact: true });
  await minterms.fill('0, 2, 8, 10');
  await page.getByLabel("Don't-cares").fill('');
  await expect(answer(page)).toHaveAttribute('aria-label', 'B prime D prime');
  await minterms.fill('0, 16');
  await expect(page.getByRole('alert')).toContainText('16 is out of range');
});

test('the truth table edits the same function', async ({ page }) => {
  await page.getByRole('button', { name: 'Clear' }).click();
  await page.getByRole('tab', { name: 'Truth table' }).click();
  await page.getByRole('button', { name: 'Output for minterm 15: 0' }).click();
  await expect(answer(page)).toHaveAttribute('aria-label', 'A B C D');
});

test('check my answer: wrong, not minimal, and minimal', async ({ page }) => {
  const box = page.getByPlaceholder(/Type your answer/);
  await box.fill("A'B' + C");
  await expect(page.locator('.verdict')).toContainText('Not equivalent to F');
  await expect(page.locator('.cell.wrong')).not.toHaveCount(0);
  await box.fill("A'B' + CD + A'D");
  await expect(page.locator('.verdict')).toContainText('Correct, but not minimal');
  await box.fill("A'D + CD");
  await expect(page.locator('.verdict')).toContainText('Correct and minimal');
  await expect(page.locator('.cell.wrong')).toHaveCount(0);
});

test('the state survives a reload and links reproduce it', async ({ page }) => {
  await page.getByRole('radio', { name: '3' }).check({ force: true });
  await page.getByRole('radio', { name: 'AB × C' }).check();
  await page.reload();
  await expect(page.getByRole('radio', { name: '3' })).toBeChecked();
  await expect(page.locator('.kmap .cells').first()).toHaveCSS('grid-template-columns', /^\S+ \S+$/);

  await page.goto('./#n=2&f=0110');
  await expect(answer(page)).toHaveAttribute('aria-label', 'A prime B, plus, A B prime');
});

test('5 and 6 variables draw 2 and 4 layers', async ({ page }) => {
  await page.getByRole('radio', { name: '5' }).check({ force: true });
  await expect(page.locator('.kmap .layer')).toHaveCount(2);
  await page.getByRole('radio', { name: '6' }).check({ force: true });
  await expect(page.locator('.kmap .layer')).toHaveCount(4);
  await expect(page.locator('.kmap .cell')).toHaveCount(64);
});

test('the circuit switches style and downloads as SVG', async ({ page }) => {
  await expect(page.locator('.circuit-svg')).toBeVisible();
  await page.getByRole('radio', { name: 'NAND-NAND' }).check();
  await expect(page.locator('.circuit .note')).toContainText('3 gates');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download SVG' }).click();
  expect((await download).suggestedFilename()).toBe('circuit-nand-nand.svg');
});

test('the theme toggle switches to dark', async ({ page }) => {
  await page.getByRole('button', { name: /Theme/ }).click(); // auto -> light
  await page.getByRole('button', { name: /Theme/ }).click(); // light -> dark
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

for (const n of [4, 5, 6]) {
  test(`no sideways scrolling on a 360 px phone with ${n} variables`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    const values = Array.from({ length: 1 << n }, (_, m) => (m.toString(2).split('1').length % 2 ? '1' : '0')).join('');
    await page.goto(`./#n=${n}&f=${values}`);
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('hovering a term highlights its group on the map, and the reverse', async ({ page }) => {
  await page.locator('.answer .term.linked').nth(1).hover();
  await expect(page.locator('.kmap .loop.dim')).not.toHaveCount(0);
  await expect(page.locator('.kmap .loop.active')).not.toHaveCount(0);
  await page.mouse.move(0, 0);
  await expect(page.locator('.kmap .loop.dim')).toHaveCount(0);
  await cell(page, 15).hover();
  await expect(page.locator('.answer .term.linked.active')).toHaveCount(1);
});

test('remembers the last function between visits', async ({ page }) => {
  await page.getByRole('button', { name: 'Clear' }).click();
  await cell(page, 6).click();
  await page.goto('./'); // no hash: comes from saved state
  await expect(page.locator('.kmap .cell.v1')).toHaveCount(1);
  await expect(cell(page, 6)).toHaveClass(/\bv1\b/);
});
