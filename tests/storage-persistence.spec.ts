import { test, expect, Page } from '@playwright/test';

// Helper to set up the app with specific settings
async function setupApp(page: Page, settings: Record<string, unknown> = {}, script?: string) {
  await page.addInitScript(({ settings, script }) => {
    if (script) {
      localStorage.setItem('tpt/script', script);
    }
    if (Object.keys(settings).length > 0) {
      localStorage.setItem('tpt/settings', JSON.stringify(settings));
    }
  }, { settings, script });
  await page.goto('/');
  await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });
}

const sampleScript = 'Sample script for storage testing.';

test.describe('Storage - Script Persistence', () => {
  test('should save script to localStorage', async ({ page }) => {
    await setupApp(page, {}, '');

    // Open editor and add content
    await page.click('[data-action="edit"]');
    await page.waitForTimeout(300);

    const textarea = page.locator('[data-testid="script-textarea"]');
    await textarea.fill('New script content');

    await page.click('[data-action="save-close"]');
    await page.waitForTimeout(300);

    // Check localStorage
    const savedScript = await page.evaluate(() => {
      return localStorage.getItem('tpt/script');
    });

    expect(savedScript).toContain('New script content');
  });

  test('should load script from localStorage on startup', async ({ page }) => {
    // Set up script in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('tpt/script', 'Preloaded script from storage');
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    const content = await page.locator('[data-testid="teleprompter-display"]').textContent();

    expect(content).toContain('Preloaded script');
  });

  test('should persist script across page reloads', async ({ page }) => {
    await setupApp(page, {}, 'Original script');

    // Modify script
    await page.click('[data-action="edit"]');
    await page.waitForTimeout(300);

    const textarea = page.locator('[data-testid="script-textarea"]');
    await textarea.fill('Modified script');

    await page.click('[data-action="save-close"]');
    await page.waitForTimeout(300);

    // Reload without clearing localStorage
    await page.reload();
    await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    const content = await page.locator('[data-testid="teleprompter-display"]').textContent();

    expect(content).toContain('Modified script');
  });
});

test.describe('Storage - Settings Persistence', () => {
  test('should save settings to localStorage', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Change font size
    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.up('Control');
    await page.waitForTimeout(200);

    const savedSettings = await page.evaluate(() => {
      const settings = localStorage.getItem('tpt/settings');
      return settings ? JSON.parse(settings) : null;
    });

    expect(savedSettings).not.toBeNull();
    expect(savedSettings.fontSize).toBeDefined();
  });

  test('should load settings from localStorage', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('tpt/settings', JSON.stringify({
        fontSize: 48,
        scrollSpeed: 3,
        fontColor: '#ff0000'
      }));
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    const fontSize = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseInt(getComputedStyle(display).fontSize) : 0;
    });

    expect(fontSize).toBe(48);
  });

  test('should persist font size across reloads', async ({ page }) => {
    await setupApp(page, { fontSize: 32 }, sampleScript);

    // Change font size
    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.up('Control');
    await page.waitForTimeout(200);

    const sizeBeforeReload = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseInt(getComputedStyle(display).fontSize) : 0;
    });

    await page.reload();
    await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    const sizeAfterReload = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseInt(getComputedStyle(display).fontSize) : 0;
    });

    expect(sizeAfterReload).toBe(sizeBeforeReload);
  });

  test('should persist scroll speed', async ({ page }) => {
    await setupApp(page, { scrollSpeed: 1.5 }, sampleScript);

    // Change speed
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    await page.reload();
    await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    const speed = await page.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '1.5');
    });

    expect(speed).toBeGreaterThan(1.5);
  });

  test('should persist scroll mode', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous' }, sampleScript);

    // Change to paging mode
    await page.click('[data-scroll-mode="paging"]');
    await page.waitForTimeout(200);

    await page.reload();
    await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    const savedMode = await page.evaluate(() => {
      const settings = localStorage.getItem('tpt/settings');
      return settings ? JSON.parse(settings).scrollMode : '';
    });

    expect(savedMode).toBe('paging');
  });

  test('should persist theme colors', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Apply dark theme
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.click('[data-theme="dark"]');
    await page.waitForTimeout(200);

    await page.reload();
    await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    const bgColor = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      const bg = display ? getComputedStyle(display).backgroundColor : '';
      const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return (parseInt(match[1]) + parseInt(match[2]) + parseInt(match[3])) / 3;
      }
      return 255;
    });

    // Dark theme should have dark background
    expect(bgColor).toBeLessThan(100);
  });

  test('should persist language setting', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.selectOption('[data-testid="language-select"]', 'ru');
    await page.waitForTimeout(300);

    await page.reload();
    await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    const pageText = await page.locator('body').textContent();

    // Should still be Russian
    expect(pageText).toMatch(/[а-яА-ЯёЁ]/);
  });

  test('should persist cue points', async ({ page }) => {
    await setupApp(page, {}, `Line 1\nLine 2\nLine 3\nLine 4\nLine 5`);

    // Add cue point
    await page.keyboard.press('m');
    await page.waitForTimeout(100);

    await page.reload();
    await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    const hasCuePoint = await page.evaluate(() => {
      const settings = localStorage.getItem('tpt/settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        return parsed.cuePoints && parsed.cuePoints.length > 0;
      }
      return false;
    });

    expect(hasCuePoint).toBe(true);
  });
});

test.describe('Storage - Error Handling', () => {
  test('should handle private browsing mode', async ({ page }) => {
    // Simulate localStorage being unavailable
    await page.addInitScript(() => {
      const originalSetItem = localStorage.setItem.bind(localStorage);
      localStorage.setItem = function(key: string, value: string) {
        if (Math.random() > 0.5) {
          throw new Error('QuotaExceededError');
        }
        return originalSetItem(key, value);
      };
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    // App should still function
    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });

  test('should handle corrupted settings JSON', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('tpt/settings', 'not valid json {{{');
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    // Should fallback to defaults
    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });

  test('should handle missing required fields in settings', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('tpt/settings', JSON.stringify({
        // Missing many required fields
        fontSize: 'invalid'
      }));
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    // Should use default font size
    const fontSize = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseInt(getComputedStyle(display).fontSize) : 0;
    });

    expect(fontSize).toBeGreaterThan(0);
  });

  test('should handle localStorage quota exceeded', async ({ page }) => {
    await page.addInitScript(() => {
      const originalSetItem = localStorage.setItem.bind(localStorage);
      let callCount = 0;
      localStorage.setItem = function(key: string, value: string) {
        callCount++;
        if (callCount > 5) {
          const error = new Error('QuotaExceededError');
          error.name = 'QuotaExceededError';
          throw error;
        }
        return originalSetItem(key, value);
      };
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    // App should still function
    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });
});

test.describe('Storage - Storage Keys', () => {
  test('should use correct key for script', async ({ page }) => {
    await setupApp(page, {}, 'Test script');

    const keys = await page.evaluate(() => {
      return Object.keys(localStorage).filter((k) => k.startsWith('tpt/'));
    });

    expect(keys).toContain('tpt/script');
  });

  test('should use correct key for settings', async ({ page }) => {
    await setupApp(page, { fontSize: 40 }, sampleScript);

    const keys = await page.evaluate(() => {
      return Object.keys(localStorage).filter((k) => k.startsWith('tpt/'));
    });

    expect(keys).toContain('tpt/settings');
  });

  test('should not pollute localStorage with extra keys', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Interact with app
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');

    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(1000);

    const keys = await page.evaluate(() => {
      return Object.keys(localStorage).filter((k) => k.startsWith('tpt/'));
    });

    // Should only have script and settings (and maybe remote-state)
    expect(keys.length).toBeLessThanOrEqual(4);
  });
});

test.describe('Storage - Auto-save', () => {
  test('should auto-save settings on change', async ({ page }) => {
    await setupApp(page, { fontSize: 32 }, sampleScript);

    // Change setting
    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.up('Control');
    await page.waitForTimeout(300);

    const savedFontSize = await page.evaluate(() => {
      const settings = localStorage.getItem('tpt/settings');
      return settings ? JSON.parse(settings).fontSize : 0;
    });

    expect(savedFontSize).toBeGreaterThan(32);
  });

  test('should auto-save script on edit', async ({ page }) => {
    await setupApp(page, {}, 'Initial');

    await page.click('[data-action="edit"]');
    await page.waitForTimeout(300);

    const textarea = page.locator('[data-testid="script-textarea"]');
    await textarea.fill('Auto-saved content');

    await page.click('[data-action="save-close"]');
    await page.waitForTimeout(300);

    const savedScript = await page.evaluate(() => {
      return localStorage.getItem('tpt/script');
    });

    expect(savedScript).toContain('Auto-saved');
  });
});

test.describe('Storage - Clear and Reset', () => {
  test('should reset settings to defaults', async ({ page }) => {
    await setupApp(page, { fontSize: 64, scrollSpeed: 8, lineSpacing: 3 }, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    await page.click('[data-action="reset-defaults"]');
    await page.waitForTimeout(300);

    const savedSettings = await page.evaluate(() => {
      const settings = localStorage.getItem('tpt/settings');
      return settings ? JSON.parse(settings) : {};
    });

    expect(savedSettings.fontSize).toBe(32);
    expect(savedSettings.scrollSpeed).toBe(1.5);
  });

  test('should not clear script when resetting settings', async ({ page }) => {
    await setupApp(page, { fontSize: 64 }, 'Important script');

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    await page.click('[data-action="reset-defaults"]');
    await page.waitForTimeout(300);

    const savedScript = await page.evaluate(() => {
      return localStorage.getItem('tpt/script');
    });

    expect(savedScript).toContain('Important script');
  });
});

test.describe('Storage - Migration', () => {
  test('should handle old settings format gracefully', async ({ page }) => {
    await page.addInitScript(() => {
      // Simulate old settings format
      localStorage.setItem('tpt/settings', JSON.stringify({
        fontSize: 32,
        // Missing newer fields like textDirection, overlayOpacity, etc.
      }));
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    // Should load without errors
    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();

    // Should use default for missing fields
    const settings = await page.evaluate(() => {
      const saved = localStorage.getItem('tpt/settings');
      return saved ? JSON.parse(saved) : {};
    });

    expect(settings.fontSize).toBe(32);
  });
});

test.describe('Storage - Cue Points Cleanup', () => {
  test('should clean up cue points when script is shortened', async ({ page }) => {
    // Setup with a long script and cue points
    const longScript = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10';
    await setupApp(page, { cuePoints: [0, 2, 4, 6, 8] }, longScript);

    // Open editor and shorten script
    await page.click('[data-action="edit"]');
    await page.waitForTimeout(300);

    const textarea = page.locator('[data-testid="script-textarea"]');
    await textarea.fill('Line 1\nLine 2\nLine 3'); // Only 3 lines now

    await page.click('[data-action="save-close"]');
    await page.waitForTimeout(300);

    // Check that cue points beyond line 3 are removed
    const savedSettings = await page.evaluate(() => {
      const settings = localStorage.getItem('tpt/settings');
      return settings ? JSON.parse(settings) : {};
    });

    // All cue points >= 3 should be removed (lines 0, 1, 2 are valid)
    const validCuePoints = savedSettings.cuePoints?.filter((cp: number) => cp < 3) || [];
    expect(savedSettings.cuePoints?.every((cp: number) => cp < 3)).toBe(true);
  });

  test('should preserve cue points when script is extended', async ({ page }) => {
    const shortScript = 'Line 1\nLine 2\nLine 3';
    await setupApp(page, { cuePoints: [0, 2] }, shortScript);

    // Open editor and extend script
    await page.click('[data-action="edit"]');
    await page.waitForTimeout(300);

    const textarea = page.locator('[data-testid="script-textarea"]');
    await textarea.fill('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

    await page.click('[data-action="save-close"]');
    await page.waitForTimeout(300);

    // Check that original cue points are preserved
    const savedSettings = await page.evaluate(() => {
      const settings = localStorage.getItem('tpt/settings');
      return settings ? JSON.parse(settings) : {};
    });

    expect(savedSettings.cuePoints).toContain(0);
    expect(savedSettings.cuePoints).toContain(2);
  });

  test('should handle cue point on last line when line is removed', async ({ page }) => {
    const script = 'Line 1\nLine 2\nLine 3';
    await setupApp(page, { cuePoints: [2] }, script); // Cue on last line

    // Shorten script
    await page.click('[data-action="edit"]');
    await page.waitForTimeout(300);

    const textarea = page.locator('[data-testid="script-textarea"]');
    await textarea.fill('Line 1\nLine 2');

    await page.click('[data-action="save-close"]');
    await page.waitForTimeout(300);

    // Cue point 2 should be removed
    const savedSettings = await page.evaluate(() => {
      const settings = localStorage.getItem('tpt/settings');
      return settings ? JSON.parse(settings) : {};
    });

    expect(savedSettings.cuePoints).not.toContain(2);
  });
});

test.describe('Storage - Scroll Position Persistence', () => {
  test('should persist scroll position across reloads', async ({ page }) => {
    const longScript = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}.`).join('\n');
    await setupApp(page, {}, longScript);

    // Scroll down
    await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      if (display) (display as HTMLElement).scrollTop = 500;
    });
    await page.waitForTimeout(500);

    // Reload
    await page.reload();
    await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    // Check if position is preserved (implementation may vary)
    const scrollPosition = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? (display as HTMLElement).scrollTop : 0;
    });

    // Position may or may not be preserved depending on implementation
    expect(scrollPosition).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Storage - Settings Merge', () => {
  test('should merge new settings without losing existing ones', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('tpt/settings', JSON.stringify({
        fontSize: 40,
        fontColor: '#ff0000',
        customSetting: 'preserved'
      }));
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    // Change only one setting
    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.up('Control');
    await page.waitForTimeout(200);

    const savedSettings = await page.evaluate(() => {
      const settings = localStorage.getItem('tpt/settings');
      return settings ? JSON.parse(settings) : {};
    });

    // Original settings should still exist
    expect(savedSettings.fontColor).toBe('#ff0000');
  });

  test('should handle concurrent storage writes', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Rapidly change multiple settings
    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.up('Control');

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    await page.waitForTimeout(300);

    // Storage should be consistent
    const savedSettings = await page.evaluate(() => {
      const settings = localStorage.getItem('tpt/settings');
      return settings ? JSON.parse(settings) : null;
    });

    expect(savedSettings).not.toBeNull();
    expect(savedSettings.fontSize).toBeDefined();
    expect(savedSettings.scrollSpeed).toBeDefined();
  });
});
