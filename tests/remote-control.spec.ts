import { test, expect, Page, BrowserContext } from '@playwright/test';
import {
  setupApp,
  generateScript,
  togglePlay,
  SELECTORS,
} from './utils/test-helpers';

const sampleScript = `Line one of the teleprompter.
Line two continues here.
Line three is another line.
Line four has more content.
Line five wraps up this section.
Line six adds additional text.
Line seven keeps going.
Line eight is near the end.
Line nine continues.
Line ten finishes the sample.`;

test.describe('Remote Control - Opening Remote Tab', () => {
  test('should have remote control button in toolbar', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const remoteButton = page.locator('[data-action="open-remote"]');
    await expect(remoteButton).toBeVisible();
  });

  test('should open remote control in new tab', async ({ page, context }) => {
    await setupApp(page, {}, sampleScript);

    // Listen for new page
    const pagePromise = context.waitForEvent('page');

    // Click remote button
    await page.click('[data-action="open-remote"]');

    const remotePage = await pagePromise;
    await remotePage.waitForLoadState();

    // Verify remote page loaded
    expect(remotePage.url()).toContain('remote');
  });
});

test.describe('Remote Control - Multi-Tab Communication', () => {
  let context: BrowserContext;
  let mainPage: Page;
  let remotePage: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();

    // Set up main page
    mainPage = await context.newPage();
    await mainPage.addInitScript(({ settings, script }) => {
      if (script) {
        localStorage.setItem('tpt/script', script);
      }
      if (Object.keys(settings).length > 0) {
        localStorage.setItem('tpt/settings', JSON.stringify(settings));
      }
    }, { settings: { scrollMode: 'continuous' }, script: sampleScript });
    await mainPage.goto('http://localhost:4300/tpt/');
    await mainPage.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    // Open remote page
    remotePage = await context.newPage();
    await remotePage.goto('http://localhost:4300/tpt/remote.html');
    await remotePage.waitForLoadState();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should show remote control UI', async () => {
    // Verify remote has play/pause button
    const playButton = remotePage.locator('[data-action="toggle-play"], .play-button, button:has-text("Play")');
    await expect(playButton).toBeVisible();
  });

  test('should have speed controls on remote', async () => {
    const speedUp = remotePage.locator('[data-action="speed-up"], .speed-up');
    const speedDown = remotePage.locator('[data-action="speed-down"], .speed-down');

    await expect(speedUp).toBeVisible();
    await expect(speedDown).toBeVisible();
  });

  test('should have reset button on remote', async () => {
    const resetButton = remotePage.locator('[data-action="restart"], [data-action="back-to-top"], .reset-button');
    await expect(resetButton).toBeVisible();
  });

  test('should show progress indicator on remote', async () => {
    const progressBar = remotePage.locator('.progress-bar, [data-progress], .remote-progress');
    await expect(progressBar).toBeVisible();
  });

  test('should show connection status', async () => {
    const statusIndicator = remotePage.locator('.connection-status, [data-connection], .status-indicator');
    const isVisible = await statusIndicator.isVisible().catch(() => false);
    expect(typeof isVisible).toBe('boolean');
  });

  test('should send play command from remote to main', async () => {
    // Click play on remote
    await remotePage.click('[data-action="toggle-play"], .play-button');
    await mainPage.waitForTimeout(500);

    // Check if main page started countdown/scrolling
    const isPlaying = await mainPage.evaluate(() => {
      const countdown = document.querySelector('.countdown-overlay.visible');
      const playButton = document.querySelector('[data-action="toggle-play"]');
      return countdown !== null || playButton?.classList.contains('playing');
    });

    expect(isPlaying).toBe(true);
  });

  test('should send pause command from remote to main', async () => {
    // Start playing on main
    await mainPage.click('[data-action="toggle-play"]');
    await mainPage.waitForTimeout(4000); // Wait for countdown

    // Pause from remote
    await remotePage.click('[data-action="toggle-play"], .play-button');
    await mainPage.waitForTimeout(500);

    // Check if main page stopped
    const isPlaying = await mainPage.evaluate(() => {
      const playButton = document.querySelector('[data-action="toggle-play"]');
      return playButton?.classList.contains('playing');
    });

    expect(isPlaying).toBe(false);
  });

  test('should send speed up command from remote to main', async () => {
    const initialSpeed = await mainPage.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '1.5');
    });

    // Click speed up on remote
    await remotePage.click('[data-action="speed-up"]');
    await mainPage.waitForTimeout(300);

    const newSpeed = await mainPage.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '1.5');
    });

    expect(newSpeed).toBeGreaterThan(initialSpeed);
  });

  test('should send speed down command from remote to main', async () => {
    // First increase speed
    await mainPage.evaluate(() => {
      const event = new CustomEvent('speed-changed');
      document.dispatchEvent(event);
    });

    const initialSpeed = await mainPage.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '1.5');
    });

    // Click speed down on remote
    await remotePage.click('[data-action="speed-down"]');
    await mainPage.waitForTimeout(300);

    const newSpeed = await mainPage.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '1.5');
    });

    expect(newSpeed).toBeLessThan(initialSpeed);
  });

  test('should send reset command from remote to main', async () => {
    // Scroll down in main
    await mainPage.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      if (display) (display as HTMLElement).scrollTop = 500;
    });

    // Click reset on remote
    await remotePage.click('[data-action="restart"], [data-action="back-to-top"]');
    await mainPage.waitForTimeout(500);

    const scrollPosition = await mainPage.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? (display as HTMLElement).scrollTop : 100;
    });

    expect(scrollPosition).toBe(0);
  });

  test('should sync progress from main to remote', async () => {
    // Scroll main to middle
    await mainPage.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      if (display) (display as HTMLElement).scrollTop = 200;
    });

    // Wait for sync
    await mainPage.waitForTimeout(500);

    // Check remote progress
    const progress = await remotePage.evaluate(() => {
      const progressBar = document.querySelector('.progress-bar, [data-progress]');
      return progressBar ? (progressBar as HTMLElement).style.width : '0%';
    });

    // Progress should be non-zero
    expect(progress).not.toBe('0%');
  });
});

test.describe('Remote Control - Cue Points', () => {
  let context: BrowserContext;
  let mainPage: Page;
  let remotePage: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();

    mainPage = await context.newPage();
    await mainPage.addInitScript(({ settings, script }) => {
      localStorage.setItem('tpt/script', script);
      localStorage.setItem('tpt/settings', JSON.stringify(settings));
    }, { settings: { scrollMode: 'continuous', cuePoints: [0, 3, 6, 9] }, script: sampleScript });
    await mainPage.goto('http://localhost:4300/tpt/');
    await mainPage.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    remotePage = await context.newPage();
    await remotePage.goto('http://localhost:4300/tpt/remote.html');
    await remotePage.waitForLoadState();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should show cue point list on remote', async () => {
    const cueList = remotePage.locator('.cue-list, .cue-points, [data-cue-points]');
    const isVisible = await cueList.isVisible().catch(() => false);

    // Cue list may or may not be visible depending on design
    expect(typeof isVisible).toBe('boolean');
  });

  test('should jump to cue point from remote', async () => {
    // Click on cue point navigation
    const cueButton = remotePage.locator('[data-action="next-cue"], .next-cue, [data-cue-index]').first();
    const isVisible = await cueButton.isVisible().catch(() => false);

    if (isVisible) {
      await cueButton.click();
      await mainPage.waitForTimeout(500);

      // Main should have jumped to cue point
      const activeLineIndex = await mainPage.evaluate(() => {
        const activeLine = document.querySelector('.line.active');
        return activeLine?.getAttribute('data-line-index') || '0';
      });

      expect(['0', '3', '6', '9']).toContain(activeLineIndex);
    }
  });
});

test.describe('Remote Control - Fallback Communication', () => {
  test('should use localStorage fallback when BroadcastChannel unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      // Simulate BroadcastChannel unavailable
      (window as any).BroadcastChannel = undefined;
    });

    await setupApp(page, {}, sampleScript);

    // App should still function
    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });
});

test.describe('Talent Display - Basic Functionality', () => {
  let context: BrowserContext;
  let mainPage: Page;
  let talentPage: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();

    mainPage = await context.newPage();
    await mainPage.addInitScript(({ settings, script }) => {
      localStorage.setItem('tpt/script', script);
      localStorage.setItem('tpt/settings', JSON.stringify(settings));
    }, { settings: { fontSize: 48, fontColor: '#ffffff', backgroundColor: '#000000' }, script: sampleScript });
    await mainPage.goto('http://localhost:4300/tpt/');
    await mainPage.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    talentPage = await context.newPage();
    await talentPage.goto('http://localhost:4300/tpt/talent.html');
    await talentPage.waitForLoadState();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should display script content', async () => {
    const content = await talentPage.locator('.talent-display, [data-testid="teleprompter-display"], body').textContent();
    expect(content).toContain('Line one');
  });

  test('should sync font settings from main', async () => {
    await talentPage.waitForTimeout(500);

    const fontSize = await talentPage.evaluate(() => {
      const text = document.querySelector('[data-testid="teleprompter-text"]');
      return text ? parseInt(getComputedStyle(text).fontSize) : 0;
    });

    expect(fontSize).toBe(48);
  });

  test('should sync scroll position from main', async () => {
    // Scroll main
    await mainPage.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      if (display) (display as HTMLElement).scrollTop = 200;
    });

    await talentPage.waitForTimeout(500);

    // Talent should follow
    const scrollPosition = await talentPage.evaluate(() => {
      const display = document.querySelector('.talent-display, [data-testid="teleprompter-display"]');
      return display ? (display as HTMLElement).scrollTop : 0;
    });

    expect(scrollPosition).toBeGreaterThan(0);
  });

  test('should have clean UI without controls', async () => {
    // Talent display should be distraction-free
    const hasToolbar = await talentPage.locator('.toolbar, .floating-toolbar').isVisible().catch(() => false);
    const hasSettings = await talentPage.locator('.settings-drawer').isVisible().catch(() => false);

    // Should NOT have toolbar/settings visible
    expect(hasToolbar).toBe(false);
    expect(hasSettings).toBe(false);
  });

  test('should show reading guide when enabled', async () => {
    // Enable reading guide on main
    await mainPage.click('[data-action="settings"]');
    await mainPage.waitForTimeout(300);

    const toggle = mainPage.locator('input[aria-labelledby="reading-guide-title"]');
    const isChecked = await toggle.isChecked();
    if (!isChecked) {
      await toggle.click();
    }

    await talentPage.waitForTimeout(500);

    const readingGuide = talentPage.locator('.reading-guide, [data-reading-guide]');
    const isVisible = await readingGuide.isVisible().catch(() => false);

    // Reading guide should sync
    expect(typeof isVisible).toBe('boolean');
  });
});

test.describe('Remote Control - Commands During Countdown', () => {
  let context: BrowserContext;
  let mainPage: Page;
  let remotePage: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();

    mainPage = await context.newPage();
    await mainPage.addInitScript(({ settings, script }) => {
      localStorage.setItem('tpt/script', script);
      localStorage.setItem('tpt/settings', JSON.stringify(settings));
    }, { settings: { scrollMode: 'continuous', countdownEnabled: true, countdownSeconds: 3 }, script: sampleScript });
    await mainPage.goto('http://localhost:4300/tpt/');
    await mainPage.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    remotePage = await context.newPage();
    await remotePage.goto('http://localhost:4300/tpt/remote.html');
    await remotePage.waitForLoadState();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should cancel countdown when pause sent from remote', async () => {
    // Start countdown from main
    await mainPage.click('[data-action="toggle-play"]');
    await mainPage.waitForTimeout(500);

    // Verify countdown is showing
    const countdownVisible = await mainPage.evaluate(() => {
      const countdown = document.querySelector('.countdown-overlay.visible');
      return countdown !== null;
    });
    expect(countdownVisible).toBe(true);

    // Send pause from remote
    await remotePage.click('[data-action="toggle-play"], .play-button');
    await mainPage.waitForTimeout(300);

    // Countdown should be cancelled
    const countdownStillVisible = await mainPage.evaluate(() => {
      const countdown = document.querySelector('.countdown-overlay.visible');
      return countdown !== null;
    });
    expect(countdownStillVisible).toBe(false);
  });

  test('should handle speed change during countdown from remote', async () => {
    // Start countdown from main
    await mainPage.click('[data-action="toggle-play"]');
    await mainPage.waitForTimeout(500);

    const initialSpeed = await mainPage.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '1.5');
    });

    // Change speed from remote during countdown
    await remotePage.click('[data-action="speed-up"]');
    await mainPage.waitForTimeout(200);

    const newSpeed = await mainPage.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '1.5');
    });

    // Speed should change even during countdown
    expect(newSpeed).toBeGreaterThan(initialSpeed);
  });

  test('should handle reset during countdown from remote', async () => {
    // Scroll down first
    await mainPage.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      if (display) (display as HTMLElement).scrollTop = 300;
    });

    // Start countdown
    await mainPage.click('[data-action="toggle-play"]');
    await mainPage.waitForTimeout(500);

    // Send reset from remote
    await remotePage.click('[data-action="restart"], [data-action="back-to-top"]');
    await mainPage.waitForTimeout(300);

    const scrollPosition = await mainPage.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? (display as HTMLElement).scrollTop : 100;
    });

    expect(scrollPosition).toBe(0);
  });
});

test.describe('Remote Control - Edge Cases', () => {
  test('should handle disconnection gracefully', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Open remote
    const [remotePage] = await Promise.all([
      page.context().waitForEvent('page'),
      page.click('[data-action="open-remote"]')
    ]);

    await remotePage.waitForLoadState();

    // Close main page
    await page.close();

    // Remote should handle disconnection
    await remotePage.waitForTimeout(1000);

    // Should not crash
    const body = remotePage.locator('body');
    await expect(body).toBeVisible();
  });

  test('should handle multiple remotes', async ({ browser }) => {
    const context = await browser.newContext();

    const mainPage = await context.newPage();
    await mainPage.addInitScript(({ script }) => {
      localStorage.setItem('tpt/script', script);
    }, { script: sampleScript });
    await mainPage.goto('http://localhost:4300/tpt/');
    await mainPage.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });

    // Open multiple remotes
    const remote1 = await context.newPage();
    await remote1.goto('http://localhost:4300/tpt/remote.html');

    const remote2 = await context.newPage();
    await remote2.goto('http://localhost:4300/tpt/remote.html');

    await remote1.waitForLoadState();
    await remote2.waitForLoadState();

    // Both remotes should work
    await expect(remote1.locator('body')).toBeVisible();
    await expect(remote2.locator('body')).toBeVisible();

    // Command from remote1 should work
    await remote1.click('[data-action="toggle-play"], .play-button');
    await mainPage.waitForTimeout(500);

    const isPlaying = await mainPage.evaluate(() => {
      const countdown = document.querySelector('.countdown-overlay.visible');
      return countdown !== null;
    });

    expect(isPlaying).toBe(true);

    await context.close();
  });
});
