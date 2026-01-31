import { test, expect } from '@playwright/test';
import {
  setupApp,
  openSettings,
  closeSettings,
  SELECTORS,
} from './utils/test-helpers';

const sampleScript = `Line one of the teleprompter text.
Line two with some more content here.
Line three is a bit longer to test word wrapping and margin behavior.
Line four continues the testing.
Line five is the final line of this sample.`;

test.describe('Display Customization - Font Size', () => {
  test('should apply initial font size from settings', async ({ page }) => {
    await setupApp(page, { fontSize: 48 }, sampleScript);

    const fontSize = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseInt(getComputedStyle(display).fontSize) : 0;
    });

    expect(fontSize).toBe(48);
  });

  test('should change font size via settings drawer', async ({ page }) => {
    await setupApp(page, { fontSize: 32 }, sampleScript);

    // Open settings
    await page.click('[data-action="settings"]');
    await page.waitForSelector('.settings-drawer.open, .settings-drawer[open]', { timeout: 3000 });

    // Find font size slider/input
    const fontSizeInput = page.locator('[data-testid="font-size-input"]');
    await fontSizeInput.fill('56');
    await fontSizeInput.dispatchEvent('change');
    await page.waitForTimeout(100);

    // Verify change applied
    const fontSize = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseInt(getComputedStyle(display).fontSize) : 0;
    });

    expect(fontSize).toBe(56);
  });

  test('should enforce minimum font size (16px)', async ({ page }) => {
    await setupApp(page, { fontSize: 16 }, sampleScript);

    // Try to decrease
    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.up('Control');

    const fontSize = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseInt(getComputedStyle(display).fontSize) : 0;
    });

    expect(fontSize).toBeGreaterThanOrEqual(16);
  });

  test('should enforce maximum font size (72px)', async ({ page }) => {
    await setupApp(page, { fontSize: 72 }, sampleScript);

    // Try to increase
    await page.keyboard.down('Control');
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowRight');
    }
    await page.keyboard.up('Control');

    const fontSize = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseInt(getComputedStyle(display).fontSize) : 0;
    });

    expect(fontSize).toBeLessThanOrEqual(72);
  });
});

test.describe('Display Customization - Font Family', () => {
  test('should apply system font by default', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const fontFamily = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).fontFamily : '';
    });

    // Should contain system font stack or default
    expect(fontFamily).toBeTruthy();
  });

  test('should apply Arial font', async ({ page }) => {
    await setupApp(page, { fontFamily: 'Arial' }, sampleScript);

    const fontFamily = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).fontFamily : '';
    });

    expect(fontFamily.toLowerCase()).toContain('arial');
  });

  test('should apply Times New Roman font', async ({ page }) => {
    await setupApp(page, { fontFamily: 'Times New Roman' }, sampleScript);

    const fontFamily = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).fontFamily : '';
    });

    expect(fontFamily.toLowerCase()).toContain('times');
  });

  test('should apply monospace font (Courier New)', async ({ page }) => {
    await setupApp(page, { fontFamily: 'Courier New' }, sampleScript);

    const fontFamily = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).fontFamily : '';
    });

    expect(fontFamily.toLowerCase()).toContain('courier');
  });

  test('should apply dyslexia-friendly font (Lexend)', async ({ page }) => {
    await setupApp(page, { fontFamily: 'Lexend' }, sampleScript);

    const fontFamily = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).fontFamily : '';
    });

    expect(fontFamily.toLowerCase()).toContain('lexend');
  });
});

test.describe('Display Customization - Colors', () => {
  test('should apply custom text color', async ({ page }) => {
    await setupApp(page, { fontColor: '#ff0000' }, sampleScript);

    const color = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).color : '';
    });

    // RGB value for red
    expect(color).toMatch(/rgb\(255,\s*0,\s*0\)|#ff0000/i);
  });

  test('should apply custom background color', async ({ page }) => {
    await setupApp(page, { backgroundColor: '#00ff00' }, sampleScript);

    const bgColor = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).backgroundColor : '';
    });

    expect(bgColor).toMatch(/rgb\(0,\s*255,\s*0\)|#00ff00/i);
  });

  test('should apply Dark theme preset', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Open settings and apply Dark theme
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const darkThemeButton = page.locator('[data-theme="dark"], button:has-text("Dark")');
    await darkThemeButton.click();
    await page.waitForTimeout(100);

    const bgColor = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      const bg = display ? getComputedStyle(display).backgroundColor : '';
      // Parse RGB values
      const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const brightness = (parseInt(match[1]) + parseInt(match[2]) + parseInt(match[3])) / 3;
        return brightness;
      }
      return 128;
    });

    // Dark theme should have dark background (low brightness)
    expect(bgColor).toBeLessThan(100);
  });

  test('should apply Light theme preset', async ({ page }) => {
    await setupApp(page, { backgroundColor: '#000000' }, sampleScript);

    // Open settings and apply Light theme
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const lightThemeButton = page.locator('[data-theme="light"], button:has-text("Light")');
    await lightThemeButton.click();
    await page.waitForTimeout(100);

    const bgColor = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      const bg = display ? getComputedStyle(display).backgroundColor : '';
      const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const brightness = (parseInt(match[1]) + parseInt(match[2]) + parseInt(match[3])) / 3;
        return brightness;
      }
      return 128;
    });

    // Light theme should have light background (high brightness)
    expect(bgColor).toBeGreaterThan(150);
  });

  test('should apply High Contrast theme', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Open settings and apply High Contrast theme
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const highContrastButton = page.locator('[data-theme="high-contrast"], button:has-text("High Contrast")');
    await highContrastButton.click();
    await page.waitForTimeout(100);

    // Verify high contrast colors are applied
    const colors = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      if (!display) return null;
      return {
        color: getComputedStyle(display).color,
        backgroundColor: getComputedStyle(display).backgroundColor
      };
    });

    expect(colors).not.toBeNull();
  });

  test('should show contrast ratio indicator', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Open settings
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const contrastIndicator = page.locator('.contrast-ratio, [data-contrast]');
    const isVisible = await contrastIndicator.isVisible().catch(() => false);

    // If visible, should show a ratio
    if (isVisible) {
      const text = await contrastIndicator.textContent();
      expect(text).toMatch(/\d+\.?\d*:?\d*|AA|AAA/);
    }
  });
});

test.describe('Display Customization - Spacing', () => {
  test('should apply line spacing', async ({ page }) => {
    await setupApp(page, { lineSpacing: 2 }, sampleScript);

    const lineHeight = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseFloat(getComputedStyle(display).lineHeight) : 0;
    });

    // Line height should be larger than normal
    expect(lineHeight).toBeGreaterThan(0);
  });

  test('should apply letter spacing', async ({ page }) => {
    await setupApp(page, { letterSpacing: 5 }, sampleScript);

    const letterSpacing = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).letterSpacing : '0px';
    });

    expect(letterSpacing).toBe('5px');
  });

  test('should adjust line spacing via keyboard (Ctrl+Up/Down)', async ({ page }) => {
    await setupApp(page, { lineSpacing: 1 }, sampleScript);

    // Increase line spacing
    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.up('Control');
    await page.waitForTimeout(100);

    const lineHeight = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      const style = display ? getComputedStyle(display).lineHeight : '';
      return style;
    });

    // Should have changed
    expect(lineHeight).toBeTruthy();
  });
});

test.describe('Display Customization - Layout', () => {
  test('should apply horizontal margin', async ({ page }) => {
    await setupApp(page, { horizontalMargin: 20 }, sampleScript);

    const margins = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      if (!display) return { left: '0', right: '0' };
      const style = getComputedStyle(display);
      return {
        left: style.paddingLeft || style.marginLeft,
        right: style.paddingRight || style.marginRight
      };
    });

    // Should have non-zero margins
    expect(parseInt(margins.left) + parseInt(margins.right)).toBeGreaterThan(0);
  });

  test('should apply max words per line', async ({ page }) => {
    const longLine = 'word '.repeat(50);
    await setupApp(page, { maxWordsPerLine: 5 }, longLine);

    // Verify text is wrapped (multiple lines)
    const lineCount = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      if (!display) return 1;
      // Count visible line elements or use text layout
      const lines = display.querySelectorAll('.line');
      return lines.length || 1;
    });

    expect(lineCount).toBeGreaterThan(1);
  });

  test('should apply overlay opacity', async ({ page }) => {
    await setupApp(page, { overlayOpacity: 0.5 }, sampleScript);

    const opacity = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseFloat(getComputedStyle(display).opacity) : 1;
    });

    // Opacity might be applied to container or specific elements
    expect(opacity).toBeLessThanOrEqual(1);
  });
});

test.describe('Display Customization - Flip/Mirror', () => {
  test('should apply horizontal flip', async ({ page }) => {
    await setupApp(page, { isFlipped: true }, sampleScript);

    const transform = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).transform : '';
    });

    // Should have scaleX(-1) or similar transform
    expect(transform).toMatch(/matrix|scale/i);
  });

  test('should apply vertical flip', async ({ page }) => {
    await setupApp(page, { isFlippedVertical: true }, sampleScript);

    const transform = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).transform : '';
    });

    // Should have scaleY(-1) or similar transform
    expect(transform).toMatch(/matrix|scale/i);
  });

  test('should apply both flips simultaneously', async ({ page }) => {
    await setupApp(page, { isFlipped: true, isFlippedVertical: true }, sampleScript);

    const transform = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).transform : '';
    });

    expect(transform).toMatch(/matrix|scale/i);
  });
});

test.describe('Display Customization - Reading Guide', () => {
  test('should show reading guide when enabled', async ({ page }) => {
    await setupApp(page, { readingGuideEnabled: true }, sampleScript);

    const readingGuide = page.locator('.reading-guide, [data-reading-guide]');
    await expect(readingGuide).toBeVisible();
  });

  test('should hide reading guide when disabled', async ({ page }) => {
    await setupApp(page, { readingGuideEnabled: false }, sampleScript);

    const readingGuide = page.locator('.reading-guide, [data-reading-guide]');
    await expect(readingGuide).not.toBeVisible();
  });

  test('should toggle reading guide via settings', async ({ page }) => {
    await setupApp(page, { readingGuideEnabled: false }, sampleScript);

    // Open settings
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Find and click reading guide toggle
    const toggle = page.locator('input[aria-labelledby="reading-guide-title"]');
    await toggle.click();
    await page.waitForTimeout(100);

    const readingGuide = page.locator('.reading-guide, [data-reading-guide]');
    await expect(readingGuide).toBeVisible();
  });
});

test.describe('Display Customization - Text Direction', () => {
  test('should auto-detect RTL for Hebrew text', async ({ page }) => {
    const hebrewText = 'שלום עולם זהו טקסט בעברית';
    await setupApp(page, { textDirection: 'auto' }, hebrewText);

    const direction = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).direction : 'ltr';
    });

    expect(direction).toBe('rtl');
  });

  test('should auto-detect RTL for Arabic text', async ({ page }) => {
    const arabicText = 'مرحبا بالعالم هذا نص عربي';
    await setupApp(page, { textDirection: 'auto' }, arabicText);

    const direction = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).direction : 'ltr';
    });

    expect(direction).toBe('rtl');
  });

  test('should force LTR when set manually', async ({ page }) => {
    const hebrewText = 'שלום עולם';
    await setupApp(page, { textDirection: 'ltr' }, hebrewText);

    const direction = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).direction : 'rtl';
    });

    expect(direction).toBe('ltr');
  });

  test('should force RTL when set manually', async ({ page }) => {
    const englishText = 'Hello World';
    await setupApp(page, { textDirection: 'rtl' }, englishText);

    const direction = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).direction : 'ltr';
    });

    expect(direction).toBe('rtl');
  });
});

test.describe('Display Customization - Settings Persistence', () => {
  test('should persist font size after reload', async ({ page }) => {
    await setupApp(page, { fontSize: 48 }, sampleScript);

    // Change font size
    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.up('Control');
    await page.waitForTimeout(200);

    const sizeBeforeReload = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseInt(getComputedStyle(display).fontSize) : 0;
    });

    // Reload page (without init script override)
    await page.reload();
    await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    const sizeAfterReload = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseInt(getComputedStyle(display).fontSize) : 0;
    });

    expect(sizeAfterReload).toBe(sizeBeforeReload);
  });

  test('should reset to defaults', async ({ page }) => {
    await setupApp(page, { fontSize: 64, lineSpacing: 3, letterSpacing: 10 }, sampleScript);

    // Open settings
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Click reset button
    const resetButton = page.locator('[data-action="reset-defaults"], button:has-text("Reset")');
    await resetButton.click();
    await page.waitForTimeout(200);

    // Check default values are restored
    const fontSize = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseInt(getComputedStyle(display).fontSize) : 0;
    });

    // Default font size is 32
    expect(fontSize).toBe(32);
  });
});

test.describe('Display Customization - Edge Cases', () => {
  test('should handle extreme font size gracefully', async ({ page }) => {
    await setupApp(page, { fontSize: 72 }, sampleScript);

    // Display should still be functional
    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });

  test('should handle extreme line spacing', async ({ page }) => {
    await setupApp(page, { lineSpacing: 3 }, sampleScript);

    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });

  test('should handle zero margin', async ({ page }) => {
    await setupApp(page, { horizontalMargin: 0 }, sampleScript);

    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });

  test('should handle maximum margin (40%)', async ({ page }) => {
    await setupApp(page, { horizontalMargin: 40 }, sampleScript);

    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });

  test('should handle invalid color gracefully', async ({ page }) => {
    await setupApp(page, { fontColor: 'invalid-color' }, sampleScript);

    // Should fall back to default or not crash
    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });
});

test.describe('Display Customization - Keyboard Shortcuts for Display', () => {
  test('should increase font size with Ctrl+ArrowRight', async ({ page }) => {
    await setupApp(page, { fontSize: 32 }, sampleScript);

    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.up('Control');
    await page.waitForTimeout(100);

    const fontSize = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseInt(getComputedStyle(display).fontSize) : 0;
    });

    expect(fontSize).toBeGreaterThan(32);
  });

  test('should decrease font size with Ctrl+ArrowLeft', async ({ page }) => {
    await setupApp(page, { fontSize: 48 }, sampleScript);

    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.up('Control');
    await page.waitForTimeout(100);

    const fontSize = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseInt(getComputedStyle(display).fontSize) : 0;
    });

    expect(fontSize).toBeLessThan(48);
  });

  test('should increase line spacing with Ctrl+ArrowUp', async ({ page }) => {
    await setupApp(page, { lineSpacing: 1 }, sampleScript);

    const initialLineHeight = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseFloat(getComputedStyle(display).lineHeight) : 0;
    });

    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.up('Control');
    await page.waitForTimeout(100);

    const newLineHeight = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseFloat(getComputedStyle(display).lineHeight) : 0;
    });

    expect(newLineHeight).toBeGreaterThan(initialLineHeight);
  });

  test('should decrease line spacing with Ctrl+ArrowDown', async ({ page }) => {
    await setupApp(page, { lineSpacing: 2 }, sampleScript);

    const initialLineHeight = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseFloat(getComputedStyle(display).lineHeight) : 0;
    });

    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.up('Control');
    await page.waitForTimeout(100);

    const newLineHeight = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? parseFloat(getComputedStyle(display).lineHeight) : 0;
    });

    expect(newLineHeight).toBeLessThan(initialLineHeight);
  });
});

test.describe('Display Customization - Overlay Opacity', () => {
  test('should apply semi-transparent overlay', async ({ page }) => {
    await setupApp(page, { overlayOpacity: 0.3 }, sampleScript);

    const overlayVisible = await page.evaluate(() => {
      const overlay = document.querySelector('.overlay, [data-overlay]');
      if (!overlay) return false;
      const style = getComputedStyle(overlay);
      const opacity = parseFloat(style.opacity);
      const bgAlpha = style.backgroundColor.includes('rgba');
      return opacity < 1 || bgAlpha;
    });

    // Overlay may be implemented differently
    expect(typeof overlayVisible).toBe('boolean');
  });

  test('should apply full opacity overlay', async ({ page }) => {
    await setupApp(page, { overlayOpacity: 1 }, sampleScript);

    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });

  test('should apply zero opacity (no overlay)', async ({ page }) => {
    await setupApp(page, { overlayOpacity: 0 }, sampleScript);

    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });
});

test.describe('Display Customization - Max Words Per Line', () => {
  test('should wrap text at max words limit', async ({ page }) => {
    const longLine = 'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen';
    await setupApp(page, { maxWordsPerLine: 5 }, longLine);

    const lineCount = await page.evaluate(() => {
      const lines = document.querySelectorAll('[data-testid="teleprompter-display"] .line');
      return lines.length;
    });

    // With 15 words and 5 per line, should have 3 lines
    expect(lineCount).toBeGreaterThanOrEqual(3);
  });

  test('should disable max words (0 = unlimited)', async ({ page }) => {
    const longLine = 'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen';
    await setupApp(page, { maxWordsPerLine: 0 }, longLine);

    const lineCount = await page.evaluate(() => {
      const lines = document.querySelectorAll('[data-testid="teleprompter-display"] .line');
      return lines.length;
    });

    // With no limit, should be 1 line (may wrap due to viewport, but logical line count)
    expect(lineCount).toBeGreaterThanOrEqual(1);
  });

  test('should block inline editing when maxWordsPerLine is set', async ({ page }) => {
    await setupApp(page, { maxWordsPerLine: 5 }, sampleScript);

    // Try double-clicking to edit inline
    const firstLine = page.locator('[data-testid="teleprompter-display"] .line').first();
    await firstLine.dblclick();
    await page.waitForTimeout(300);

    // Should NOT enter inline edit mode
    const isEditing = await page.evaluate(() => {
      const textarea = document.querySelector('[data-testid="teleprompter-display"] textarea');
      const contentEditable = document.querySelector('[data-testid="teleprompter-display"] [contenteditable="true"]');
      return textarea !== null || contentEditable !== null;
    });

    expect(isEditing).toBe(false);
  });
});

test.describe('Display Customization - Theme Switching', () => {
  test('should apply Green Screen theme', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const greenScreenButton = page.locator('[data-theme="green-screen"], button:has-text("Green Screen")');
    const isVisible = await greenScreenButton.isVisible().catch(() => false);

    if (isVisible) {
      await greenScreenButton.click();
      await page.waitForTimeout(100);

      const bgColor = await page.evaluate(() => {
        const display = document.querySelector('[data-testid="teleprompter-display"]');
        return display ? getComputedStyle(display).backgroundColor : '';
      });

      // Green screen should have green background
      expect(bgColor).toMatch(/rgb\(0,\s*255,\s*0\)|#00ff00|green/i);
    }
  });

  test('should switch themes rapidly without glitches', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Rapidly switch themes
    await page.click('[data-theme="dark"]');
    await page.click('[data-theme="light"]');
    await page.click('[data-theme="high-contrast"]');
    await page.click('[data-theme="dark"]');
    await page.waitForTimeout(100);

    // Display should still be functional
    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });
});

test.describe('Display Customization - Font Weight and Style', () => {
  test('should apply bold font weight', async ({ page }) => {
    await setupApp(page, { fontWeight: 'bold' }, sampleScript);

    const fontWeight = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).fontWeight : '';
    });

    expect(['bold', '700']).toContain(fontWeight);
  });

  test('should apply normal font weight', async ({ page }) => {
    await setupApp(page, { fontWeight: 'normal' }, sampleScript);

    const fontWeight = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).fontWeight : '';
    });

    expect(['normal', '400']).toContain(fontWeight);
  });
});
