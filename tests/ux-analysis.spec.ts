import { test } from '@playwright/test';
import { setupApp, generateScript } from './utils/test-helpers';

const modes = ['continuous', 'paging', 'voice', 'rsvp'] as const;

test.describe('UX Visual Check', () => {
  for (const mode of modes) {
    test(`${mode} mode portrait`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await setupApp(page, { scrollMode: mode }, generateScript(20));
      await page.waitForTimeout(300);
      await page.screenshot({ path: `test-results/ux-${mode}-portrait.png` });
    });
  }

  test('landscape all modes', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await setupApp(page, { scrollMode: 'continuous' }, generateScript(20));
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'test-results/ux-landscape.png' });
  });
});
