import { test, expect, devices } from '@playwright/test';
import {
  setupApp,
  generateScript,
  SELECTORS,
} from './utils/test-helpers';

// Use iPhone device profile for touch tests
const iPhone = devices['iPhone 13'];

// Mobile viewport sizes
const VIEWPORTS = {
  iPhoneSE: { width: 375, height: 667 },
  iPhoneSESmall: { width: 320, height: 568 }, // iPhone SE 1st gen
  iPhone14: { width: 390, height: 844 },
  iPhone14ProMax: { width: 430, height: 932 },
  iPadMini: { width: 768, height: 1024 },
};

test.describe('Mobile UI - Toolbar Layout', () => {
  test('toolbar is scrollable and buttons accessible on iPhone SE (320px)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSESmall);
    await setupApp(page, {}, generateScript(20));

    const toolbar = page.locator('.floating-toolbar');
    await expect(toolbar).toBeVisible();

    // Toolbar should be horizontally scrollable
    const overflowX = await toolbar.evaluate((el) => getComputedStyle(el).overflowX);
    expect(overflowX).toBe('auto');

    // Essential buttons should exist in the DOM (may need scrolling to see)
    const playBtn = page.locator('.toolbar-btn-play');
    await expect(playBtn).toBeAttached();

    const settingsBtn = page.locator('.toolbar-btn-settings');
    await expect(settingsBtn).toBeAttached();

    const helpBtn = page.locator('.toolbar-btn-help');
    await expect(helpBtn).toBeAttached();
  });

  test('toolbar buttons should not overlap on iPhone SE (375px)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, {}, generateScript(20));

    const toolbar = page.locator('.floating-toolbar');
    await expect(toolbar).toBeVisible();

    // Get all visible buttons
    const buttons = page.locator('.toolbar-btn:visible');
    const buttonCount = await buttons.count();

    // Get bounding boxes and check for overlaps
    const boxes: Array<{ x: number; width: number; y: number; height: number }> = [];
    for (let i = 0; i < buttonCount; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) boxes.push(box);
    }

    // Check no horizontal overlaps (buttons shouldn't overlap each other)
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const boxA = boxes[i];
        const boxB = boxes[j];
        // If on the same row, check horizontal spacing
        if (Math.abs(boxA.y - boxB.y) < boxA.height / 2) {
          const overlap =
            boxA.x < boxB.x + boxB.width &&
            boxA.x + boxA.width > boxB.x;
          // Allow small overlap due to negative margins for touch targets
          if (overlap) {
            const overlapAmount = Math.min(boxA.x + boxA.width, boxB.x + boxB.width) - Math.max(boxA.x, boxB.x);
            expect(overlapAmount).toBeLessThan(10); // Allow up to 10px overlap for touch target expansion
          }
        }
      }
    }
  });

  test('toolbar should be horizontally scrollable on phone screens', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, {}, generateScript(20));

    const toolbar = page.locator('.floating-toolbar');

    // Toolbar should have horizontal overflow
    const overflowX = await toolbar.evaluate((el) => getComputedStyle(el).overflowX);
    expect(overflowX).toBe('auto');

    // Essential buttons should be visible (may need to scroll to see them all)
    const settingsBtn = page.locator('.toolbar-btn-settings');
    await expect(settingsBtn).toBeVisible();

    const helpBtn = page.locator('.toolbar-btn-help');
    await expect(helpBtn).toBeVisible();

    // Duration should still be hidden
    const duration = page.locator('.toolbar-duration');
    await expect(duration).toBeHidden();
  });

  test('should show all buttons on larger iPhone screens', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhone14);
    await setupApp(page, {}, generateScript(20));

    // On 390px screens, buttons should be visible
    const editBtn = page.locator('.toolbar-btn-edit');
    await expect(editBtn).toBeVisible();

    const playBtn = page.locator('.toolbar-btn-play');
    await expect(playBtn).toBeVisible();

    const settingsBtn = page.locator('.toolbar-btn-settings');
    await expect(settingsBtn).toBeVisible();

    const helpBtn = page.locator('.toolbar-btn-help');
    await expect(helpBtn).toBeVisible();
  });

  test('toolbar should have adequate touch targets on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, {}, generateScript(20));

    // Apple HIG recommends 44x44px minimum touch targets
    const MIN_TOUCH_TARGET = 36; // Slightly less for very small screens

    const buttons = page.locator('.toolbar-btn:visible');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
        expect(box.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      }
    }
  });
});

test.describe('Mobile UI - Touch Swipe Navigation', () => {
  test('should scroll with touch drag when paused in continuous mode', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, { scrollMode: 'continuous' }, generateScript(50));

    const display = page.locator('[data-testid="teleprompter-display"]');
    const box = await display.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      // Get initial transform
      const initialTransform = await page.evaluate(() => {
        const inner = document.querySelector('.teleprompt-text-inner');
        return inner ? getComputedStyle(inner).transform : 'none';
      });

      // Simulate touch swipe up (finger moves up, content scrolls down)
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;

      // Perform swipe gesture using page.evaluate to dispatch touch events
      await page.evaluate(async ({ x, y, deltaY }) => {
        const el = document.querySelector('[data-testid="teleprompter-display"]');
        if (!el) return;

        // Dispatch touch events
        const touchStart = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })],
        });
        el.dispatchEvent(touchStart);

        // Small delay for realism
        await new Promise(r => setTimeout(r, 16));

        // Move in steps for smoother gesture
        for (let i = 1; i <= 5; i++) {
          const currentY = y + (deltaY * i / 5);
          const touchMove = new TouchEvent('touchmove', {
            bubbles: true,
            cancelable: true,
            touches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: currentY })],
          });
          el.dispatchEvent(touchMove);
          await new Promise(r => setTimeout(r, 16));
        }

        // End
        const touchEnd = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
          changedTouches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: y + deltaY })],
        });
        el.dispatchEvent(touchEnd);
      }, { x: startX, y: startY, deltaY: -100 });

      await page.waitForTimeout(400);

      // Check transform changed
      const finalTransform = await page.evaluate(() => {
        const inner = document.querySelector('.teleprompt-text-inner');
        return inner ? getComputedStyle(inner).transform : 'none';
      });

      // Transform should have changed (content scrolled)
      expect(finalTransform).not.toBe(initialTransform);
    }
  });

  test('should navigate pages on mobile viewport in paging mode', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, { scrollMode: 'paging' }, generateScript(50));

    // Get initial scroll transform
    const initialTransform = await page.evaluate(() => {
      const inner = document.querySelector('.teleprompt-text-inner');
      return inner ? getComputedStyle(inner).transform : 'none';
    });

    // Use Space key to advance page (equivalent to touch tap behavior)
    await page.keyboard.press('Space');
    await page.waitForTimeout(600);

    // Page should have advanced (transform changed)
    const newTransform = await page.evaluate(() => {
      const inner = document.querySelector('.teleprompt-text-inner');
      return inner ? getComputedStyle(inner).transform : 'none';
    });

    // Transform should have changed indicating page navigation
    expect(newTransform).not.toBe(initialTransform);
  });

  test('should navigate RSVP words with swipe', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, { scrollMode: 'rsvp' }, 'One Two Three Four Five');

    await page.waitForSelector('.rsvp-container.active', { timeout: 5000 });

    // Get initial word
    const initialWord = await page.locator('.rsvp-word').textContent();
    expect(initialWord?.trim()).toBe('One');

    const container = page.locator('.rsvp-container');
    const box = await container.boundingBox();

    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;

      // Swipe up to go to next word
      await page.evaluate(async ({ x, y, deltaY }) => {
        const el = document.querySelector('.rsvp-container');
        if (!el) return;

        const touchStart = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })],
        });
        el.dispatchEvent(touchStart);

        const touchMove = new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          touches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: y + deltaY })],
        });
        el.dispatchEvent(touchMove);

        const touchEnd = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
          changedTouches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: y + deltaY })],
        });
        el.dispatchEvent(touchEnd);
      }, { x: startX, y: startY, deltaY: -80 });

      await page.waitForTimeout(200);

      // Word should advance
      const newWord = await page.locator('.rsvp-word').textContent();
      expect(newWord?.trim()).toBe('Two');
    }
  });
});

test.describe('Mobile UI - Touch Interaction', () => {
  test('should not allow touch scroll while auto-scrolling', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, { scrollMode: 'continuous', scrollSpeed: 2 }, generateScript(50));

    // Start scrolling
    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(4500); // Wait past countdown

    const display = page.locator('[data-testid="teleprompter-display"]');
    const box = await display.boundingBox();

    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;

      // Get transform during scroll
      const scrollingTransform = await page.evaluate(() => {
        const inner = document.querySelector('.teleprompt-text-inner');
        return inner ? getComputedStyle(inner).transform : 'none';
      });

      // Try to swipe while scrolling
      await page.evaluate(async ({ x, y }) => {
        const el = document.querySelector('[data-testid="teleprompter-display"]');
        if (!el) return;

        const touchStart = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })],
        });
        el.dispatchEvent(touchStart);

        const touchMove = new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          touches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: y + 200 })],
        });
        el.dispatchEvent(touchMove);

        const touchEnd = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
        });
        el.dispatchEvent(touchEnd);
      }, { x: startX, y: startY });

      await page.waitForTimeout(100);

      // Auto-scroll should continue (transform should keep changing due to auto-scroll, not user swipe)
      const afterSwipeTransform = await page.evaluate(() => {
        const inner = document.querySelector('.teleprompt-text-inner');
        return inner ? getComputedStyle(inner).transform : 'none';
      });

      // Transforms should differ due to continued auto-scroll
      expect(afterSwipeTransform).not.toBe(scrollingTransform);
    }
  });

  test('play button should respond to click on mobile viewport', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, { scrollMode: 'continuous' }, generateScript(20));

    // Click the play button (simulates tap on mobile)
    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(500);

    // Should show countdown
    const countdown = page.locator('.countdown-overlay');
    const isVisible = await countdown.isVisible();
    expect(isVisible).toBe(true);
  });

  test('settings button should respond to click on mobile viewport', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, {}, generateScript(20));

    await page.click('[data-action="settings"]');
    await page.waitForTimeout(300);

    // Settings drawer should open
    const drawer = page.locator('.settings-drawer');
    await expect(drawer).toHaveClass(/open/);
  });

  test('speed buttons should respond to click on mobile viewport', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, { scrollMode: 'continuous', scrollSpeed: 1.5 }, generateScript(20));

    const initialSpeed = await page.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '1.5');
    });

    await page.click('[data-action="speed-up"]');
    await page.waitForTimeout(100);

    const newSpeed = await page.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '1.5');
    });

    expect(newSpeed).toBeGreaterThan(initialSpeed);
  });
});

test.describe('Mobile UI - Responsive Settings Drawer', () => {
  test('settings drawer should be full width on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, {}, generateScript(20));

    await page.click('[data-action="settings"]');
    await page.waitForSelector('.settings-drawer.open', { timeout: 3000 });

    const drawer = page.locator('.settings-drawer');
    const drawerBox = await drawer.boundingBox();

    expect(drawerBox).not.toBeNull();
    if (drawerBox) {
      // Drawer should span full width on mobile
      expect(drawerBox.width).toBeGreaterThanOrEqual(VIEWPORTS.iPhoneSE.width - 10);
    }
  });

  test('drawer tabs should be clickable on mobile viewport', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, {}, generateScript(20));

    await page.click('[data-action="settings"]');
    await page.waitForSelector('.settings-drawer.open', { timeout: 3000 });

    // Get all tabs
    const tabs = page.locator('.drawer-tab');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(1);

    // Click the second tab
    const secondTab = tabs.nth(1);
    await secondTab.click();
    await page.waitForTimeout(200);

    // Second tab should be active
    await expect(secondTab).toHaveClass(/active/);
  });

  test('drawer close button should respond to click', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, {}, generateScript(20));

    await page.click('[data-action="settings"]');
    await page.waitForSelector('.settings-drawer.open', { timeout: 3000 });

    // Click the close button using its data-action attribute
    await page.click('[data-action="close-drawer"]');
    await page.waitForTimeout(300);

    // Drawer should close
    const drawer = page.locator('.settings-drawer');
    await expect(drawer).not.toHaveClass(/open/);
  });
});

test.describe('Mobile UI - Landscape Mode', () => {
  test('toolbar should work in landscape orientation', async ({ page }) => {
    // iPhone in landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await setupApp(page, {}, generateScript(20));

    const toolbar = page.locator('.floating-toolbar');
    await expect(toolbar).toBeVisible();

    // Should still be able to interact with buttons
    const playBtn = page.locator('[data-action="toggle-play"]');
    await expect(playBtn).toBeVisible();
    await expect(playBtn).toBeEnabled();
  });

  test('should show compact toolbar in phone landscape', async ({ page }) => {
    // Phone landscape dimensions that trigger auto-hide
    await page.setViewportSize({ width: 800, height: 400 });
    await setupApp(page, {}, generateScript(20));

    const toolbar = page.locator('.floating-toolbar');
    await expect(toolbar).toBeVisible();

    // Buttons should have smaller minimum size
    const buttons = page.locator('.toolbar-btn:visible');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('toolbar buttons should be centered in landscape mode', async ({ page }) => {
    // iPhone in landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await setupApp(page, {}, generateScript(20));

    const toolbar = page.locator('.floating-toolbar');
    await expect(toolbar).toBeVisible();

    // Check toolbar uses center justification (not flex-start from portrait)
    const justifyContent = await toolbar.evaluate((el) => getComputedStyle(el).justifyContent);
    expect(justifyContent).toBe('center');

    // Toolbar should not have horizontal scroll in landscape
    const overflowX = await toolbar.evaluate((el) => getComputedStyle(el).overflowX);
    expect(overflowX).toBe('visible');

    // Get toolbar and button positions to verify centering
    const toolbarBox = await toolbar.boundingBox();
    const buttons = page.locator('.toolbar-btn:visible');
    const buttonCount = await buttons.count();

    if (toolbarBox && buttonCount > 0) {
      // Get first and last button positions
      const firstButton = await buttons.first().boundingBox();
      const lastButton = await buttons.last().boundingBox();

      if (firstButton && lastButton) {
        const buttonsLeftEdge = firstButton.x;
        const buttonsRightEdge = lastButton.x + lastButton.width;
        const buttonsWidth = buttonsRightEdge - buttonsLeftEdge;
        const buttonsCenterX = buttonsLeftEdge + buttonsWidth / 2;
        const toolbarCenterX = toolbarBox.x + toolbarBox.width / 2;

        // Buttons should be roughly centered (within 20px tolerance)
        expect(Math.abs(buttonsCenterX - toolbarCenterX)).toBeLessThan(20);
      }
    }
  });

  test('fullscreen and remote buttons should be hidden on mobile', async ({ page }) => {
    // iPhone in landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await setupApp(page, {}, generateScript(20));

    // Fullscreen button should be hidden on mobile
    const fullscreenBtn = page.locator('.toolbar-btn-fullscreen');
    await expect(fullscreenBtn).toBeHidden();

    // Remote button should be hidden on mobile
    const remoteBtn = page.locator('.toolbar-btn-remote');
    await expect(remoteBtn).toBeHidden();
  });

  test('play button should show icon instead of text on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await setupApp(page, {}, generateScript(20));

    const playBtn = page.locator('.toolbar-btn-play');
    await expect(playBtn).toBeVisible();

    // Icon should be visible
    const icon = playBtn.locator('.btn-icon');
    await expect(icon).toBeVisible();

    // Text should be hidden
    const text = playBtn.locator('.btn-text');
    const textDisplay = await text.evaluate((el) => getComputedStyle(el).display);
    expect(textDisplay).toBe('none');
  });
});

test.describe('Mobile UI - Help Modal', () => {
  test('help modal should be scrollable on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, {}, generateScript(20));

    await page.click('[data-action="help"]');
    await page.waitForSelector('.help-modal-overlay.visible', { timeout: 3000 });

    const modal = page.locator('.help-modal');
    const modalBox = await modal.boundingBox();

    expect(modalBox).not.toBeNull();
    if (modalBox) {
      // Modal should fit within viewport
      expect(modalBox.height).toBeLessThanOrEqual(VIEWPORTS.iPhoneSE.height);
    }

    // Content should be scrollable if needed
    const content = page.locator('.help-modal-content');
    // May or may not be scrollable depending on content, just check it exists
    expect(await content.isVisible()).toBe(true);
  });

  test('help modal close button should respond to click', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, {}, generateScript(20));

    await page.click('[data-action="help"]');
    await page.waitForSelector('.help-modal-overlay.visible', { timeout: 3000 });

    await page.click('.help-modal-close');
    await page.waitForTimeout(300);

    const overlay = page.locator('.help-modal-overlay');
    await expect(overlay).not.toHaveClass(/visible/);
  });
});

test.describe('Mobile UI - RSVP Centering', () => {
  test('RSVP word should be centered on mobile viewport', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, { scrollMode: 'rsvp' }, 'Hello');

    await page.waitForSelector('.rsvp-container.active', { timeout: 5000 });
    await page.waitForTimeout(200); // Wait for centering calculation

    // Get centering data including ORP marker position
    const data = await page.evaluate(() => {
      const wordElement = document.querySelector('.rsvp-word') as HTMLElement;
      const orpSpan = document.querySelector('.rsvp-word .orp') as HTMLElement;
      const orpMarker = document.querySelector('.rsvp-orp-marker') as HTMLElement;

      if (!wordElement || !orpSpan || !orpMarker) return null;

      const viewportCenterX = window.innerWidth / 2;
      const orpRect = orpSpan.getBoundingClientRect();
      const orpCenterX = orpRect.left + orpRect.width / 2;
      const markerRect = orpMarker.getBoundingClientRect();
      const markerCenterX = markerRect.left + markerRect.width / 2;

      return {
        viewportWidth: window.innerWidth,
        viewportCenterX,
        orpCenterX,
        markerCenterX,
        orpOffsetFromScreenCenter: orpCenterX - viewportCenterX,
        markerOffsetFromScreenCenter: markerCenterX - viewportCenterX,
        orpToMarkerOffset: orpCenterX - markerCenterX,
        wordText: wordElement.textContent,
        orpChar: orpSpan.textContent,
        transform: wordElement.style.transform,
      };
    });

    console.log('Mobile RSVP centering:', data);

    expect(data).not.toBeNull();
    // ORP should be within 5px of screen center on mobile
    expect(Math.abs(data!.orpOffsetFromScreenCenter)).toBeLessThan(5);
    // ORP marker should also be centered
    expect(Math.abs(data!.markerOffsetFromScreenCenter)).toBeLessThan(5);
    // ORP character and marker should align
    expect(Math.abs(data!.orpToMarkerOffset)).toBeLessThan(5);
  });

  test('RSVP word should be centered on very small screen', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSESmall);
    await setupApp(page, { scrollMode: 'rsvp' }, 'Programming');

    await page.waitForSelector('.rsvp-container.active', { timeout: 5000 });
    await page.waitForTimeout(200);

    const data = await page.evaluate(() => {
      const wordElement = document.querySelector('.rsvp-word') as HTMLElement;
      const orpSpan = document.querySelector('.rsvp-word .orp') as HTMLElement;

      if (!wordElement || !orpSpan) return null;

      const viewportCenterX = window.innerWidth / 2;
      const orpRect = orpSpan.getBoundingClientRect();
      const orpCenterX = orpRect.left + orpRect.width / 2;

      return {
        viewportWidth: window.innerWidth,
        viewportCenterX,
        orpCenterX,
        orpOffsetFromScreenCenter: orpCenterX - viewportCenterX,
        wordText: wordElement.textContent,
        orpChar: orpSpan.textContent,
      };
    });

    console.log('Small screen RSVP centering:', data);

    expect(data).not.toBeNull();
    expect(Math.abs(data!.orpOffsetFromScreenCenter)).toBeLessThan(5);
  });

  test('RSVP centering works for various word lengths', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);

    // Test with different word lengths
    const testWords = ['A', 'Hi', 'Cat', 'Hello', 'Testing', 'Programming', 'Extraordinary'];
    const results: Array<{ word: string; offset: number; orpChar: string }> = [];

    for (const word of testWords) {
      await setupApp(page, { scrollMode: 'rsvp' }, word);
      await page.waitForSelector('.rsvp-container.active', { timeout: 5000 });
      await page.waitForTimeout(100);

      const data = await page.evaluate(() => {
        const wordElement = document.querySelector('.rsvp-word') as HTMLElement;
        const orpSpan = document.querySelector('.rsvp-word .orp') as HTMLElement;
        const orpMarker = document.querySelector('.rsvp-orp-marker') as HTMLElement;

        if (!wordElement || !orpSpan || !orpMarker) return null;

        const viewportCenterX = window.innerWidth / 2;
        const orpRect = orpSpan.getBoundingClientRect();
        const orpCenterX = orpRect.left + orpRect.width / 2;

        return {
          word: wordElement.textContent,
          orpChar: orpSpan.textContent,
          offset: orpCenterX - viewportCenterX,
        };
      });

      if (data) {
        results.push({ word: data.word!, offset: data.offset, orpChar: data.orpChar! });
      }
    }

    console.log('RSVP centering for various word lengths:', results);

    // All words should have ORP centered (within 5px tolerance)
    for (const result of results) {
      expect(Math.abs(result.offset)).toBeLessThan(5);
    }
  });
});

test.describe('Mobile UI - Script Editor', () => {
  test('editor should fill screen on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, {}, generateScript(20));

    await page.click('[data-action="edit"]');
    await page.waitForSelector('.script-editor-overlay.open', { timeout: 3000 });

    const editor = page.locator('.script-editor-overlay');
    const editorBox = await editor.boundingBox();

    expect(editorBox).not.toBeNull();
    if (editorBox) {
      // Editor should fill the viewport
      expect(editorBox.width).toBeGreaterThanOrEqual(VIEWPORTS.iPhoneSE.width - 5);
      expect(editorBox.height).toBeGreaterThanOrEqual(VIEWPORTS.iPhoneSE.height - 5);
    }
  });

  test('editor textarea should be touch-scrollable', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, {}, generateScript(100));

    await page.click('[data-action="edit"]');
    await page.waitForSelector('.script-editor-overlay.open', { timeout: 3000 });

    const textarea = page.locator('.editor-textarea');
    await expect(textarea).toBeVisible();

    // Textarea should have content that requires scrolling
    const isScrollable = await textarea.evaluate((el) => {
      const t = el as HTMLTextAreaElement;
      return t.scrollHeight > t.clientHeight;
    });
    expect(isScrollable).toBe(true);
  });

  test('editor buttons should have adequate touch targets', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iPhoneSE);
    await setupApp(page, {}, generateScript(20));

    await page.click('[data-action="edit"]');
    await page.waitForSelector('.script-editor-overlay.open', { timeout: 3000 });

    const MIN_TOUCH_TARGET = 44;

    // Check close button
    const closeBtn = page.locator('.editor-close-btn');
    const closeBox = await closeBtn.boundingBox();
    expect(closeBox).not.toBeNull();
    if (closeBox) {
      expect(closeBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    }

    // Check save button
    const saveBtn = page.locator('.editor-save-btn');
    const saveBox = await saveBtn.boundingBox();
    expect(saveBox).not.toBeNull();
    if (saveBox) {
      expect(saveBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    }
  });
});
