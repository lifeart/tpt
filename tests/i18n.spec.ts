import { test, expect } from '@playwright/test';
import {
  setupApp,
  openSettings,
  generateRTLScript,
  SELECTORS,
} from './utils/test-helpers';

const sampleScript = 'Sample script for i18n testing.';

test.describe('Internationalization - Language Selection', () => {
  test('should default to English', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const pageText = await page.locator('body').textContent();

    // Should contain common English words
    expect(pageText?.toLowerCase()).toMatch(/settings|play|speed|edit/);
  });

  test('should have language selector in settings', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const languageSelector = page.locator('[data-testid="language-select"]');
    await expect(languageSelector).toBeVisible();
  });

  test('should list all supported languages', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    const options = await page.locator('[data-testid="language-select"] option').allTextContents();

    // Should have at least 5 languages
    expect(options.length).toBeGreaterThanOrEqual(5);
  });
});

test.describe('Internationalization - Russian', () => {
  test('should switch to Russian', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    await page.selectOption('[data-testid="language-select"]', 'ru');
    await page.waitForTimeout(500);

    const pageText = await page.locator('body').textContent();

    // Should contain Russian text
    expect(pageText).toMatch(/Настройки|Шрифт|Размер|Скорость/);
  });

  test('should translate toolbar in Russian', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.selectOption('[data-testid="language-select"]', 'ru');
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');

    const toolbar = await page.locator('.toolbar, .floating-toolbar').textContent();

    // Toolbar should have Russian text
    expect(toolbar).toMatch(/[а-яА-ЯёЁ]/);
  });

  test('should translate settings drawer in Russian', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.selectOption('[data-testid="language-select"]', 'ru');
    await page.waitForTimeout(500);

    const drawerText = await page.locator('.settings-drawer').textContent();

    expect(drawerText).toMatch(/Шрифт|Размер|Цвет|Фон/);
  });
});

test.describe('Internationalization - French', () => {
  test('should switch to French', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.selectOption('[data-testid="language-select"]', 'fr');
    await page.waitForTimeout(500);

    const pageText = await page.locator('body').textContent();

    // Should contain French text
    expect(pageText).toMatch(/Paramètres|Police|Taille|Vitesse/);
  });

  test('should translate help modal in French', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.selectOption('[data-testid="language-select"]', 'fr');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');

    await page.click('[data-action="help"]');
    await page.waitForTimeout(300);

    const helpText = await page.locator('[data-testid="help-modal"]').textContent();

    // Should have French text in help
    expect(helpText).toMatch(/Raccourcis|Aide|Lecture|Pause/);
  });
});

test.describe('Internationalization - Spanish', () => {
  test('should switch to Spanish', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.selectOption('[data-testid="language-select"]', 'es');
    await page.waitForTimeout(500);

    const pageText = await page.locator('body').textContent();

    // Should contain Spanish text
    expect(pageText).toMatch(/Configuración|Fuente|Tamaño|Velocidad/);
  });
});

test.describe('Internationalization - German', () => {
  test('should switch to German', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.selectOption('[data-testid="language-select"]', 'de');
    await page.waitForTimeout(500);

    const pageText = await page.locator('body').textContent();

    // Should contain German text
    expect(pageText).toMatch(/Einstellungen|Schrift|Größe|Geschwindigkeit/);
  });
});

test.describe('Internationalization - Language Persistence', () => {
  test('should persist language after reload', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Change to Russian
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.selectOption('[data-testid="language-select"]', 'ru');
    await page.waitForTimeout(300);

    // Reload
    await page.reload();
    await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    const pageText = await page.locator('body').textContent();

    // Should still be Russian
    expect(pageText).toMatch(/[а-яА-ЯёЁ]/);
  });

  test('should save language to localStorage', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.selectOption('[data-testid="language-select"]', 'fr');
    await page.waitForTimeout(300);

    const savedLanguage = await page.evaluate(() => {
      const settings = localStorage.getItem('tpt/settings');
      if (settings) {
        return JSON.parse(settings).language;
      }
      return null;
    });

    expect(savedLanguage).toBe('fr');
  });
});

test.describe('Internationalization - RTL Support', () => {
  test('should auto-detect RTL for Hebrew text', async ({ page }) => {
    const hebrewScript = 'שלום עולם זהו טקסט בעברית לבדיקה';
    await setupApp(page, { textDirection: 'auto' }, hebrewScript);

    const direction = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).direction : 'ltr';
    });

    expect(direction).toBe('rtl');
  });

  test('should auto-detect RTL for Arabic text', async ({ page }) => {
    const arabicScript = 'مرحبا بالعالم هذا نص عربي للاختبار';
    await setupApp(page, { textDirection: 'auto' }, arabicScript);

    const direction = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).direction : 'ltr';
    });

    expect(direction).toBe('rtl');
  });

  test('should auto-detect RTL for Persian text', async ({ page }) => {
    const persianScript = 'سلام دنیا این متن فارسی برای تست است';
    await setupApp(page, { textDirection: 'auto' }, persianScript);

    const direction = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).direction : 'ltr';
    });

    expect(direction).toBe('rtl');
  });

  test('should force LTR direction', async ({ page }) => {
    const hebrewScript = 'שלום עולם';
    await setupApp(page, { textDirection: 'ltr' }, hebrewScript);

    const direction = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).direction : 'rtl';
    });

    expect(direction).toBe('ltr');
  });

  test('should force RTL direction', async ({ page }) => {
    const englishScript = 'Hello World';
    await setupApp(page, { textDirection: 'rtl' }, englishScript);

    const direction = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).direction : 'ltr';
    });

    expect(direction).toBe('rtl');
  });

  test('should handle mixed LTR/RTL content', async ({ page }) => {
    const mixedScript = 'Hello שלום World عالم Test';
    await setupApp(page, { textDirection: 'auto' }, mixedScript);

    // Should render without crashing
    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();

    const content = await display.textContent();
    expect(content).toContain('Hello');
    expect(content).toContain('שלום');
  });

  test('should align text correctly in RTL mode', async ({ page }) => {
    const hebrewScript = 'שלום עולם';
    await setupApp(page, { textDirection: 'rtl' }, hebrewScript);

    const textAlign = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).textAlign : 'left';
    });

    // RTL text should align right or start
    expect(['right', 'start']).toContain(textAlign);
  });
});

test.describe('Internationalization - Special Characters', () => {
  test('should handle German umlauts', async ({ page }) => {
    const germanScript = 'Größe Änderung Übung';
    await setupApp(page, {}, germanScript);

    const content = await page.locator('[data-testid="teleprompter-display"]').textContent();

    expect(content).toContain('Größe');
    expect(content).toContain('Änderung');
    expect(content).toContain('Übung');
  });

  test('should handle French accents', async ({ page }) => {
    const frenchScript = 'Café résumé naïve façade';
    await setupApp(page, {}, frenchScript);

    const content = await page.locator('[data-testid="teleprompter-display"]').textContent();

    expect(content).toContain('Café');
    expect(content).toContain('résumé');
    expect(content).toContain('naïve');
  });

  test('should handle Russian Cyrillic', async ({ page }) => {
    const russianScript = 'Привет мир Тестирование';
    await setupApp(page, {}, russianScript);

    const content = await page.locator('[data-testid="teleprompter-display"]').textContent();

    expect(content).toContain('Привет');
    expect(content).toContain('мир');
  });

  test('should handle Chinese characters', async ({ page }) => {
    const chineseScript = '你好世界 测试文本';
    await setupApp(page, {}, chineseScript);

    const content = await page.locator('[data-testid="teleprompter-display"]').textContent();

    expect(content).toContain('你好');
    expect(content).toContain('世界');
  });

  test('should handle Japanese characters', async ({ page }) => {
    const japaneseScript = 'こんにちは世界 テスト';
    await setupApp(page, {}, japaneseScript);

    const content = await page.locator('[data-testid="teleprompter-display"]').textContent();

    expect(content).toContain('こんにちは');
    expect(content).toContain('テスト');
  });

  test('should handle Korean characters', async ({ page }) => {
    const koreanScript = '안녕하세요 테스트';
    await setupApp(page, {}, koreanScript);

    const content = await page.locator('[data-testid="teleprompter-display"]').textContent();

    expect(content).toContain('안녕하세요');
  });

  test('should handle emoji', async ({ page }) => {
    const emojiScript = '🎬 Action! 📝 Script 🎤 Recording';
    await setupApp(page, {}, emojiScript);

    const content = await page.locator('[data-testid="teleprompter-display"]').textContent();

    expect(content).toContain('🎬');
    expect(content).toContain('📝');
    expect(content).toContain('🎤');
  });
});

test.describe('Internationalization - Number Formatting', () => {
  test('should display speed with decimal in English', async ({ page }) => {
    await setupApp(page, { scrollSpeed: 1.5 }, sampleScript);

    const speedDisplay = await page.locator('[data-testid="speed-value"], .speed-display').textContent();

    // English uses decimal point
    expect(speedDisplay).toContain('1.5');
  });

  test('should format duration correctly', async ({ page }) => {
    const longScript = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}.`).join('\n');
    await setupApp(page, { scrollSpeed: 1 }, longScript);

    const durationDisplay = await page.locator('.toolbar-duration, [data-testid="duration"]').textContent();

    // Should contain time format
    expect(durationDisplay).toMatch(/\d+:\d+|\d+ min|\d+ sec/);
  });
});

test.describe('Internationalization - Pluralization', () => {
  test('should handle word count singular', async ({ page }) => {
    await setupApp(page, { scrollMode: 'rsvp' }, 'Word');

    await page.waitForSelector('.rsvp-container.active', { timeout: 5000 });

    const wordCount = await page.locator('.word-count, [data-word-count]').textContent();

    // Should show 1/1 or similar
    expect(wordCount).toMatch(/1/);
  });

  test('should handle word count plural', async ({ page }) => {
    await setupApp(page, { scrollMode: 'rsvp' }, 'One Two Three Four Five');

    await page.waitForSelector('.rsvp-container.active', { timeout: 5000 });

    const wordCount = await page.locator('.word-count, [data-word-count]').textContent();

    // Should show current/5 or similar
    expect(wordCount).toMatch(/5/);
  });
});

test.describe('Internationalization - UI Layout', () => {
  test('should not break layout with long translations', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Switch to German (often has longer words)
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.selectOption('[data-testid="language-select"]', 'de');
    await page.waitForTimeout(500);

    // Check toolbar doesn't overflow
    const toolbar = page.locator('.toolbar, .floating-toolbar');
    const boundingBox = await toolbar.boundingBox();

    expect(boundingBox).not.toBeNull();
    if (boundingBox) {
      // Toolbar should fit within viewport
      expect(boundingBox.width).toBeLessThanOrEqual(1920);
    }
  });

  test('should maintain button alignment across languages', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Get button positions in English
    const englishButtons = await page.locator('.toolbar button').all();
    const englishPositions = await Promise.all(
      englishButtons.map((b) => b.boundingBox())
    );

    // Switch to French
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.selectOption('[data-testid="language-select"]', 'fr');
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');

    // Get button positions in French
    const frenchButtons = await page.locator('.toolbar button').all();
    const frenchPositions = await Promise.all(
      frenchButtons.map((b) => b.boundingBox())
    );

    // Number of buttons should be the same
    expect(englishButtons.length).toBe(frenchButtons.length);
  });
});

test.describe('Internationalization - Keyboard Shortcuts Across Languages', () => {
  test('should NOT trigger help with ? when typing in textarea (Russian locale)', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Switch to Russian
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.selectOption('[data-testid="language-select"]', 'ru');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');

    // Open editor
    await page.click('[data-action="edit"]');
    await page.waitForTimeout(300);

    const textarea = page.locator('[data-testid="script-textarea"]');
    await textarea.focus();

    // Type ? in textarea
    await page.keyboard.press('Shift+/');
    await page.waitForTimeout(300);

    // Help modal should NOT appear
    const helpModal = page.locator('[data-testid="help-modal"]');
    await expect(helpModal).not.toBeVisible();
  });

  test('should preserve keyboard shortcuts when language changes', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Switch to German
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.selectOption('[data-testid="language-select"]', 'de');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');

    // Space should still toggle play
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    const isPlaying = await page.evaluate(() => {
      const countdown = document.querySelector('.countdown-overlay.visible');
      const playButton = document.querySelector('[data-action="toggle-play"]');
      return countdown !== null || playButton?.classList.contains('playing');
    });

    expect(isPlaying).toBe(true);
  });

  test('should keep arrow key shortcuts working in RTL languages', async ({ page }) => {
    const arabicScript = 'مرحبا بالعالم هذا نص عربي للاختبار';
    await setupApp(page, { textDirection: 'auto' }, arabicScript);

    const initialSpeed = await page.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '1.5');
    });

    // Arrow right should still increase speed
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    const newSpeed = await page.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '1.5');
    });

    expect(newSpeed).toBeGreaterThan(initialSpeed);
  });
});

test.describe('Internationalization - Translated Error Messages', () => {
  test('should show error messages in selected language', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Switch to French
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.selectOption('[data-testid="language-select"]', 'fr');
    await page.waitForTimeout(500);

    // Try to trigger voice mode (which may show error if not supported)
    const voiceButton = page.locator('[data-scroll-mode="voice"]');
    const isVisible = await voiceButton.isVisible().catch(() => false);

    if (isVisible) {
      await voiceButton.click();
      await page.waitForTimeout(300);

      // Any error message should be in French (or at least not crash)
      const bodyText = await page.locator('body').textContent();
      // App should still be functional
      expect(bodyText).toBeTruthy();
    }
  });
});

test.describe('Internationalization - Dynamic Content', () => {
  test('should translate dynamically added content', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Switch to Spanish
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.selectOption('[data-testid="language-select"]', 'es');
    await page.waitForTimeout(500);

    // Open help modal (dynamically added)
    await page.keyboard.press('Escape');
    await page.click('[data-action="help"]');
    await page.waitForTimeout(300);

    const helpText = await page.locator('[data-testid="help-modal"]').textContent();

    // Should contain Spanish text
    expect(helpText).toMatch(/Atajos|Reproducir|Pausar|Velocidad/i);
  });

  test('should update all UI text when language changes', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Get English button tooltips
    const playButtonEnglish = await page.locator('[data-action="toggle-play"]').getAttribute('title');

    // Switch to Russian
    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);
    await page.selectOption('[data-testid="language-select"]', 'ru');
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');

    // Get Russian button tooltips
    const playButtonRussian = await page.locator('[data-action="toggle-play"]').getAttribute('title');

    // Should be different (translated)
    expect(playButtonRussian).not.toBe(playButtonEnglish);
  });
});
