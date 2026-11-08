import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = [
  { name: 'default example', hash: '' },
  { name: '6 variables', hash: '#n=6&f=' + Array.from({ length: 64 }, (_, m) => (m % 3 === 0 ? '1' : m % 5 === 0 ? 'x' : '0')).join('') },
  { name: 'product of sums', hash: '#n=3&f=01101110&m=pos&l=tall' },
];

for (const scheme of ['light', 'dark'] as const) {
  for (const p of pages) {
    test(`no accessibility violations: ${p.name}, ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto(`./${p.hash}`);
      await page.waitForTimeout(300);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const summary = results.violations.map((v) => `${v.id}: ${v.nodes.length} (${v.nodes[0]?.target.join(' ')})`);
      expect(summary).toEqual([]);
    });
  }
}

for (const scheme of ['light', 'dark'] as const) {
  test(`no accessibility violations: settings dialog, every section, ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.goto('./');
    await page.getByRole('button', { name: 'Settings' }).click();
    for (const tab of ['General', 'Appearance', 'Circuit', 'Data', 'About']) {
      await page.getByRole('tab', { name: tab }).click();
      const results = await new AxeBuilder({ page }).include('dialog').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(results.violations.map((v) => `${tab} ${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
    }
  });
}

test('no accessibility violations: phone drawer open', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.getByRole('button', { name: 'Open sidebar' }).click();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
});

test('a wrong answer is announced and marked without relying on color', async ({ page }) => {
  await page.goto('./');
  await page.getByPlaceholder(/Type your answer/).fill("A'B' + C");
  const wrong = page.locator('.cell.wrong').first();
  await expect(wrong).toHaveAccessibleName(/your answer is wrong here/);
  // Marked by a pattern and a "!" as well as color.
  expect(await wrong.evaluate((e) => getComputedStyle(e, '::after').content)).toContain('!');
  expect(await wrong.evaluate((e) => getComputedStyle(e).backgroundImage)).toContain('repeating-linear-gradient');
});
