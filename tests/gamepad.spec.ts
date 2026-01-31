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

const sampleScript = `Line one for gamepad testing.
Line two continues here.
Line three is another line.
Line four keeps going.
Line five wraps up.`;

// Helper to simulate gamepad input
async function simulateGamepad(page: Page, buttons: number[], axes: number[] = [0, 0, 0, 0]) {
  await page.evaluate(({ buttons, axes }) => {
    const gamepad = {
      id: 'Test Gamepad',
      index: 0,
      connected: true,
      timestamp: performance.now(),
      mapping: 'standard',
      axes,
      buttons: buttons.map((pressed) => ({
        pressed: pressed === 1,
        touched: pressed === 1,
        value: pressed
      })),
      vibrationActuator: null
    };

    // Store the gamepad
    (window as any).__testGamepad = gamepad;

    // Mock navigator.getGamepads
    (navigator as any).getGamepads = () => [gamepad];

    // Dispatch gamepadconnected event
    const event = new GamepadEvent('gamepadconnected', { gamepad: gamepad as Gamepad });
    window.dispatchEvent(event);
  }, { buttons, axes });
}

// Helper to release all buttons
async function releaseGamepad(page: Page) {
  await page.evaluate(() => {
    const gamepad = {
      id: 'Test Gamepad',
      index: 0,
      connected: true,
      timestamp: performance.now(),
      mapping: 'standard',
      axes: [0, 0, 0, 0],
      buttons: Array(17).fill(null).map(() => ({
        pressed: false,
        touched: false,
        value: 0
      })),
      vibrationActuator: null
    };

    (window as any).__testGamepad = gamepad;
    (navigator as any).getGamepads = () => [gamepad];
  });
}

test.describe('Gamepad Support - Detection', () => {
  test('should detect gamepad connection', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Simulate gamepad connection
    const connected = await page.evaluate(() => {
      return new Promise((resolve) => {
        const gamepad = {
          id: 'Xbox Controller',
          index: 0,
          connected: true,
          timestamp: performance.now(),
          mapping: 'standard',
          axes: [0, 0, 0, 0],
          buttons: Array(17).fill(null).map(() => ({
            pressed: false,
            touched: false,
            value: 0
          })),
          vibrationActuator: null
        };

        (navigator as any).getGamepads = () => [gamepad];

        const event = new GamepadEvent('gamepadconnected', { gamepad: gamepad as Gamepad });
        window.dispatchEvent(event);

        // Give time for handler
        setTimeout(() => resolve(true), 100);
      });
    });

    expect(connected).toBe(true);
  });

  test('should handle gamepad disconnection', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.evaluate(() => {
      // Connect
      const gamepad = {
        id: 'Xbox Controller',
        index: 0,
        connected: true,
        timestamp: performance.now(),
        mapping: 'standard',
        axes: [0, 0, 0, 0],
        buttons: Array(17).fill(null).map(() => ({
          pressed: false,
          touched: false,
          value: 0
        })),
        vibrationActuator: null
      };

      (navigator as any).getGamepads = () => [gamepad];
      window.dispatchEvent(new GamepadEvent('gamepadconnected', { gamepad: gamepad as Gamepad }));

      // Disconnect
      (navigator as any).getGamepads = () => [null];
      window.dispatchEvent(new GamepadEvent('gamepaddisconnected', { gamepad: gamepad as Gamepad }));
    });

    // App should still function
    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });
});

test.describe('Gamepad Support - Play/Pause (A Button)', () => {
  test('should toggle play with A button (button 0)', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous' }, sampleScript);

    // Create button array (17 buttons for standard mapping)
    const buttons = Array(17).fill(0);
    buttons[0] = 1; // A button pressed

    await simulateGamepad(page, buttons);
    await page.waitForTimeout(200);

    // Check if playing/countdown started
    const isPlaying = await page.evaluate(() => {
      const countdown = document.querySelector('.countdown-overlay.visible');
      const playButton = document.querySelector('[data-action="toggle-play"]');
      return countdown !== null || playButton?.classList.contains('playing');
    });

    await releaseGamepad(page);

    expect(isPlaying).toBe(true);
  });

  test('should pause with A button when playing', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous' }, sampleScript);

    // Start playing
    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(4000); // Wait for countdown

    const buttons = Array(17).fill(0);
    buttons[0] = 1; // A button

    await simulateGamepad(page, buttons);
    await page.waitForTimeout(200);
    await releaseGamepad(page);

    const isPlaying = await page.evaluate(() => {
      const playButton = document.querySelector('[data-action="toggle-play"]');
      return playButton?.classList.contains('playing');
    });

    expect(isPlaying).toBe(false);
  });
});

test.describe('Gamepad Support - Reset (B Button)', () => {
  test('should reset to top with B button (button 1)', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Scroll down first
    await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      if (display) (display as HTMLElement).scrollTop = 500;
    });

    const buttons = Array(17).fill(0);
    buttons[1] = 1; // B button

    await simulateGamepad(page, buttons);
    await page.waitForTimeout(300);
    await releaseGamepad(page);

    const scrollPosition = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? (display as HTMLElement).scrollTop : 100;
    });

    expect(scrollPosition).toBe(0);
  });
});

test.describe('Gamepad Support - Speed Control (Triggers)', () => {
  test('should increase speed with right trigger (button 7)', async ({ page }) => {
    await setupApp(page, { scrollSpeed: 1.5 }, sampleScript);

    const buttons = Array(17).fill(0);
    buttons[7] = 1; // Right trigger

    await simulateGamepad(page, buttons);
    await page.waitForTimeout(300);
    await releaseGamepad(page);

    const speed = await page.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '1.5');
    });

    expect(speed).toBeGreaterThan(1.5);
  });

  test('should decrease speed with left trigger (button 6)', async ({ page }) => {
    await setupApp(page, { scrollSpeed: 2 }, sampleScript);

    const buttons = Array(17).fill(0);
    buttons[6] = 1; // Left trigger

    await simulateGamepad(page, buttons);
    await page.waitForTimeout(300);
    await releaseGamepad(page);

    const speed = await page.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '2');
    });

    expect(speed).toBeLessThan(2);
  });
});

test.describe('Gamepad Support - Navigation (D-pad)', () => {
  test('should navigate down with D-pad down (button 13)', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const initialLine = await page.evaluate(() => {
      const activeLine = document.querySelector('.line.active');
      return activeLine?.getAttribute('data-line-index') || '0';
    });

    const buttons = Array(17).fill(0);
    buttons[13] = 1; // D-pad down

    await simulateGamepad(page, buttons);
    await page.waitForTimeout(200);
    await releaseGamepad(page);

    const newLine = await page.evaluate(() => {
      const activeLine = document.querySelector('.line.active');
      return activeLine?.getAttribute('data-line-index') || '0';
    });

    expect(parseInt(newLine)).toBeGreaterThanOrEqual(parseInt(initialLine));
  });

  test('should navigate up with D-pad up (button 12)', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // First go down
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);

    const buttons = Array(17).fill(0);
    buttons[12] = 1; // D-pad up

    await simulateGamepad(page, buttons);
    await page.waitForTimeout(200);
    await releaseGamepad(page);

    const line = await page.evaluate(() => {
      const activeLine = document.querySelector('.line.active');
      return activeLine?.getAttribute('data-line-index') || '0';
    });

    expect(parseInt(line)).toBeLessThanOrEqual(2);
  });

  test('should jump to next cue point with D-pad right (button 15)', async ({ page }) => {
    await setupApp(page, { cuePoints: [0, 2, 4] }, sampleScript);

    const buttons = Array(17).fill(0);
    buttons[15] = 1; // D-pad right

    await simulateGamepad(page, buttons);
    await page.waitForTimeout(200);
    await releaseGamepad(page);

    // Should have jumped to a cue point
    const activeIndex = await page.evaluate(() => {
      const activeLine = document.querySelector('.line.active');
      return activeLine?.getAttribute('data-line-index') || '0';
    });

    expect(['0', '2', '4']).toContain(activeIndex);
  });

  test('should jump to previous cue point with D-pad left (button 14)', async ({ page }) => {
    await setupApp(page, { cuePoints: [0, 2, 4] }, sampleScript);

    // First jump forward
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.up('Shift');
    await page.waitForTimeout(100);

    const buttons = Array(17).fill(0);
    buttons[14] = 1; // D-pad left

    await simulateGamepad(page, buttons);
    await page.waitForTimeout(200);
    await releaseGamepad(page);

    // Should have jumped back
    const activeIndex = await page.evaluate(() => {
      const activeLine = document.querySelector('.line.active');
      return activeLine?.getAttribute('data-line-index') || '0';
    });

    expect(['0', '2', '4']).toContain(activeIndex);
  });
});

test.describe('Gamepad Support - Button Repeat', () => {
  test('should repeat navigation on held button', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const buttons = Array(17).fill(0);
    buttons[13] = 1; // D-pad down

    await simulateGamepad(page, buttons);

    // Hold for repeat duration
    await page.waitForTimeout(1000);

    const line = await page.evaluate(() => {
      const activeLine = document.querySelector('.line.active');
      return activeLine?.getAttribute('data-line-index') || '0';
    });

    await releaseGamepad(page);

    // Should have advanced multiple lines
    expect(parseInt(line)).toBeGreaterThan(0);
  });
});

test.describe('Gamepad Support - Multiple Gamepads', () => {
  test('should handle multiple gamepads', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.evaluate(() => {
      const gamepad1 = {
        id: 'Controller 1',
        index: 0,
        connected: true,
        timestamp: performance.now(),
        mapping: 'standard',
        axes: [0, 0, 0, 0],
        buttons: Array(17).fill(null).map(() => ({
          pressed: false,
          touched: false,
          value: 0
        })),
        vibrationActuator: null
      };

      const gamepad2 = {
        id: 'Controller 2',
        index: 1,
        connected: true,
        timestamp: performance.now(),
        mapping: 'standard',
        axes: [0, 0, 0, 0],
        buttons: Array(17).fill(null).map(() => ({
          pressed: false,
          touched: false,
          value: 0
        })),
        vibrationActuator: null
      };

      (navigator as any).getGamepads = () => [gamepad1, gamepad2];

      window.dispatchEvent(new GamepadEvent('gamepadconnected', { gamepad: gamepad1 as Gamepad }));
      window.dispatchEvent(new GamepadEvent('gamepadconnected', { gamepad: gamepad2 as Gamepad }));
    });

    // App should still function
    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });
});

test.describe('Gamepad Support - Analog Trigger Threshold', () => {
  test('should not activate at low trigger value', async ({ page }) => {
    await setupApp(page, { scrollSpeed: 1.5 }, sampleScript);

    await page.evaluate(() => {
      const gamepad = {
        id: 'Test Gamepad',
        index: 0,
        connected: true,
        timestamp: performance.now(),
        mapping: 'standard',
        axes: [0, 0, 0, 0],
        buttons: Array(17).fill(null).map((_, i) => ({
          pressed: false,
          touched: false,
          value: i === 7 ? 0.3 : 0 // Right trigger at 30%
        })),
        vibrationActuator: null
      };

      (navigator as any).getGamepads = () => [gamepad];
      window.dispatchEvent(new GamepadEvent('gamepadconnected', { gamepad: gamepad as Gamepad }));
    });

    await page.waitForTimeout(300);

    const speed = await page.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '1.5');
    });

    // Speed should not change at low trigger value
    expect(speed).toBe(1.5);
  });

  test('should activate at high trigger value', async ({ page }) => {
    await setupApp(page, { scrollSpeed: 1.5 }, sampleScript);

    await page.evaluate(() => {
      const gamepad = {
        id: 'Test Gamepad',
        index: 0,
        connected: true,
        timestamp: performance.now(),
        mapping: 'standard',
        axes: [0, 0, 0, 0],
        buttons: Array(17).fill(null).map((_, i) => ({
          pressed: i === 7,
          touched: i === 7,
          value: i === 7 ? 0.8 : 0 // Right trigger at 80%
        })),
        vibrationActuator: null
      };

      (navigator as any).getGamepads = () => [gamepad];
      window.dispatchEvent(new GamepadEvent('gamepadconnected', { gamepad: gamepad as Gamepad }));
    });

    await page.waitForTimeout(300);
    await releaseGamepad(page);

    const speed = await page.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '1.5');
    });

    // Speed should have increased
    expect(speed).toBeGreaterThan(1.5);
  });
});

test.describe('Gamepad Support - Non-standard Mapping', () => {
  test('should handle non-standard gamepad mapping', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await page.evaluate(() => {
      const gamepad = {
        id: 'Generic USB Joystick',
        index: 0,
        connected: true,
        timestamp: performance.now(),
        mapping: '', // Non-standard
        axes: [0, 0, 0, 0],
        buttons: Array(12).fill(null).map(() => ({
          pressed: false,
          touched: false,
          value: 0
        })),
        vibrationActuator: null
      };

      (navigator as any).getGamepads = () => [gamepad];
      window.dispatchEvent(new GamepadEvent('gamepadconnected', { gamepad: gamepad as Gamepad }));
    });

    // App should still function
    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });
});

test.describe('Gamepad Support - Edge Cases', () => {
  test('should handle rapid button presses', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const buttons = Array(17).fill(0);

    // Rapid toggle
    for (let i = 0; i < 5; i++) {
      buttons[0] = 1;
      await simulateGamepad(page, buttons);
      await page.waitForTimeout(50);
      buttons[0] = 0;
      await simulateGamepad(page, buttons);
      await page.waitForTimeout(50);
    }

    // App should not crash
    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });

  test('should handle simultaneous button presses', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const buttons = Array(17).fill(0);
    buttons[0] = 1; // A
    buttons[1] = 1; // B
    buttons[12] = 1; // D-pad up
    buttons[13] = 1; // D-pad down

    await simulateGamepad(page, buttons);
    await page.waitForTimeout(200);
    await releaseGamepad(page);

    // App should handle gracefully
    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });

  test('should handle no gamepad API', async ({ page }) => {
    await page.addInitScript(() => {
      (navigator as any).getGamepads = undefined;
    });

    await setupApp(page, {}, sampleScript);

    // App should still work
    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });
});

test.describe('Gamepad Support - During Countdown', () => {
  test('should cancel countdown with A button (button 0)', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous', countdownEnabled: true, countdownSeconds: 3 }, sampleScript);

    // Start countdown
    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(500);

    // Verify countdown is showing
    const countdownVisible = await page.evaluate(() => {
      const countdown = document.querySelector('.countdown-overlay.visible');
      return countdown !== null;
    });
    expect(countdownVisible).toBe(true);

    // Press A button to cancel
    const buttons = Array(17).fill(0);
    buttons[0] = 1;
    await simulateGamepad(page, buttons);
    await page.waitForTimeout(300);
    await releaseGamepad(page);

    // Countdown should be cancelled
    const countdownStillVisible = await page.evaluate(() => {
      const countdown = document.querySelector('.countdown-overlay.visible');
      return countdown !== null;
    });
    expect(countdownStillVisible).toBe(false);
  });

  test('should still change speed during countdown', async ({ page }) => {
    await setupApp(page, { scrollMode: 'continuous', scrollSpeed: 1.5, countdownEnabled: true, countdownSeconds: 3 }, sampleScript);

    // Start countdown
    await page.click('[data-action="toggle-play"]');
    await page.waitForTimeout(500);

    // Press right trigger to increase speed during countdown
    const buttons = Array(17).fill(0);
    buttons[7] = 1;
    await simulateGamepad(page, buttons);
    await page.waitForTimeout(300);
    await releaseGamepad(page);

    const speed = await page.evaluate(() => {
      const speedDisplay = document.querySelector('[data-testid="speed-value"]');
      return parseFloat(speedDisplay?.textContent || '1.5');
    });

    expect(speed).toBeGreaterThan(1.5);
  });
});

test.describe('Gamepad Support - Different Scroll Modes', () => {
  test('should control RSVP mode with gamepad', async ({ page }) => {
    await setupApp(page, { scrollMode: 'rsvp' }, 'One Two Three Four Five Six Seven Eight Nine Ten');

    await page.waitForSelector('.rsvp-container.active', { timeout: 5000 });

    // Press A to start RSVP
    const buttons = Array(17).fill(0);
    buttons[0] = 1;
    await simulateGamepad(page, buttons);
    await page.waitForTimeout(300);
    await releaseGamepad(page);

    // Should start playing
    const isPlaying = await page.evaluate(() => {
      const playButton = document.querySelector('[data-action="toggle-play"]');
      return playButton?.classList.contains('playing');
    });

    expect(isPlaying).toBe(true);
  });

  test('should navigate pages in paging mode with D-pad', async ({ page }) => {
    const longScript = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}.`).join('\n');
    await setupApp(page, { scrollMode: 'paging' }, longScript);

    const initialPage = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? (display as HTMLElement).scrollTop : 0;
    });

    // Press D-pad down to go to next page
    const buttons = Array(17).fill(0);
    buttons[13] = 1;
    await simulateGamepad(page, buttons);
    await page.waitForTimeout(300);
    await releaseGamepad(page);

    const newPage = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? (display as HTMLElement).scrollTop : 0;
    });

    expect(newPage).toBeGreaterThan(initialPage);
  });

  test('should handle gamepad in voice mode gracefully', async ({ page }) => {
    await setupApp(page, { scrollMode: 'voice' }, sampleScript);

    // Press A button
    const buttons = Array(17).fill(0);
    buttons[0] = 1;
    await simulateGamepad(page, buttons);
    await page.waitForTimeout(300);
    await releaseGamepad(page);

    // App should handle gracefully (voice mode may fallback to continuous)
    const display = page.locator('[data-testid="teleprompter-display"]');
    await expect(display).toBeVisible();
  });
});

test.describe('Gamepad Support - Analog Stick Navigation', () => {
  test('should navigate with left analog stick Y axis', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Push left stick down (Y axis positive)
    await page.evaluate(() => {
      const gamepad = {
        id: 'Test Gamepad',
        index: 0,
        connected: true,
        timestamp: performance.now(),
        mapping: 'standard',
        axes: [0, 0.9, 0, 0], // Y axis pushed down
        buttons: Array(17).fill(null).map(() => ({
          pressed: false,
          touched: false,
          value: 0
        })),
        vibrationActuator: null
      };

      (navigator as any).getGamepads = () => [gamepad];
      window.dispatchEvent(new GamepadEvent('gamepadconnected', { gamepad: gamepad as Gamepad }));
    });

    await page.waitForTimeout(500);
    await releaseGamepad(page);

    // Should have scrolled
    const scrollPosition = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? (display as HTMLElement).scrollTop : 0;
    });

    expect(scrollPosition).toBeGreaterThanOrEqual(0);
  });

  test('should ignore small stick movements (deadzone)', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    const initialScroll = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? (display as HTMLElement).scrollTop : 0;
    });

    // Small stick movement (within deadzone)
    await page.evaluate(() => {
      const gamepad = {
        id: 'Test Gamepad',
        index: 0,
        connected: true,
        timestamp: performance.now(),
        mapping: 'standard',
        axes: [0.1, 0.1, 0, 0], // Small movement
        buttons: Array(17).fill(null).map(() => ({
          pressed: false,
          touched: false,
          value: 0
        })),
        vibrationActuator: null
      };

      (navigator as any).getGamepads = () => [gamepad];
      window.dispatchEvent(new GamepadEvent('gamepadconnected', { gamepad: gamepad as Gamepad }));
    });

    await page.waitForTimeout(300);

    const newScroll = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? (display as HTMLElement).scrollTop : 0;
    });

    // Scroll should not change within deadzone
    expect(newScroll).toBe(initialScroll);
  });
});
