import { expect, test, type Page } from '@playwright/test';

const answer = (page: Page) => page.locator('.answer .expr');
const cell = (page: Page, m: number) => page.locator('.kmap .cell').filter({ has: page.locator(`.m-no:text-is("${m}")`) });
const composer = (page: Page) => page.getByRole('textbox', { name: 'Function' });
const apply = async (page: Page, text: string) => {
  await composer(page).fill(text);
  await composer(page).press('Enter');
};
const openSettings = async (page: Page) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
};

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

test('the composer takes expressions and adopts new variable names', async ({ page }) => {
  await apply(page, "A'B + AB'");
  await expect(answer(page)).toHaveAttribute('aria-label', 'A prime B, plus, A B prime');
  await apply(page, "w'x + yz");
  await expect(page.locator('.topbar-name')).toHaveText('F(w, x, y, z)');
  await expect(answer(page)).toHaveAttribute('aria-label', 'w prime x, plus, y z');
});

test('the composer takes minterm lists and grows the variable count', async ({ page }) => {
  await apply(page, 'Σm(0, 2, 8, 10)');
  await expect(answer(page)).toHaveAttribute('aria-label', 'B prime D prime');
  await apply(page, 'm(0, 31)');
  await expect(page.getByRole('combobox', { name: 'Number of variables' })).toHaveValue('5');
  await expect(page.locator('.kmap .layer')).toHaveCount(2);
});

test('the composer explains errors and shows how it reads the input', async ({ page }) => {
  await composer(page).fill('m(1, 64)');
  await expect(page.getByText('Reads as minterm list')).toBeVisible();
  await composer(page).press('Enter');
  await expect(page.getByRole('alert')).toContainText('64 is out of range');
  await apply(page, 'A + (B');
  await expect(page.getByRole('alert')).toContainText('Missing ")"');
  await expect(page.getByRole('button', { name: 'Apply function' })).toBeEnabled();
});

test('the truth table edits the same function', async ({ page }) => {
  await page.getByRole('button', { name: 'Clear' }).click();
  await page.getByRole('radio', { name: 'Truth table' }).check();
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

test('examples load from the sidebar, and edited functions appear in Recents', async ({ page }) => {
  await page.getByRole('button', { name: 'Four corners' }).click();
  await expect(answer(page)).toHaveAttribute('aria-label', 'B prime D prime');
  await expect(composer(page)).toHaveValue('Σm(0, 2, 8, 10)');
  const recents = page.getByRole('navigation', { name: 'Recents' });
  await expect(recents.getByText('Functions you work on are saved here.')).toBeVisible();

  await cell(page, 5).click();
  await expect(recents.getByRole('button', { name: /^F = A'BC'D \+ B'D'/ })).toBeVisible();

  await page.getByRole('button', { name: 'New function' }).click();
  await expect(answer(page)).toHaveText('0');
  await recents.getByRole('button', { name: /^F = A'BC'D \+ B'D'/ }).click();
  await expect(cell(page, 5)).toHaveClass(/\bv1\b/);

  await recents.getByRole('button', { name: /Remove/ }).click();
  await expect(recents.getByText('Functions you work on are saved here.')).toBeVisible();
});

test('settings: names, 3-variable layout, cell numbers, and theme', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Number of variables' }).selectOption('3');
  await openSettings(page);
  await page.getByRole('textbox', { name: 'Name of variable 1' }).fill('x');
  await expect(page.locator('.topbar-name')).toHaveText('F(x, B, C)');
  await page.getByRole('combobox', { name: '3-variable map layout' }).selectOption('tall');
  await page.getByRole('tab', { name: 'Appearance' }).click();
  await page.getByRole('switch', { name: 'Show cell numbers' }).click();
  // The theme changes through a view transition (a frame later), so click and wait.
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeHidden();
  await expect(page.locator('.kmap')).toHaveClass(/no-numbers/);
  await expect(page.locator('.kmap .cells').first()).toHaveCSS('grid-template-columns', /^\S+ \S+$/);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('settings: clearing recents asks first', async ({ page }) => {
  await cell(page, 4).click();
  const recents = page.getByRole('navigation', { name: 'Recents' });
  await expect(recents.locator('.recent')).toHaveCount(1);
  await openSettings(page);
  await page.getByRole('tab', { name: 'Data' }).click();
  await page.getByRole('button', { name: 'Clear recents' }).click();
  await page.getByRole('button', { name: 'Clear all' }).click();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(recents.locator('.recent')).toHaveCount(0);
});

test('the sidebar collapses on wide screens and is a drawer on phones', async ({ page }) => {
  await page.getByRole('button', { name: 'Close sidebar' }).click();
  await expect(page.locator('#sidebar')).toBeHidden();
  await page.getByRole('button', { name: 'Open sidebar' }).click();
  await expect(page.locator('#sidebar')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 800 });
  await expect(page.locator('#sidebar')).toBeHidden();
  await page.getByRole('button', { name: 'Open sidebar' }).click();
  await expect(page.locator('#sidebar')).toBeVisible();
  await expect(page.getByRole('button', { name: 'New function' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#sidebar')).toBeHidden();
});

test('the state survives a reload and links reproduce it', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Number of variables' }).selectOption('3');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Number of variables' })).toHaveValue('3');
  await page.goto('./#n=2&f=0110');
  await expect(answer(page)).toHaveAttribute('aria-label', 'A prime B, plus, A B prime');
});

test('remembers the last function between visits', async ({ page }) => {
  await page.getByRole('button', { name: 'Clear' }).click();
  await cell(page, 6).click();
  await page.goto('./');
  await expect(page.locator('.kmap .cell.v1')).toHaveCount(1);
  await expect(cell(page, 6)).toHaveClass(/\bv1\b/);
});

test('5 and 6 variables draw 2 and 4 layers', async ({ page }) => {
  const count = page.getByRole('combobox', { name: 'Number of variables' });
  await count.selectOption('5');
  await expect(page.locator('.kmap .layer')).toHaveCount(2);
  await count.selectOption('6');
  await expect(page.locator('.kmap .layer')).toHaveCount(4);
  await expect(page.locator('.kmap .cell')).toHaveCount(64);
});

test('hovering a term highlights its group on the map, and the reverse', async ({ page }) => {
  await page.locator('.answer .term.linked').nth(1).hover();
  await expect(page.locator('.kmap .loop.dim')).not.toHaveCount(0);
  await expect(page.locator('.kmap .loop.active')).not.toHaveCount(0);
  await page.mouse.move(0, 0);
  await expect(page.locator('.kmap .loop.dim')).toHaveCount(0);
  await cell(page, 15).hover();
  await expect(page.locator('.answer .term.linked.active')).toHaveCount(1);
});

test('the circuit switches style and downloads as SVG', async ({ page }) => {
  await expect(page.locator('.circuit-svg')).toBeVisible();
  await page.getByRole('radio', { name: 'NAND-NAND' }).check();
  await expect(page.locator('.circuit .note')).toContainText('3 gates');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download SVG' }).click();
  expect((await download).suggestedFilename()).toBe('circuit-nand-nand.svg');
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
