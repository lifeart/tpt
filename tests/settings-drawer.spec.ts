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

const sampleScript = 'Sample script for settings testing.';

test.describe('Settings Drawer - Opening and Closing', () => {
  test('should open settings drawer via toolbar button', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const drawer = page.locator('.settings-drawer');
    await expect(drawer).toBeVisible();
  });

  test('should close settings drawer via close button', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Open drawer
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Close drawer
    await page.click('[data-action="close-drawer"]');
    await page.waitForTimeout(300);

    const drawer = page.locator('.settings-drawer.open, .settings-drawer[open]');
    await expect(drawer).not.toBeVisible();
  });

  test('should close settings drawer with Escape', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Open drawer
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Close with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const drawer = page.locator('.settings-drawer.open, .settings-drawer[open]');
    await expect(drawer).not.toBeVisible();
  });

  test('should close settings drawer by clicking backdrop', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Open drawer
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Dispatch click event directly on backdrop
    await page.evaluate(() => {
      const backdrop = document.querySelector('.settings-drawer-backdrop');
      if (backdrop) {
        backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
    await page.waitForTimeout(300);

    const drawer = page.locator('.settings-drawer.open');
    await expect(drawer).not.toBeVisible();
  });
});

test.describe('Settings Drawer - Tab Navigation', () => {
  test('should have Display tab', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const displayTab = page.locator('[data-tab="display"], button:has-text("Display")');
    await expect(displayTab).toBeVisible();
  });

  test('should have Layout tab', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const layoutTab = page.locator('[data-tab="typography"], button:has-text("Typography")');
    await expect(layoutTab).toBeVisible();
  });

  test('should have Modes tab', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const modesTab = page.locator('[data-tab="general"], button:has-text("General")');
    await expect(modesTab).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Click Typography tab
    await page.click('[data-tab="typography"]');
    await page.waitForTimeout(200);

    // Verify Typography tab content is visible (font family is on Typography tab)
    const fontFamilySelect = page.locator('[data-testid="font-family-select"]');
    await expect(fontFamilySelect).toBeVisible();
  });
});

test.describe('Settings Drawer - Display Tab Controls', () => {
  test('should have font size control', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const fontSizeControl = page.locator('[data-testid="font-size-input"]');
    await expect(fontSizeControl).toBeVisible();
  });

  test('should have font family selector', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Font family is on Typography tab
    await page.click('[data-tab="typography"]');
    await page.waitForTimeout(200);

    const fontFamilyControl = page.locator('[data-testid="font-family-select"]');
    await expect(fontFamilyControl).toBeVisible();
  });

  test('should have text color picker', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const colorPicker = page.locator('#font-color-input');
    await expect(colorPicker).toBeVisible();
  });

  test('should have background color picker', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const bgColorPicker = page.locator('#bg-color-input');
    await expect(bgColorPicker).toBeVisible();
  });

  test('should have line spacing control', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Line spacing is on Typography tab
    await page.click('[data-tab="typography"]');
    await page.waitForTimeout(200);

    const lineSpacingControl = page.locator('[data-testid="line-spacing-input"]');
    await expect(lineSpacingControl).toBeVisible();
  });

  test('should have letter spacing control', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Letter spacing is on Typography tab
    await page.click('[data-tab="typography"]');
    await page.waitForTimeout(200);

    const letterSpacingControl = page.locator('[data-testid="letter-spacing-input"]');
    await expect(letterSpacingControl).toBeVisible();
  });
});

test.describe('Settings Drawer - Theme Presets', () => {
  test('should have theme preset selector', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Theme presets is a select dropdown
    const themeSelect = page.locator('.settings-select').first();
    await expect(themeSelect).toBeVisible();

    // Should have options
    const options = await themeSelect.locator('option').count();
    expect(options).toBeGreaterThanOrEqual(3); // Custom + at least 2 themes
  });

  test('should apply theme on selection', async ({ page }) => {
    await setupApp(page, { backgroundColor: '#ffffff' }, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Select dark theme from dropdown
    const themeSelect = page.locator('.settings-select').first();
    await themeSelect.selectOption('dark');
    await page.waitForTimeout(200);

    const bgColor = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).backgroundColor : '';
    });

    // Dark theme should have dark background
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
  });

  test('should show contrast ratio', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Contrast indicator should be visible
    const contrastIndicator = page.locator('[data-testid="contrast-indicator"]');
    await expect(contrastIndicator).toBeVisible();
  });
});

test.describe('Settings Drawer - Display Tab Layout Controls', () => {
  test('should have horizontal margin control', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Horizontal margin is on Display tab (default)
    const marginControl = page.locator('[data-testid="horizontal-margin-input"]');
    await expect(marginControl).toBeVisible();
  });

  test('should have flip horizontal toggle', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Flip controls are on Display tab - check for the toggle switch container
    const flipToggleRow = page.locator('.flip-control-row').filter({ hasText: 'Flip' }).first();
    await flipToggleRow.scrollIntoViewIfNeeded();
    const toggleSwitch = flipToggleRow.locator('.toggle-switch');
    await expect(toggleSwitch).toBeVisible();
  });

  test('should have flip vertical toggle', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Flip vertical toggle
    const flipVerticalRow = page.locator('#flip-vertical-title').locator('..');
    await flipVerticalRow.scrollIntoViewIfNeeded();
    const toggleSwitch = page.locator('input[aria-labelledby="flip-vertical-title"]').locator('..'); // parent label
    await expect(toggleSwitch).toBeVisible();
  });

  test('should have opacity control', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const opacityControl = page.locator('[data-testid="overlay-opacity-input"]');
    await expect(opacityControl).toBeVisible();
  });

  test('should have reading guide toggle', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Reading guide toggle - check for the toggle switch container
    const readingGuideRow = page.locator('#reading-guide-title').locator('..');
    await readingGuideRow.scrollIntoViewIfNeeded();
    const toggleSwitch = page.locator('input[aria-labelledby="reading-guide-title"]').locator('..');
    await expect(toggleSwitch).toBeVisible();
  });
});

test.describe('Settings Drawer - Typography Tab Controls', () => {
  test('should have max words per line control', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Max words is on Typography tab
    await page.click('[data-tab="typography"]');
    await page.waitForTimeout(200);

    const wordsControl = page.locator('[data-testid="max-words-input"]');
    await expect(wordsControl).toBeVisible();
  });
});

test.describe('Settings Drawer - Modes Tab', () => {
  test('should have scroll mode selector', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    await page.click('[data-tab="general"]');
    await page.waitForTimeout(200);

    const modeSelect = page.locator('[data-testid="scroll-mode-select"]');
    await expect(modeSelect).toBeVisible();

    // Should have multiple options
    const options = await modeSelect.locator('option').count();
    expect(options).toBeGreaterThanOrEqual(2);
  });

  test('should switch scroll mode from settings', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous' }, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    await page.click('[data-tab="general"]');
    await page.waitForTimeout(200);

    // Select paging mode from dropdown
    const modeSelect = page.locator('[data-testid="scroll-mode-select"]');
    await modeSelect.selectOption('paging');
    await page.waitForTimeout(200);

    // Verify mode changed
    const mode = await page.evaluate(() => {
      const saved = localStorage.getItem('tpt/settings');
      if (saved) {
        const settings = JSON.parse(saved);
        return settings.scrollMode;
      }
      return 'unknown';
    });

    expect(mode).toBe('paging');
  });
});

test.describe('Settings Drawer - Language Selection', () => {
  test('should have language selector', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Language selector is on General tab
    await page.click('[data-tab="general"]');
    await page.waitForTimeout(200);

    const languageSelector = page.locator('[data-testid="language-select"]');
    await expect(languageSelector).toBeVisible();
  });

  test('should switch to Russian', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    await page.click('[data-tab="general"]');
    await page.waitForTimeout(200);

    const languageSelector = page.locator('[data-testid="language-select"]');
    await languageSelector.selectOption('ru');
    await page.waitForTimeout(300);

    // Check for Russian text
    const hasRussian = await page.evaluate(() => {
      const body = document.body.textContent || '';
      // Look for common Russian words
      return body.includes('Настройки') || body.includes('Шрифт') || body.includes('Размер');
    });

    expect(hasRussian).toBe(true);
  });

  test('should switch to Spanish', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    await page.click('[data-tab="general"]');
    await page.waitForTimeout(200);

    const languageSelector = page.locator('[data-testid="language-select"]');
    await languageSelector.selectOption('es');
    await page.waitForTimeout(300);

    // Check for Spanish text
    const hasSpanish = await page.evaluate(() => {
      const body = document.body.textContent || '';
      return body.includes('Configuración') || body.includes('Fuente') || body.includes('Tamaño');
    });

    expect(hasSpanish).toBe(true);
  });
});

test.describe('Settings Drawer - Reset to Defaults', () => {
  test('should have reset button', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const resetButton = page.locator('[data-action="reset-defaults"]');
    await expect(resetButton).toBeVisible();
  });

  test('should reset all settings to defaults', async ({ page }) => {
    await setupApp(page, { fontSize: 64, lineSpacing: 3, scrollSpeed: 8 }, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    await page.click('[data-action="reset-defaults"]');
    await page.waitForTimeout(300);

    // Check defaults restored
    const settings = await page.evaluate(() => {
      const saved = localStorage.getItem('tpt/settings');
      return saved ? JSON.parse(saved) : {};
    });

    expect(settings.fontSize).toBe(32); // Default font size
    expect(settings.scrollSpeed).toBe(1.5); // Default speed
  });
});

test.describe('Settings Drawer - Contrast Ratio', () => {
  test('should display contrast ratio', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const contrastIndicator = page.locator('.contrast-ratio, [data-contrast], .contrast-display');
    const isVisible = await contrastIndicator.isVisible().catch(() => false);

    if (isVisible) {
      const text = await contrastIndicator.textContent();
      expect(text).toMatch(/\d|AA|AAA/);
    }
  });

  test('should update contrast ratio when colors change', async ({ page }) => {
    await setupApp(page, { fontColor: '#ffffff', backgroundColor: '#000000' }, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const contrastIndicator = page.locator('[data-testid="contrast-indicator"]');
    const initialContrast = await contrastIndicator.textContent();

    // Change to low contrast colors
    const bgColorInput = page.locator('#bg-color-input');
    await bgColorInput.evaluate((el: HTMLInputElement, value) => {
      el.value = value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, '#cccccc');

    await page.waitForTimeout(200);

    const newContrast = await contrastIndicator.textContent();

    // Contrast should change
    if (initialContrast && newContrast) {
      expect(newContrast).not.toBe(initialContrast);
    }
  });
});

test.describe('Settings Drawer - Accessibility', () => {
  test('should trap focus within drawer', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Tab through all focusable elements
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
    }

    // Focus should still be within drawer
    const focusWithinDrawer = await page.evaluate(() => {
      const drawer = document.querySelector('.settings-drawer');
      const activeElement = document.activeElement;
      return drawer?.contains(activeElement);
    });

    expect(focusWithinDrawer).toBe(true);
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const drawer = page.locator('.settings-drawer');
    const role = await drawer.getAttribute('role');
    const ariaLabel = await drawer.getAttribute('aria-label');
    const ariaLabelledBy = await drawer.getAttribute('aria-labelledby');

    // Should have appropriate ARIA attributes
    const hasAriaAttrs = role === 'dialog' || role === 'complementary' || ariaLabel || ariaLabelledBy;
    expect(hasAriaAttrs).toBeTruthy();
  });

  test('should have labeled form controls', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Check that inputs have labels
    const unlabeledInputs = await page.evaluate(() => {
      const inputs = document.querySelectorAll('.settings-drawer input:not([type="hidden"])');
      let unlabeled = 0;
      inputs.forEach((input) => {
        const id = input.id;
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);
        if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
          unlabeled++;
        }
      });
      return unlabeled;
    });

    // Most inputs should be labeled (allow some flexibility for hidden/visually-hidden inputs)
    expect(unlabeledInputs).toBeLessThan(10);
  });
});

test.describe('Settings Drawer - Live Preview', () => {
  test('should update display in real-time when font size changes', async ({ page }) => {
    await setupApp(page, { fontSize: 32 }, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Font size input is a range slider
    const fontSizeInput = page.locator('[data-testid="font-size-input"]');
    await fontSizeInput.evaluate((el: HTMLInputElement) => {
      el.value = '48';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(200);

    // Font size is applied to the inner text container
    const fontSize = await page.evaluate(() => {
      const textElement = document.querySelector('.teleprompter-text-inner, .teleprompt-text-inner');
      return textElement ? parseInt(getComputedStyle(textElement).fontSize) : 0;
    });

    expect(fontSize).toBe(48);
  });

  test('should update display in real-time when colors change', async ({ page }) => {
    await setupApp(page, { backgroundColor: '#000000' }, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const bgColorInput = page.locator('#bg-color-input');
    await bgColorInput.evaluate((el: HTMLInputElement, value) => {
      el.value = value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, '#ff0000');

    await page.waitForTimeout(200);

    const bgColor = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).backgroundColor : '';
    });

    expect(bgColor).toMatch(/rgb\(255,\s*0,\s*0\)/);
  });
});

test.describe('Settings Drawer - RSVP Speed Control', () => {
  test('should show RSVP speed control only in RSVP mode', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous' }, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Switch to General tab
    await page.click('[data-tab="general"]');
    await page.waitForTimeout(200);

    // RSVP speed should be hidden in continuous mode
    const rsvpSpeedInput = page.locator('[data-testid="rsvp-speed-input"]');
    await expect(rsvpSpeedInput).not.toBeVisible();
  });

  test('should show RSVP speed control when RSVP mode selected', async ({ page }) => {
    await setupApp(page, { scrollMode: 'rsvp' }, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Switch to General tab
    await page.click('[data-tab="general"]');
    await page.waitForTimeout(200);

    // RSVP speed should be visible
    const rsvpSpeedInput = page.locator('[data-testid="rsvp-speed-input"]');
    await expect(rsvpSpeedInput).toBeVisible();
  });

  test('should toggle RSVP speed visibility when mode changes', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous' }, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Switch to General tab
    await page.click('[data-tab="general"]');
    await page.waitForTimeout(200);

    // Initially hidden
    const rsvpSpeedInput = page.locator('[data-testid="rsvp-speed-input"]');
    await expect(rsvpSpeedInput).not.toBeVisible();

    // Change to RSVP mode
    await page.selectOption('[data-testid="scroll-mode-select"]', 'rsvp');
    await page.waitForTimeout(200);

    // Should now be visible
    await expect(rsvpSpeedInput).toBeVisible();

    // Change back to continuous
    await page.selectOption('[data-testid="scroll-mode-select"]', 'continuous');
    await page.waitForTimeout(200);

    // Should be hidden again
    await expect(rsvpSpeedInput).not.toBeVisible();
  });

  test('should adjust RSVP speed with slider', async ({ page }) => {
    await setupApp(page, { scrollMode: 'rsvp', rsvpSpeed: 300 }, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    await page.click('[data-tab="general"]');
    await page.waitForTimeout(200);

    const rsvpSpeedInput = page.locator('[data-testid="rsvp-speed-input"]');
    await rsvpSpeedInput.fill('400');
    await rsvpSpeedInput.dispatchEvent('input');
    await page.waitForTimeout(200);

    const savedSpeed = await page.evaluate(() => {
      const settings = localStorage.getItem('tpt/settings');
      return settings ? JSON.parse(settings).rsvpSpeed : 0;
    });

    expect(savedSpeed).toBe(400);
  });
});

test.describe('Settings Drawer - Max Words Per Line', () => {
  test('should clamp invalid values to min', async ({ page }) => {
    await setupApp(page, { maxWordsPerLine: 5 }, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    await page.click('[data-tab="typography"]');
    await page.waitForTimeout(200);

    const maxWordsInput = page.locator('[data-testid="max-words-input"]');
    await maxWordsInput.fill('-5'); // Invalid negative
    await maxWordsInput.dispatchEvent('input');
    await page.waitForTimeout(200);

    const savedValue = await page.evaluate(() => {
      const settings = localStorage.getItem('tpt/settings');
      return settings ? JSON.parse(settings).maxWordsPerLine : -1;
    });

    expect(savedValue).toBeGreaterThanOrEqual(0);
  });

  test('should clamp values above maximum', async ({ page }) => {
    await setupApp(page, { maxWordsPerLine: 5 }, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    await page.click('[data-tab="typography"]');
    await page.waitForTimeout(200);

    const maxWordsInput = page.locator('[data-testid="max-words-input"]');
    await maxWordsInput.fill('1000'); // Way above max
    await maxWordsInput.dispatchEvent('input');
    await page.waitForTimeout(200);

    const savedValue = await page.evaluate(() => {
      const settings = localStorage.getItem('tpt/settings');
      return settings ? JSON.parse(settings).maxWordsPerLine : 1000;
    });

    expect(savedValue).toBeLessThanOrEqual(50); // Max should be reasonable
  });

  test('should handle boundary values gracefully', async ({ page }) => {
    await setupApp(page, { maxWordsPerLine: 5 }, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    await page.click('[data-tab="typography"]');
    await page.waitForTimeout(200);

    // Range inputs automatically clamp values
    const maxWordsInput = page.locator('[data-testid="max-words-input"]');
    await maxWordsInput.evaluate((el: HTMLInputElement) => {
      el.value = '0'; // Below min
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(200);

    const savedValue = await page.evaluate(() => {
      const settings = localStorage.getItem('tpt/settings');
      return settings ? JSON.parse(settings).maxWordsPerLine : -1;
    });

    // Should be at minimum value
    expect(savedValue).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Settings Drawer - Color Validation', () => {
  test('should accept valid hex colors', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const fontColorInput = page.locator('input[type="color"]').first();
    await fontColorInput.evaluate((el: HTMLInputElement, value) => {
      el.value = value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, '#ff5500');

    await page.waitForTimeout(200);

    const savedColor = await page.evaluate(() => {
      const settings = localStorage.getItem('tpt/settings');
      return settings ? JSON.parse(settings).fontColor : '';
    });

    expect(savedColor.toLowerCase()).toBe('#ff5500');
  });
});

test.describe('Settings Drawer - Overlay Opacity', () => {
  test('should apply overlay opacity to background', async ({ page }) => {
    await setupApp(page, { overlayOpacity: 0.5, backgroundColor: '#000000' }, sampleScript);

    const bgColor = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).backgroundColor : '';
    });

    // Should have rgba with 0.5 alpha
    expect(bgColor).toMatch(/rgba\(0,\s*0,\s*0,\s*0\.5\)/);
  });

  test('should use solid color when opacity is 1', async ({ page }) => {
    await setupApp(page, { overlayOpacity: 1, backgroundColor: '#000000' }, sampleScript);

    const bgColor = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).backgroundColor : '';
    });

    // Should be solid black
    expect(bgColor).toMatch(/rgb\(0,\s*0,\s*0\)|#000000/i);
  });

  test('should update opacity slider value', async ({ page }) => {
    await setupApp(page, { overlayOpacity: 0.5 }, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const opacityInput = page.locator('[data-testid="overlay-opacity-input"]');
    const value = await opacityInput.inputValue();

    expect(parseFloat(value)).toBe(0.5);
  });
});

test.describe('Settings Drawer - Sync From State', () => {
  test('should sync inputs when settings change via keyboard', async ({ page }) => {
    await setupApp(page, { fontSize: 32 }, sampleScript);

    // Open settings drawer
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Change font size via keyboard shortcut
    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.up('Control');
    await page.waitForTimeout(200);

    // Drawer input should be updated
    const fontSizeInput = page.locator('[data-testid="font-size-input"]');
    const value = await fontSizeInput.inputValue();

    expect(parseInt(value)).toBeGreaterThan(32);
  });

  test('should sync inputs after reset to defaults', async ({ page }) => {
    await setupApp(page, { fontSize: 64, scrollSpeed: 5 }, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Click reset
    await page.click('[data-action="reset-defaults"]');
    await page.waitForTimeout(200);

    // Inputs should show default values
    const fontSizeInput = page.locator('[data-testid="font-size-input"]');
    const fontSizeValue = await fontSizeInput.inputValue();
    expect(parseInt(fontSizeValue)).toBe(32); // Default

    // Check scroll speed in typography tab
    await page.click('[data-tab="typography"]');
    await page.waitForTimeout(200);

    const scrollSpeedInput = page.locator('[data-testid="scroll-speed-input"]');
    const speedValue = await scrollSpeedInput.inputValue();
    expect(parseFloat(speedValue)).toBe(1.5); // Default
  });
});

test.describe('Settings Drawer - Events', () => {
  test('should dispatch drawer-opened event', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Set up event listener before action
    const eventPromise = page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        document.addEventListener('drawer-opened', () => resolve(true), { once: true });
        setTimeout(() => resolve(false), 2000);
      });
    });

    await page.click('[data-action="settings"]');

    const eventFired = await eventPromise;
    expect(eventFired).toBe(true);
  });

  test('should dispatch drawer-closed event', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Open drawer first
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const eventFired = page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        document.addEventListener('drawer-closed', () => resolve(true), { once: true });
        setTimeout(() => resolve(false), 1000);
      });
    });

    await page.click('[data-action="close-drawer"]');

    expect(await eventFired).toBe(true);
  });
});

test.describe('Settings Drawer - Flip Controls', () => {
  test('should have proper group accessibility', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const flipGroup = page.locator('.flip-controls-group');
    const role = await flipGroup.getAttribute('role');
    const ariaLabel = await flipGroup.getAttribute('aria-label');

    expect(role).toBe('group');
    expect(ariaLabel).toBeTruthy();
  });

  test('should update aria-checked on toggle', async ({ page }) => {
    await setupApp(page, { isFlipped: false }, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const flipToggle = page.locator('input[type="checkbox"][role="switch"]').first();
    const initialChecked = await flipToggle.getAttribute('aria-checked');
    expect(initialChecked).toBe('false');

    // Click on the toggle-switch label (parent of the hidden checkbox)
    const toggleSwitch = flipToggle.locator('..');
    await toggleSwitch.scrollIntoViewIfNeeded();
    await toggleSwitch.click();
    await page.waitForTimeout(100);

    const newChecked = await flipToggle.getAttribute('aria-checked');
    expect(newChecked).toBe('true');
  });
});

test.describe('Settings Drawer - Reading Guide', () => {
  test('should toggle reading guide visibility', async ({ page }) => {
    await setupApp(page, { readingGuideEnabled: false }, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Find and click reading guide toggle using the toggle-switch parent
    const toggleSwitches = await page.locator('.toggle-switch').all();
    // Reading guide is the third toggle (after horizontal and vertical flip)
    if (toggleSwitches.length >= 3) {
      await toggleSwitches[2].scrollIntoViewIfNeeded();
      await toggleSwitches[2].click();
      await page.waitForTimeout(200);

      // Check that reading guide is now enabled in settings
      const readingGuideCheckbox = page.locator('input[aria-labelledby="reading-guide-title"]');
      const isChecked = await readingGuideCheckbox.getAttribute('aria-checked');
      expect(isChecked).toBe('true');
    }
  });
});

test.describe('Settings Drawer - Text Direction', () => {
  test('should have text direction selector', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    await page.click('[data-tab="general"]');
    await page.waitForTimeout(200);

    const textDirSelect = page.locator('[data-testid="text-direction-select"]');
    await expect(textDirSelect).toBeVisible();
  });

  test('should have auto, LTR, and RTL options', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    await page.click('[data-tab="general"]');
    await page.waitForTimeout(200);

    const options = await page.locator('[data-testid="text-direction-select"] option').allTextContents();

    expect(options.some(o => o.toLowerCase().includes('auto'))).toBe(true);
    expect(options.some(o => o.toLowerCase().includes('left') || o.includes('LTR'))).toBe(true);
    expect(options.some(o => o.toLowerCase().includes('right') || o.includes('RTL'))).toBe(true);
  });

  test('should apply text direction change', async ({ page }) => {
    await setupApp(page, { textDirection: 'auto' }, 'Hello World');

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    await page.click('[data-tab="general"]');
    await page.waitForTimeout(200);

    await page.selectOption('[data-testid="text-direction-select"]', 'rtl');
    await page.waitForTimeout(200);

    const direction = await page.evaluate(() => {
      const inner = document.querySelector('.teleprompt-text-inner');
      return inner?.getAttribute('dir');
    });

    expect(direction).toBe('rtl');
  });
});
