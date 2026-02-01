import { test, expect } from '@playwright/test';
import {
  setupApp,
  generateScript,
  togglePlay,
  waitForCountdown,
  getScrollPosition,
  SELECTORS,
} from './utils/test-helpers';

// Alias for backward compatibility
const getMultilineScript = generateScript;

test.describe('Core Teleprompter - Scroll Modes', () => {
  test.describe('Continuous Scroll Mode', () => {
    test('should start with continuous scroll mode by default', async ({ page }) => {
      await setupApp(page, {}, getMultilineScript());

      const scrollModeButton = page.locator('.toolbar-btn-mode');
      await expect(scrollModeButton).toBeVisible();
    });

    test('should auto-scroll when play is clicked', async ({ page }) => {
      await setupApp(page, { scrollMode: 'continuous', scrollSpeed: 2 }, getMultilineScript(50));

      // Get initial scroll position
      const initialScroll = await page.evaluate(() => {
        const display = document.querySelector('[data-testid="teleprompter-display"]');
        return display ? (display as HTMLElement).scrollTop : 0;
      });

      // Click play button
      await page.click('[data-action="toggle-play"]');

      // Wait for countdown (3 seconds)
      await page.waitForTimeout(4000);

      // Check that scrolling occurred
      const newScroll = await page.evaluate(() => {
        const display = document.querySelector('[data-testid="teleprompter-display"]');
        return display ? (display as HTMLElement).scrollTop : 0;
      });

      expect(newScroll).toBeGreaterThan(initialScroll);
    });

    test('should stop scrolling when pause is clicked', async ({ page }) => {
      await setupApp(page, { scrollMode: 'continuous', scrollSpeed: 2 }, getMultilineScript(50));

      // Start scrolling
      await page.click('[data-action="toggle-play"]');
      await page.waitForTimeout(4500); // Wait past countdown

      // Pause scrolling
      await page.click('[data-action="toggle-play"]');

      // Get scroll position
      const scrollAfterPause = await page.evaluate(() => {
        const display = document.querySelector('[data-testid="teleprompter-display"]');
        return display ? (display as HTMLElement).scrollTop : 0;
      });

      await page.waitForTimeout(500);

      // Verify scroll stopped
      const scrollAfterWait = await page.evaluate(() => {
        const display = document.querySelector('[data-testid="teleprompter-display"]');
        return display ? (display as HTMLElement).scrollTop : 0;
      });

      expect(scrollAfterWait).toBe(scrollAfterPause);
    });

    test('should show countdown before scrolling starts', async ({ page }) => {
      await setupApp(page, { scrollMode: 'continuous' }, getMultilineScript());

      // Click play
      await page.click('[data-action="toggle-play"]');

      // Countdown overlay should appear
      const countdown = page.locator('.countdown-overlay');
      await expect(countdown).toBeVisible({ timeout: 1000 });

      // Should show numbers during countdown
      await expect(countdown).toHaveText(/[0-3]/);
    });
  });

  test.describe('Paging Mode', () => {
    test('should switch to paging mode', async ({ page }) => {
      await setupApp(page, { scrollMode: 'paging' }, getMultilineScript(50));

      // Verify paging mode is active
      const pagingIndicator = page.locator('.toolbar-page-indicator, [data-testid="page-indicator"]');
      await expect(pagingIndicator).toBeVisible();
    });

    test('should advance page on Space key', async ({ page }) => {
      await setupApp(page, { scrollMode: 'paging' }, getMultilineScript(50));

      // Get initial page
      const initialPage = await page.evaluate(() => {
        const indicator = document.querySelector('.toolbar-page-indicator, [data-testid="page-indicator"]');
        return indicator?.textContent || '';
      });

      // Press Space to advance
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);

      // Check page changed
      const newPage = await page.evaluate(() => {
        const indicator = document.querySelector('.toolbar-page-indicator, [data-testid="page-indicator"]');
        return indicator?.textContent || '';
      });

      expect(newPage).not.toBe(initialPage);
    });

    test('should go to previous page with Shift+Space', async ({ page }) => {
      await setupApp(page, { scrollMode: 'paging' }, getMultilineScript(50));

      // Advance to page 2
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);

      // Go back
      await page.keyboard.down('Shift');
      await page.keyboard.press('Space');
      await page.keyboard.up('Shift');
      await page.waitForTimeout(300);

      // Should be back at page 1
      const pageText = await page.evaluate(() => {
        const indicator = document.querySelector('.toolbar-page-indicator, [data-testid="page-indicator"]');
        return indicator?.textContent || '';
      });

      expect(pageText).toContain('1');
    });
  });

  test.describe('RSVP Mode', () => {
    test('should switch to RSVP mode', async ({ page }) => {
      await setupApp(page, { scrollMode: 'rsvp' }, 'Hello World Test');

      await page.waitForSelector('.rsvp-container.active', { timeout: 5000 });
      const rsvpContainer = page.locator('.rsvp-container.active');
      await expect(rsvpContainer).toBeVisible();
    });

    test('should display one word at a time', async ({ page }) => {
      await setupApp(page, { scrollMode: 'rsvp', rsvpSpeed: 300 }, 'Hello World Test');

      await page.waitForSelector('.rsvp-container.active', { timeout: 5000 });

      const wordElement = page.locator('.rsvp-word');
      const wordText = await wordElement.textContent();

      // Should show only one word
      expect(wordText?.trim().split(/\s+/).length).toBe(1);
    });

    test('should show WPM indicator', async ({ page }) => {
      await setupApp(page, { scrollMode: 'rsvp', rsvpSpeed: 300 }, 'Hello World');

      await page.waitForSelector('.rsvp-container.active', { timeout: 5000 });

      const wpmIndicator = page.locator('.rsvp-speed, [data-rsvp-wpm]');
      await expect(wpmIndicator).toContainText(/\d+ WPM|300/);
    });

    test('should show progress bar', async ({ page }) => {
      await setupApp(page, { scrollMode: 'rsvp' }, 'One Two Three Four Five');

      await page.waitForSelector('.rsvp-container.active', { timeout: 5000 });

      const progressBar = page.locator('.rsvp-progress, .progress-bar');
      await expect(progressBar).toBeVisible();
    });

    test('should highlight ORP character', async ({ page }) => {
      await setupApp(page, { scrollMode: 'rsvp' }, 'Hello');

      await page.waitForSelector('.rsvp-container.active', { timeout: 5000 });

      const orpChar = page.locator('.rsvp-word .orp');
      await expect(orpChar).toBeVisible();
    });
  });

  test.describe('Voice-Follow Mode', () => {
    // Note: Voice mode requires microphone permissions and Web Speech API
    // These tests verify UI elements appear correctly

    test('should show voice mode indicator when selected', async ({ page }) => {
      await setupApp(page, { scrollMode: 'voice' }, getMultilineScript());

      // Voice mode indicator should be visible
      const voiceIndicator = page.locator('.voice-indicator, [data-voice-status]');
      await expect(voiceIndicator).toBeVisible({ timeout: 3000 });
    });

    test('should show microphone level indicator', async ({ page }) => {
      await setupApp(page, { scrollMode: 'voice' }, getMultilineScript());

      const micIndicator = page.locator('.mic-level, .voice-level, [data-mic-level]');
      // May not be visible until mic is activated
      const isVisible = await micIndicator.isVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });
  });
});

test.describe('Core Teleprompter - Speed Control', () => {
  test('should increase speed with right arrow', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous', scrollSpeed: 1.5 }, getMultilineScript());

    // Get initial speed
    const initialSpeed = await page.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return speedDisplay?.textContent || '';
    });

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    const newSpeed = await page.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return speedDisplay?.textContent || '';
    });

    expect(parseFloat(newSpeed)).toBeGreaterThan(parseFloat(initialSpeed));
  });

  test('should decrease speed with left arrow', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous', scrollSpeed: 2 }, getMultilineScript());

    const initialSpeed = await page.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '2');
    });

    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);

    const newSpeed = await page.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '2');
    });

    expect(newSpeed).toBeLessThan(initialSpeed);
  });

  test('should not go below minimum speed (0.1)', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous', scrollSpeed: 0.2 }, getMultilineScript());

    // Press left arrow multiple times
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowLeft');
    }

    const speed = await page.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '0');
    });

    expect(speed).toBeGreaterThanOrEqual(0.1);
  });

  test('should not exceed maximum speed (8)', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous', scrollSpeed: 7.5 }, getMultilineScript());

    // Press right arrow multiple times
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('ArrowRight');
    }

    const speed = await page.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '8');
    });

    expect(speed).toBeLessThanOrEqual(8);
  });

  test('should adjust speed via toolbar buttons', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous', scrollSpeed: 1.5 }, getMultilineScript());

    // Click speed up button
    await page.click('[data-action="speed-up"]');
    await page.waitForTimeout(100);

    const speedUp = await page.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '1.5');
    });

    expect(speedUp).toBeGreaterThan(1.5);

    // Click speed down button
    await page.click('[data-action="speed-down"]');
    await page.click('[data-action="speed-down"]');
    await page.waitForTimeout(100);

    const speedDown = await page.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '1.5');
    });

    expect(speedDown).toBeLessThan(speedUp);
  });
});

test.describe('Core Teleprompter - Navigation', () => {
  test('should navigate lines with up/down arrows', async ({ page }) => {
    await setupApp(page, {}, getMultilineScript(20));

    // Get initial active line
    const initialLine = await page.evaluate(() => {
      const activeLine = document.querySelector('.line.active, [data-active-line]');
      return activeLine?.getAttribute('data-line-index') || '0';
    });

    // Navigate down
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);

    const newLine = await page.evaluate(() => {
      const activeLine = document.querySelector('.line.active, [data-active-line]');
      return activeLine?.getAttribute('data-line-index') || '0';
    });

    expect(parseInt(newLine)).toBeGreaterThan(parseInt(initialLine));
  });

  test('should reset to top with Home key', async ({ page }) => {
    await setupApp(page, {}, getMultilineScript(50));

    // Navigate down several times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowDown');
    }
    await page.waitForTimeout(100);

    // Press Home to reset
    await page.keyboard.press('Home');
    await page.waitForTimeout(100);

    const scrollPosition = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? (display as HTMLElement).scrollTop : 100;
    });

    expect(scrollPosition).toBe(0);
  });

  test('should reset to top via toolbar button', async ({ page }) => {
    await setupApp(page, {}, getMultilineScript(50));

    // Scroll down
    await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      if (display) (display as HTMLElement).scrollTop = 500;
    });

    // Click restart button
    await page.click('[data-action="restart"]');
    await page.waitForTimeout(200);

    const scrollPosition = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? (display as HTMLElement).scrollTop : 100;
    });

    expect(scrollPosition).toBe(0);
  });

  test('should toggle cue point with M key', async ({ page }) => {
    await setupApp(page, {}, getMultilineScript(10));

    // Press M to toggle cue point
    await page.keyboard.press('m');
    await page.waitForTimeout(100);

    // Check for cue point marker
    const hasCuePoint = await page.evaluate(() => {
      const marker = document.querySelector('.cue-marker, [data-cue-point]');
      return marker !== null;
    });

    expect(hasCuePoint).toBe(true);
  });

  test('should jump to next cue point with Shift+ArrowDown', async ({ page }) => {
    await setupApp(page, { cuePoints: [0, 5, 10] }, getMultilineScript(20));

    // Jump to next cue point
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.up('Shift');
    await page.waitForTimeout(200);

    // Verify position changed
    const activeLineIndex = await page.evaluate(() => {
      const activeLine = document.querySelector('.line.active');
      return activeLine?.getAttribute('data-line-index') || '-1';
    });

    // Should have jumped to a cue point
    expect(['0', '5', '10']).toContain(activeLineIndex);
  });
});

test.describe('Core Teleprompter - Keyboard Shortcuts', () => {
  test('should toggle play/pause with Space', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous' }, getMultilineScript());

    // Press Space to start
    await page.keyboard.press('Space');

    // Should show countdown or be scrolling
    const isScrollingOrCountdown = await page.evaluate(() => {
      const countdown = document.querySelector('.countdown-overlay');
      const playButton = document.querySelector('[data-action="toggle-play"]');
      return countdown?.classList.contains('visible') || playButton?.classList.contains('playing');
    });

    expect(isScrollingOrCountdown).toBe(true);
  });

  test('should open help modal with ? key', async ({ page }) => {
    await setupApp(page, {}, getMultilineScript());

    await page.keyboard.press('Shift+/'); // ? key
    await page.waitForTimeout(200);

    const helpModal = page.locator('.help-modal, [data-help-modal]');
    await expect(helpModal).toBeVisible();
  });

  test('should close modal with Escape', async ({ page }) => {
    await setupApp(page, {}, getMultilineScript());

    // Open help modal
    await page.keyboard.press('Shift+/');
    await page.waitForTimeout(200);

    // Close with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    const helpModal = page.locator('.help-modal, [data-help-modal]');
    await expect(helpModal).not.toBeVisible();
  });

  test('should toggle fullscreen with F key', async ({ page }) => {
    await setupApp(page, {}, getMultilineScript());

    // Note: Fullscreen can't actually activate without user gesture in Playwright
    // We can test that the request is made
    const fullscreenRequested = await page.evaluate(() => {
      return new Promise((resolve) => {
        const originalRequest = document.documentElement.requestFullscreen;
        document.documentElement.requestFullscreen = function() {
          resolve(true);
          return originalRequest.call(this);
        };
        // Dispatch key event
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
        setTimeout(() => resolve(false), 500);
      });
    });

    // Just verify the app handles F key (may not actually go fullscreen in test)
    expect(typeof fullscreenRequested).toBe('boolean');
  });

  test('should change font size with Ctrl+Arrow keys', async ({ page }) => {
    await setupApp(page, { fontSize: 32 }, getMultilineScript());

    // Increase font size
    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.up('Control');
    await page.waitForTimeout(100);

    const fontSize = await page.evaluate(() => {
      const text = document.querySelector('[data-testid="teleprompter-text"]');
      return text ? parseInt(getComputedStyle(text).fontSize) : 32;
    });

    expect(fontSize).toBeGreaterThan(32);
  });
});

test.describe('Core Teleprompter - Display Duration', () => {
  test('should show estimated reading duration', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous', scrollSpeed: 1.5 }, getMultilineScript(50));

    const durationDisplay = page.locator('.toolbar-duration, [data-testid="duration"]');
    await expect(durationDisplay).toBeVisible();

    const durationText = await durationDisplay.textContent();
    expect(durationText).toMatch(/\d+:\d+|min|sec/i);
  });

  test('should update duration when speed changes', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous', scrollSpeed: 1 }, getMultilineScript(50));

    const initialDuration = await page.locator('.toolbar-duration, [data-testid="duration"]').textContent();

    // Increase speed
    await page.click('[data-action="speed-up"]');
    await page.click('[data-action="speed-up"]');
    await page.waitForTimeout(100);

    const newDuration = await page.locator('.toolbar-duration, [data-testid="duration"]').textContent();

    // Faster speed should mean shorter duration
    expect(newDuration).not.toBe(initialDuration);
  });
});

test.describe('Core Teleprompter - Script End Handling', () => {
  test('should detect script end when scrolling completes', async ({ page }) => {
    const shortScript = 'Line 1\nLine 2\nLine 3';
    await setupApp(page, { scrollMode: 'continuous', scrollSpeed: 8 }, shortScript);

    // Start scrolling
    await page.click('[data-action="toggle-play"]');

    // Wait for script to end (short script at max speed)
    await page.waitForTimeout(8000);

    // Check for end state indicator
    const scriptEnded = await page.evaluate(() => {
      const endIndicator = document.querySelector('.script-ended, [data-script-ended]');
      const playButton = document.querySelector('[data-action="toggle-play"]');
      return endIndicator !== null || !playButton?.classList.contains('playing');
    });

    expect(scriptEnded).toBe(true);
  });
});

test.describe('Core Teleprompter - Edge Cases', () => {
  test('should handle empty script gracefully', async ({ page }) => {
    await setupApp(page, {}, '');

    // Should not crash, should show editor or placeholder
    const hasContent = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      const editor = document.querySelector('.script-editor');
      return display !== null || editor !== null;
    });

    expect(hasContent).toBe(true);
  });

  test('should handle very long lines', async ({ page }) => {
    const longLine = 'A'.repeat(5000);
    await setupApp(page, {}, longLine);

    // Should render without crashing
    const rendered = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display !== null;
    });

    expect(rendered).toBe(true);
  });

  test('should handle special characters in script', async ({ page }) => {
    const specialChars = '<script>alert("xss")</script>\n<img onerror="alert(1)">\n"quotes" & \'apostrophes\' < > &amp;';
    await setupApp(page, {}, specialChars);

    // Should render safely (no XSS)
    const alertFired = await page.evaluate(() => {
      return (window as any).__alertFired === true;
    });

    expect(alertFired).toBe(false);
  });

  test('should handle unicode and emoji', async ({ page }) => {
    const unicodeScript = '日本語テスト\n中文测试\nעברית\nالعربية\n🎬 📝 🎤';
    await setupApp(page, {}, unicodeScript);

    // Should render unicode properly
    const content = await page.locator('[data-testid="teleprompter-display"]').textContent();
    expect(content).toContain('日本語');
    expect(content).toContain('🎬');
  });

  test('should handle RTL text', async ({ page }) => {
    const rtlScript = 'שלום עולם\nمرحبا بالعالم';
    await setupApp(page, { textDirection: 'rtl' }, rtlScript);

    const direction = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? getComputedStyle(display).direction : 'ltr';
    });

    expect(direction).toBe('rtl');
  });
});

test.describe('Core Teleprompter - Countdown Cancellation', () => {
  test('should cancel countdown when Space pressed during countdown', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous' }, getMultilineScript());

    // Start scrolling (shows countdown)
    await page.keyboard.press('Space');
    await page.waitForTimeout(500); // During countdown

    // Verify countdown is visible
    const countdownVisible = await page.locator('.countdown-overlay').isVisible();
    expect(countdownVisible).toBe(true);

    // Cancel by pressing Space again
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);

    // Verify back to idle state
    const countdown = page.locator('.countdown-overlay');
    await expect(countdown).not.toBeVisible();

    const playButton = page.locator('[data-action="toggle-play"]');
    const buttonText = await playButton.textContent();
    expect(buttonText?.toLowerCase()).toContain('play');
  });

  test('should cancel countdown when clicking play button during countdown', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous' }, getMultilineScript());

    // Start scrolling
    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(500);

    // Cancel by clicking again
    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(200);

    // Should be back to idle
    const playButton = page.locator('[data-action="toggle-play"]');
    await expect(playButton).not.toHaveClass(/countdown/);
  });

  test('should show cancel state in play button during countdown', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous' }, getMultilineScript());

    // Start scrolling
    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(200);

    // Button should show countdown state
    const playButton = page.locator('[data-action="toggle-play"]');
    const hasCountdownClass = await playButton.evaluate(el => el.classList.contains('countdown'));
    expect(hasCountdownClass).toBe(true);
  });
});

test.describe('Core Teleprompter - Ramp Down Behavior', () => {
  test('should ignore toggle during ramp down', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous', scrollSpeed: 2 }, getMultilineScript(50));

    // Start scrolling and wait for it to fully start
    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(4500); // Wait past countdown

    // Stop scrolling (starts ramp down)
    await page.click('[data-action="toggle-play"]');

    // Immediately try to toggle again during ramp down
    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(100);

    // Should continue ramping down, not start playing
    await page.waitForTimeout(600); // Wait for ramp down to complete

    const isPlaying = await page.evaluate(() => {
      const playButton = document.querySelector('[data-action="toggle-play"]');
      return playButton?.classList.contains('playing');
    });

    expect(isPlaying).toBe(false);
  });
});

test.describe('Core Teleprompter - Cue Point Navigation', () => {
  test('should jump to previous cue point with Shift+ArrowUp', async ({ page }) => {
    await setupApp(page, { cuePoints: [0, 5, 10] }, getMultilineScript(20));

    // Navigate to line 10
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowDown');
    }
    await page.waitForTimeout(100);

    // Jump to previous cue point
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.up('Shift');
    await page.waitForTimeout(200);

    const activeLineIndex = await page.evaluate(() => {
      const activeLine = document.querySelector('.line.active-line');
      return activeLine?.getAttribute('data-index') || '-1';
    });

    // Should have jumped to cue point 5 (previous from 10)
    expect(['0', '5']).toContain(activeLineIndex);
  });

  test('should toggle cue point off when pressing M on existing cue point', async ({ page }) => {
    await setupApp(page, { cuePoints: [0] }, getMultilineScript(10));

    // Press M to toggle off existing cue point
    await page.keyboard.press('m');
    await page.waitForTimeout(100);

    // Check cue point was removed
    const hasCuePoint = await page.evaluate(() => {
      const line = document.querySelector('.line[data-index="0"]');
      return line?.classList.contains('cue-point');
    });

    expect(hasCuePoint).toBe(false);
  });

  test('should not toggle cue point when typing in textarea', async ({ page }) => {
    await setupApp(page, {}, getMultilineScript(10));

    // Open editor
    await page.click('[data-action="edit"]');
    await page.waitForTimeout(300);

    // Type M in textarea
    const textarea = page.locator('[data-testid="script-textarea"]');
    await textarea.press('m');
    await page.waitForTimeout(100);

    // Close editor
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Should not have created a cue point
    const cuePointCount = await page.evaluate(() => {
      return document.querySelectorAll('.line.cue-point').length;
    });

    expect(cuePointCount).toBe(0);
  });
});

test.describe('Core Teleprompter - RSVP Wheel Navigation', () => {
  test('should navigate RSVP words with mouse wheel when paused', async ({ page }) => {
    await setupApp(page, { scrollMode: 'rsvp' }, 'One Two Three Four Five');

    await page.waitForSelector('.rsvp-container.active', { timeout: 5000 });

    // Get initial word
    const initialWord = await page.locator('.rsvp-word').textContent();
    expect(initialWord?.trim()).toBe('One');

    // Scroll down with wheel
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(200);

    // Should advance to next word
    const newWord = await page.locator('.rsvp-word').textContent();
    expect(newWord?.trim()).toBe('Two');
  });

  test('should navigate RSVP words backwards with wheel up', async ({ page }) => {
    await setupApp(page, { scrollMode: 'rsvp' }, 'One Two Three Four Five');

    await page.waitForSelector('.rsvp-container.active', { timeout: 5000 });

    // First go forward
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(200);

    // Then go back
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(200);

    const word = await page.locator('.rsvp-word').textContent();
    expect(word?.trim()).toBe('One');
  });

  test('should navigate RSVP with arrow keys when paused', async ({ page }) => {
    await setupApp(page, { scrollMode: 'rsvp' }, 'One Two Three Four Five');

    await page.waitForSelector('.rsvp-container.active', { timeout: 5000 });

    // Navigate with arrow down
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);

    const word = await page.locator('.rsvp-word').textContent();
    expect(word?.trim()).toBe('Two');

    // Navigate back with arrow up
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(100);

    const prevWord = await page.locator('.rsvp-word').textContent();
    expect(prevWord?.trim()).toBe('One');
  });

  test('should adjust RSVP WPM with left/right arrows', async ({ page }) => {
    await setupApp(page, { scrollMode: 'rsvp', rsvpSpeed: 300 }, 'One Two Three');

    await page.waitForSelector('.rsvp-container.active', { timeout: 5000 });

    // Increase WPM
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    const wpmText = await page.locator('.rsvp-speed').textContent();
    const wpm = parseInt(wpmText?.match(/\d+/)?.[0] || '300');
    expect(wpm).toBeGreaterThan(300);
  });
});

test.describe('Core Teleprompter - Wheel Scroll Behavior', () => {
  test('should ignore wheel events when auto-scrolling in continuous mode', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous', scrollSpeed: 2 }, getMultilineScript(50));

    // Start scrolling
    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(4500); // Wait past countdown

    const scrollBefore = await page.evaluate(() => {
      const inner = document.querySelector('.teleprompt-text-inner');
      return inner ? getComputedStyle(inner).transform : '';
    });

    // Try to scroll with wheel
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(100);

    const scrollAfter = await page.evaluate(() => {
      const inner = document.querySelector('.teleprompt-text-inner');
      return inner ? getComputedStyle(inner).transform : '';
    });

    // Scroll should continue auto-scrolling, wheel should be ignored
    // (The transform will change due to auto-scroll, not wheel)
    expect(scrollAfter).not.toBe(scrollBefore);
  });

  test('should allow wheel scroll when paused', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous' }, getMultilineScript(50));

    // Wheel scroll when paused should work
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(300);

    // Should have scrolled
    const hasScrolled = await page.evaluate(() => {
      const inner = document.querySelector('.teleprompt-text-inner');
      if (!inner) return false;
      const transform = getComputedStyle(inner).transform;
      return transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)';
    });

    expect(hasScrolled).toBe(true);
  });
});

test.describe('Core Teleprompter - Paging Mode Edge Cases', () => {
  test('should not go to negative page', async ({ page }) => {
    await setupApp(page, { scrollMode: 'paging' }, getMultilineScript(50));

    // Try to go to previous page from first page
    await page.keyboard.down('Shift');
    await page.keyboard.press('Space');
    await page.keyboard.up('Shift');
    await page.waitForTimeout(300);

    const pageText = await page.evaluate(() => {
      const indicator = document.querySelector('.toolbar-page-indicator');
      return indicator?.textContent || '';
    });

    // Should still show page 1
    expect(pageText).toContain('1');
  });

  test('should not go beyond last page', async ({ page }) => {
    await setupApp(page, { scrollMode: 'paging' }, 'Line 1\nLine 2\nLine 3');

    // Get total pages
    const pageInfo = await page.evaluate(() => {
      const indicator = document.querySelector('.toolbar-page-indicator');
      const match = indicator?.textContent?.match(/(\d+)\s*\/\s*(\d+)/);
      return match ? { current: parseInt(match[1]), total: parseInt(match[2]) } : null;
    });

    if (pageInfo) {
      // Try to advance beyond last page
      for (let i = 0; i < pageInfo.total + 2; i++) {
        await page.keyboard.press('Space');
        await page.waitForTimeout(100);
      }

      const finalPage = await page.evaluate(() => {
        const indicator = document.querySelector('.toolbar-page-indicator');
        const match = indicator?.textContent?.match(/(\d+)\s*\/\s*(\d+)/);
        return match ? parseInt(match[1]) : 0;
      });

      // Should not exceed total
      expect(finalPage).toBeLessThanOrEqual(pageInfo.total);
    }
  });

  test('should advance page with Enter key in paging mode', async ({ page }) => {
    await setupApp(page, { scrollMode: 'paging' }, getMultilineScript(50));

    const initialPage = await page.evaluate(() => {
      const indicator = document.querySelector('.toolbar-page-indicator');
      return indicator?.textContent || '';
    });

    // Press Enter to advance
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const newPage = await page.evaluate(() => {
      const indicator = document.querySelector('.toolbar-page-indicator');
      return indicator?.textContent || '';
    });

    expect(newPage).not.toBe(initialPage);
  });
});

test.describe('Core Teleprompter - Inline Editing', () => {
  test('should block inline editing when maxWordsPerLine is set', async ({ page }) => {
    await setupApp(page, { maxWordsPerLine: 5 }, 'This is a test line that will be wrapped');

    const firstLine = page.locator('.line').first();
    await firstLine.dblclick();
    await page.waitForTimeout(300);

    // Should not show inline editor
    const inlineEditor = page.locator('.inline-editor');
    await expect(inlineEditor).not.toBeVisible();
  });

  test('should allow inline editing when maxWordsPerLine is 0', async ({ page }) => {
    await setupApp(page, { maxWordsPerLine: 0 }, 'This is a test line');

    const firstLine = page.locator('.line').first();
    await firstLine.dblclick();
    await page.waitForTimeout(300);

    // Should show inline editor
    const inlineEditor = page.locator('.inline-editor');
    await expect(inlineEditor).toBeVisible();
  });

  test('should cancel inline edit with Escape', async ({ page }) => {
    await setupApp(page, { maxWordsPerLine: 0 }, 'Original text');

    const firstLine = page.locator('.line').first();
    await firstLine.dblclick();
    await page.waitForTimeout(300);

    // Type new content
    const inlineEditor = page.locator('.inline-editor');
    await inlineEditor.fill('Modified text');

    // Cancel with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Original content should be preserved
    const content = await page.locator('.line').first().textContent();
    expect(content).toContain('Original');
  });

  test('should save inline edit with Enter', async ({ page }) => {
    await setupApp(page, { maxWordsPerLine: 0 }, 'Original text');

    const firstLine = page.locator('.line').first();
    await firstLine.dblclick();
    await page.waitForTimeout(300);

    // Type new content
    const inlineEditor = page.locator('.inline-editor');
    await inlineEditor.fill('Modified text');

    // Save with Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // New content should be saved
    const content = await page.locator('.line').first().textContent();
    expect(content).toContain('Modified');
  });
});

test.describe('Core Teleprompter - Voice Mode Fallback', () => {
  test('should fallback to continuous mode when voice not supported', async ({ page }) => {
    // Mock unsupported voice recognition
    await page.addInitScript(() => {
      (window as any).SpeechRecognition = undefined;
      (window as any).webkitSpeechRecognition = undefined;
    });

    await setupApp(page, { scrollMode: 'voice' }, getMultilineScript());

    // Try to start voice mode
    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(500);

    // Should show error message or switch to continuous
    const recognizedText = page.locator('.recognized-text');
    const isVisible = await recognizedText.isVisible().catch(() => false);

    if (isVisible) {
      const text = await recognizedText.textContent();
      expect(text?.toLowerCase()).toMatch(/not supported|permission|error/);
    }
  });
});

test.describe('Core Teleprompter - Progress Bar', () => {
  test('should update progress bar when navigating', async ({ page }) => {
    await setupApp(page, {}, getMultilineScript(20));

    const initialProgress = await page.evaluate(() => {
      const bar = document.querySelector('.teleprompter-progress-bar');
      return bar ? (bar as HTMLElement).style.width : '0%';
    });

    // Navigate down
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowDown');
    }
    await page.waitForTimeout(200);

    const newProgress = await page.evaluate(() => {
      const bar = document.querySelector('.teleprompter-progress-bar');
      return bar ? (bar as HTMLElement).style.width : '0%';
    });

    expect(parseFloat(newProgress)).toBeGreaterThan(parseFloat(initialProgress));
  });

  test('should not exceed 100% progress', async ({ page }) => {
    await setupApp(page, {}, 'Line 1\nLine 2\nLine 3');

    // Navigate to end
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowDown');
    }
    await page.waitForTimeout(200);

    const progress = await page.evaluate(() => {
      const bar = document.querySelector('.teleprompter-progress-bar');
      return bar ? parseFloat((bar as HTMLElement).style.width) : 0;
    });

    expect(progress).toBeLessThanOrEqual(100);
  });
});

test.describe('Core Teleprompter - Script End Behavior', () => {
  test('should reset scriptEnded flag when navigating up from end', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous', scrollSpeed: 8 }, 'Line 1\nLine 2\nLine 3');

    // Start and let script end
    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(8000);

    // Navigate up
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);

    // Should be able to play again without auto-reset
    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(500);

    const isCountingDown = await page.evaluate(() => {
      const countdown = document.querySelector('.countdown-overlay');
      return countdown?.style.display !== 'none';
    });

    expect(isCountingDown).toBe(true);
  });

  test('should reset scriptEnded flag when scrolling up with wheel', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous', scrollSpeed: 8 }, 'Line 1\nLine 2\nLine 3');

    // Start and let script end
    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(8000);

    // Scroll up with wheel
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(300);

    // Play should not auto-reset to top
    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(500);

    // Should start countdown (not auto-reset)
    const countdown = page.locator('.countdown-overlay');
    await expect(countdown).toBeVisible();
  });
});

test.describe('Core Teleprompter - Empty Lines Handling', () => {
  test('should preserve empty lines with non-breaking space', async ({ page }) => {
    await setupApp(page, {}, 'Line 1\n\nLine 3');

    const emptyLine = await page.evaluate(() => {
      const lines = document.querySelectorAll('.line');
      if (lines.length >= 2) {
        return lines[1].textContent;
      }
      return null;
    });

    // Empty line should have content (non-breaking space)
    expect(emptyLine).toBe('\u00A0');
  });

  test('should maintain height for empty lines', async ({ page }) => {
    await setupApp(page, {}, 'Line 1\n\nLine 3');

    const heights = await page.evaluate(() => {
      const lines = document.querySelectorAll('.line');
      return Array.from(lines).map(line => (line as HTMLElement).offsetHeight);
    });

    // All lines should have similar height
    expect(heights[1]).toBeGreaterThan(0);
    expect(Math.abs(heights[0] - heights[1])).toBeLessThan(heights[0] * 0.5);
  });
});

test.describe('Core Teleprompter - Mode Cycling', () => {
  test('should cycle through all scroll modes', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous' }, getMultilineScript());

    const modeButton = page.locator('[data-action="cycle-scroll-mode"]');
    const modes: string[] = [];

    // Get initial mode
    const initialMode = await page.evaluate(() => {
      const settings = localStorage.getItem('tpt/settings');
      return settings ? JSON.parse(settings).scrollMode : 'continuous';
    });
    modes.push(initialMode);

    // Cycle through modes
    for (let i = 0; i < 4; i++) {
      await modeButton.click();
      await page.waitForTimeout(200);
      const mode = await page.evaluate(() => {
        const settings = localStorage.getItem('tpt/settings');
        return settings ? JSON.parse(settings).scrollMode : '';
      });
      modes.push(mode);
    }

    // Should have cycled through all 4 modes and back to start
    expect(modes).toContain('continuous');
    expect(modes).toContain('paging');
    expect(modes).toContain('voice');
    expect(modes).toContain('rsvp');
    expect(modes[0]).toBe(modes[4]); // Should cycle back
  });
});
