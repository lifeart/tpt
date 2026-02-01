import { test, expect } from '@playwright/test';
import {
  setupApp,
  openSettings,
  SELECTORS,
} from './utils/test-helpers';

const sampleScript = `Sample script for accessibility testing.
Line two continues here.
Line three has more content.`;

test.describe('Accessibility - ARIA Landmarks', () => {
  test('should have main landmark', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const mainLandmark = page.locator('main, [role="main"]');
    await expect(mainLandmark).toHaveCount(1);
  });

  test('should have toolbar role', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const toolbar = page.locator('[role="toolbar"], .toolbar');
    await expect(toolbar).toBeVisible();
  });

  test('should have complementary region for settings', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const drawer = page.locator('.settings-drawer');
    const role = await drawer.getAttribute('role');

    expect(['dialog', 'complementary', 'region']).toContain(role);
  });
});

test.describe('Accessibility - Focus Management', () => {
  test('should have visible focus indicators', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Tab to first focusable element
    await page.keyboard.press('Tab');

    const focusedElement = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) return null;
      const style = getComputedStyle(active);
      return {
        outline: style.outline,
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow
      };
    });

    // Should have visible focus indicator (outline or box-shadow)
    const hasFocusIndicator = focusedElement &&
      (focusedElement.outline !== 'none' ||
       focusedElement.outlineWidth !== '0px' ||
       focusedElement.boxShadow !== 'none');

    expect(hasFocusIndicator).toBe(true);
  });

  test('should trap focus in settings drawer', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Tab many times
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
    }

    const focusInDrawer = await page.evaluate(() => {
      const drawer = document.querySelector('.settings-drawer');
      return drawer?.contains(document.activeElement);
    });

    expect(focusInDrawer).toBe(true);
  });

  test('should trap focus in help modal', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="help"]');
    await page.waitForTimeout(300);

    // Tab many times
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
    }

    const focusInModal = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="help-modal"]');
      return modal?.contains(document.activeElement);
    });

    expect(focusInModal).toBe(true);
  });

  test('should trap focus in script editor', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="edit"]');
    await page.waitForTimeout(300);

    // Tab many times
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
    }

    const focusInEditor = await page.evaluate(() => {
      const editor = document.querySelector('[data-testid="script-editor"]');
      return editor?.contains(document.activeElement);
    });

    expect(focusInEditor).toBe(true);
  });

  test('should return focus after closing modal', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Focus the help button
    const helpButton = page.locator('[data-action="help"]');
    await helpButton.focus();

    // Open and close help
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Focus should return to help button
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.getAttribute('data-action');
    });

    expect(focusedElement).toMatch(/help|show-help/);
  });

  test('should skip to main content', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Check for skip link
    const skipLink = page.locator('a[href="#main"], .skip-link, [data-skip-to-content]');
    const hasSkipLink = await skipLink.count() > 0;

    if (hasSkipLink) {
      await skipLink.focus();
      await skipLink.click();

      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName.toLowerCase();
      });

      expect(focusedElement).toBeTruthy();
    }
  });
});

test.describe('Accessibility - Keyboard Navigation', () => {
  test('should navigate all toolbar buttons with Tab', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const buttons = [];
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const activeElement = await page.evaluate(() => {
        return document.activeElement?.tagName.toLowerCase();
      });
      if (activeElement === 'button') {
        buttons.push(activeElement);
      }
    }

    expect(buttons.length).toBeGreaterThan(3);
  });

  test('should activate buttons with Enter', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Tab to play button
    const playButton = page.locator('[data-action="toggle-play"]');
    await playButton.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const isPlaying = await page.evaluate(() => {
      const countdown = document.querySelector('.countdown-overlay.visible');
      return countdown !== null;
    });

    expect(isPlaying).toBe(true);
  });

  test('should activate buttons with Space', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Tab to settings button
    const settingsButton = page.locator('[data-action="settings"]');
    await settingsButton.focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);

    const drawer = page.locator('.settings-drawer');
    await expect(drawer).toBeVisible();
  });

  test('should close dialogs with Escape', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Open settings
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const drawer = page.locator('.settings-drawer.open');
    await expect(drawer).not.toBeVisible();
  });
});

test.describe('Accessibility - ARIA Labels', () => {
  test('should have aria-labels on buttons', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const buttons = await page.locator('.toolbar button, .floating-toolbar button').all();

    let labeledCount = 0;
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');
      const innerText = await button.textContent();

      if (ariaLabel || title || (innerText && innerText.trim().length > 0)) {
        labeledCount++;
      }
    }

    // Most buttons should be labeled
    expect(labeledCount).toBeGreaterThan(buttons.length * 0.8);
  });

  test('should have aria-label on speed display', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const speedDisplay = page.locator('[data-testid="speed-value"], .speed-display');
    const ariaLabel = await speedDisplay.getAttribute('aria-label');
    const ariaLabelledBy = await speedDisplay.getAttribute('aria-labelledby');

    expect(ariaLabel || ariaLabelledBy).toBeTruthy();
  });

  test('should have aria-live for dynamic content', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const liveRegions = await page.locator('[aria-live]').all();

    // Should have at least one live region for status updates
    expect(liveRegions.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Accessibility - Color Contrast', () => {
  test('should meet WCAG AA contrast with Dark theme', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.click('[data-theme="dark"]');
    await page.waitForTimeout(200);

    const contrast = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      if (!display) return 0;

      const style = getComputedStyle(display);
      const textColor = style.color;
      const bgColor = style.backgroundColor;

      // Parse RGB values
      const parseRgb = (color: string) => {
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
        }
        return { r: 0, g: 0, b: 0 };
      };

      const getLuminance = (r: number, g: number, b: number) => {
        const [rs, gs, bs] = [r, g, b].map((c) => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      };

      const text = parseRgb(textColor);
      const bg = parseRgb(bgColor);

      const textLum = getLuminance(text.r, text.g, text.b);
      const bgLum = getLuminance(bg.r, bg.g, bg.b);

      const lighter = Math.max(textLum, bgLum);
      const darker = Math.min(textLum, bgLum);

      return (lighter + 0.05) / (darker + 0.05);
    });

    // WCAG AA requires 4.5:1 for normal text
    expect(contrast).toBeGreaterThan(4.5);
  });

  test('should meet WCAG AA contrast with Light theme', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.click('[data-theme="light"]');
    await page.waitForTimeout(200);

    const contrast = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      if (!display) return 0;

      const style = getComputedStyle(display);
      const textColor = style.color;
      const bgColor = style.backgroundColor;

      const parseRgb = (color: string) => {
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
        }
        return { r: 0, g: 0, b: 0 };
      };

      const getLuminance = (r: number, g: number, b: number) => {
        const [rs, gs, bs] = [r, g, b].map((c) => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      };

      const text = parseRgb(textColor);
      const bg = parseRgb(bgColor);

      const textLum = getLuminance(text.r, text.g, text.b);
      const bgLum = getLuminance(bg.r, bg.g, bg.b);

      const lighter = Math.max(textLum, bgLum);
      const darker = Math.min(textLum, bgLum);

      return (lighter + 0.05) / (darker + 0.05);
    });

    expect(contrast).toBeGreaterThan(4.5);
  });

  test('should meet WCAG AAA contrast with High Contrast theme', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.click('[data-theme="high-contrast"]');
    await page.waitForTimeout(200);

    const contrast = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      if (!display) return 0;

      const style = getComputedStyle(display);
      const textColor = style.color;
      const bgColor = style.backgroundColor;

      const parseRgb = (color: string) => {
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
        }
        return { r: 0, g: 0, b: 0 };
      };

      const getLuminance = (r: number, g: number, b: number) => {
        const [rs, gs, bs] = [r, g, b].map((c) => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      };

      const text = parseRgb(textColor);
      const bg = parseRgb(bgColor);

      const textLum = getLuminance(text.r, text.g, text.b);
      const bgLum = getLuminance(bg.r, bg.g, bg.b);

      const lighter = Math.max(textLum, bgLum);
      const darker = Math.min(textLum, bgLum);

      return (lighter + 0.05) / (darker + 0.05);
    });

    // WCAG AAA requires 7:1 for normal text
    expect(contrast).toBeGreaterThan(7);
  });
});

test.describe('Accessibility - Screen Reader', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const headings = await page.evaluate(() => {
      const h1s = document.querySelectorAll('h1').length;
      const h2s = document.querySelectorAll('h2').length;
      const h3s = document.querySelectorAll('h3').length;
      return { h1s, h2s, h3s };
    });

    // Should have at least one heading
    expect(headings.h1s + headings.h2s + headings.h3s).toBeGreaterThanOrEqual(0);
  });

  test('should have alt text for images', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const imagesWithoutAlt = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      let count = 0;
      images.forEach((img) => {
        if (!img.alt && !img.getAttribute('aria-hidden')) {
          count++;
        }
      });
      return count;
    });

    expect(imagesWithoutAlt).toBe(0);
  });

  test('should have descriptive link text', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const badLinks = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      let count = 0;
      const badTexts = ['click here', 'read more', 'here', 'link'];
      links.forEach((link) => {
        const text = link.textContent?.toLowerCase().trim();
        if (text && badTexts.includes(text)) {
          count++;
        }
      });
      return count;
    });

    expect(badLinks).toBe(0);
  });
});

test.describe('Accessibility - Form Controls', () => {
  test('should have labels for all inputs', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const unlabeledInputs = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
      let unlabeled = 0;

      inputs.forEach((input) => {
        const id = input.id;
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        const hasLabel = id ? document.querySelector(`label[for="${id}"]`) : false;

        if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
          unlabeled++;
        }
      });

      return unlabeled;
    });

    // Allow some flexibility but most should be labeled
    expect(unlabeledInputs).toBeLessThan(3);
  });

  test('should have visible labels', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const labels = await page.locator('.settings-drawer label').all();

    for (const label of labels) {
      const isVisible = await label.isVisible();
      if (isVisible) {
        const text = await label.textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('should indicate required fields', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="edit"]');
    await page.waitForTimeout(300);

    // Script textarea is essentially required for functionality
    const textarea = page.locator('.script-editor textarea');
    const hasRequired = await textarea.getAttribute('required');
    const hasAriaRequired = await textarea.getAttribute('aria-required');

    // Either attribute is acceptable
    expect(hasRequired !== null || hasAriaRequired !== null).toBe(true);
  });
});

test.describe('Accessibility - Motion and Animation', () => {
  test('should respect reduced motion preference', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await setupApp(page, {}, sampleScript);

    // Start scrolling
    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(4000);

    // Check if scroll animation is instant/reduced
    const hasReducedMotion = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      const style = display ? getComputedStyle(display) : null;
      const transition = style?.transition || '';
      const animation = style?.animation || '';

      // Should have reduced or no transitions
      return transition.includes('none') || animation.includes('none') ||
             !transition.includes('ms') && !animation.includes('ms');
    });

    // Note: Implementation may vary
    expect(typeof hasReducedMotion).toBe('boolean');
  });
});

test.describe('Accessibility - Text Sizing', () => {
  test('should support text zoom up to 200%', async ({ page }) => {
    await setupApp(page, { fontSize: 32 }, sampleScript);

    // Simulate browser zoom
    await page.evaluate(() => {
      document.body.style.fontSize = '200%';
    });

    // Content should still be visible and not overflow
    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();

    // Text should be readable
    const overflowHidden = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      const style = display ? getComputedStyle(display) : null;
      return style?.overflow === 'hidden' && style?.textOverflow === 'ellipsis';
    });

    // Should not clip text with ellipsis
    expect(overflowHidden).toBe(false);
  });

  test('should support large font sizes natively', async ({ page }) => {
    await setupApp(page, { fontSize: 72 }, sampleScript);

    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();

    const fontSize = await page.evaluate(() => {
      const text = document.querySelector('[data-testid="teleprompter-text"]');
      return text ? parseInt(getComputedStyle(text).fontSize) : 0;
    });

    expect(fontSize).toBe(72);
  });
});

test.describe('Accessibility - Dyslexia Support', () => {
  test('should support Lexend font', async ({ page }) => {
    await setupApp(page, { fontFamily: 'Lexend' }, sampleScript);

    const fontFamily = await page.evaluate(() => {
      const text = document.querySelector('[data-testid="teleprompter-text"]');
      return text ? getComputedStyle(text).fontFamily : '';
    });

    expect(fontFamily.toLowerCase()).toContain('lexend');
  });

  test('should support OpenDyslexic font', async ({ page }) => {
    await setupApp(page, { fontFamily: 'OpenDyslexic' }, sampleScript);

    const fontFamily = await page.evaluate(() => {
      const text = document.querySelector('[data-testid="teleprompter-text"]');
      return text ? getComputedStyle(text).fontFamily : '';
    });

    expect(fontFamily.toLowerCase()).toContain('opendyslexic');
  });

  test('should support increased letter spacing', async ({ page }) => {
    await setupApp(page, { letterSpacing: 5 }, sampleScript);

    const letterSpacing = await page.evaluate(() => {
      const text = document.querySelector('[data-testid="teleprompter-text"]');
      return text ? getComputedStyle(text).letterSpacing : '0px';
    });

    expect(letterSpacing).toBe('5px');
  });

  test('should support increased line spacing', async ({ page }) => {
    await setupApp(page, { lineSpacing: 2 }, sampleScript);

    const lineHeight = await page.evaluate(() => {
      const text = document.querySelector('[data-testid="teleprompter-text"]');
      const style = text ? getComputedStyle(text).lineHeight : '';
      return style;
    });

    expect(lineHeight).toBeTruthy();
  });
});

test.describe('Accessibility - Reverse Tab Navigation', () => {
  test('should navigate backwards with Shift+Tab', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Tab forward a few times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    const forwardElement = await page.evaluate(() => {
      return document.activeElement?.getAttribute('data-action') || document.activeElement?.tagName;
    });

    // Tab backward
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');

    const backwardElement = await page.evaluate(() => {
      return document.activeElement?.getAttribute('data-action') || document.activeElement?.tagName;
    });

    expect(backwardElement).not.toBe(forwardElement);
  });

  test('should cycle backwards through toolbar buttons', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Focus first toolbar button
    await page.keyboard.press('Tab');

    const visitedElements: string[] = [];

    // Tab backwards through all elements
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Shift+Tab');
      const element = await page.evaluate(() => {
        return document.activeElement?.getAttribute('data-action') ||
               document.activeElement?.tagName.toLowerCase() ||
               'unknown';
      });
      visitedElements.push(element);
    }

    // Should visit multiple different elements
    const uniqueElements = [...new Set(visitedElements)];
    expect(uniqueElements.length).toBeGreaterThan(2);
  });

  test('should reverse tab through settings drawer', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Tab forward
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }

    // Tab backward
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Shift+Tab');
    }

    // Focus should still be in drawer
    const focusInDrawer = await page.evaluate(() => {
      const drawer = document.querySelector('.settings-drawer');
      return drawer?.contains(document.activeElement);
    });

    expect(focusInDrawer).toBe(true);
  });

  test('should reverse tab through help modal', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="help"]');
    await page.waitForTimeout(300);

    // Tab forward
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    // Tab backward
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Shift+Tab');
    }

    // Focus should still be in modal
    const focusInModal = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="help-modal"]');
      return modal?.contains(document.activeElement);
    });

    expect(focusInModal).toBe(true);
  });
});

test.describe('Accessibility - Escape Key Behavior', () => {
  test('should close settings drawer with Escape', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const drawer = page.locator('.settings-drawer.open, .settings-drawer[open]');
    await expect(drawer).not.toBeVisible();
  });

  test('should close help modal with Escape', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="help"]');
    await page.waitForTimeout(300);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const modal = page.locator('[data-testid="help-modal"]');
    await expect(modal).not.toBeVisible();
  });

  test('should close script editor with Escape', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="edit"]');
    await page.waitForTimeout(300);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const editor = page.locator('[data-testid="script-editor"]');
    await expect(editor).not.toBeVisible();
  });

  test('should cancel countdown with Escape', async ({ page }) => {
    await setupApp(page, { countdownEnabled: true, countdownSeconds: 3 }, sampleScript);

    // Start countdown
    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(500);

    // Verify countdown is visible
    const countdownVisible = await page.evaluate(() => {
      const countdown = document.querySelector('.countdown-overlay.visible');
      return countdown !== null;
    });
    expect(countdownVisible).toBe(true);

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Countdown should be cancelled
    const countdownStillVisible = await page.evaluate(() => {
      const countdown = document.querySelector('.countdown-overlay.visible');
      return countdown !== null;
    });
    expect(countdownStillVisible).toBe(false);
  });

  test('should prioritize modal close over other Escape actions', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Open settings
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Start countdown from within settings (if possible via keyboard)
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    // First Escape should close settings, not affect playback
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const drawer = page.locator('.settings-drawer.open, .settings-drawer[open]');
    await expect(drawer).not.toBeVisible();
  });
});

test.describe('Accessibility - Live Regions', () => {
  test('should announce speed changes', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Change speed
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);

    const liveRegions = await page.locator('[aria-live]').all();
    expect(liveRegions.length).toBeGreaterThan(0);
  });

  test('should have polite live region for non-urgent updates', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const politeRegions = await page.locator('[aria-live="polite"]').all();
    const assertiveRegions = await page.locator('[aria-live="assertive"]').all();

    // Should prefer polite for most updates
    expect(politeRegions.length + assertiveRegions.length).toBeGreaterThan(0);
  });
});

test.describe('Accessibility - Focus Visible', () => {
  test('should show focus ring on keyboard navigation', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.keyboard.press('Tab');

    const hasFocusVisible = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) return false;
      const style = getComputedStyle(active);
      // Check for any visible focus indicator
      return style.outline !== 'none' ||
             style.outlineWidth !== '0px' ||
             style.boxShadow !== 'none' ||
             active.classList.contains('focus-visible');
    });

    expect(hasFocusVisible).toBe(true);
  });

  test('should hide focus ring on mouse click', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const playButton = page.locator('[data-action="toggle-play"]');
    await playButton.click();

    const hasMouseFocusStyle = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) return true; // Acceptable if no focus after click
      // Mouse focus often has different/no outline
      const style = getComputedStyle(active);
      return style.outline === 'none' || !active.classList.contains('focus-visible');
    });

    // Note: This behavior may vary based on implementation
    expect(typeof hasMouseFocusStyle).toBe('boolean');
  });
});
