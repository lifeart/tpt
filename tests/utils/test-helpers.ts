import { Page, expect, Locator } from '@playwright/test';

// ============================================================================
// APP SETUP HELPERS
// ============================================================================

export interface AppSettings {
  scrollMode?: 'continuous' | 'paging' | 'rsvp' | 'voice';
  scrollSpeed?: number;
  rsvpWpm?: number;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  backgroundColor?: string;
  lineSpacing?: number;
  letterSpacing?: number;
  horizontalMargin?: number;
  verticalMargin?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  readingGuide?: boolean;
  textDirection?: 'auto' | 'ltr' | 'rtl';
  theme?: 'dark' | 'light' | 'high-contrast';
  countdownSeconds?: number;
  language?: string;
  [key: string]: unknown;
}

/**
 * Set up the app with specific settings and optional script content.
 * Waits for the teleprompter display to be visible.
 */
export async function setupApp(
  page: Page,
  settings: AppSettings = {},
  script?: string
): Promise<void> {
  await page.addInitScript(
    ({ settings, script }) => {
      if (script) {
        localStorage.setItem('tpt/script', script);
      }
      if (Object.keys(settings).length > 0) {
        localStorage.setItem('tpt/settings', JSON.stringify(settings));
      }
    },
    { settings, script }
  );
  await page.goto('/');
  await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });
}

/**
 * Set up the app with settings already in localStorage (useful for persistence tests).
 */
export async function setupAppWithStorage(
  page: Page,
  storageData: Record<string, string>
): Promise<void> {
  await page.addInitScript((data) => {
    Object.entries(data).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  }, storageData);
  await page.goto('/');
  await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 5000 });
}

// ============================================================================
// SCRIPT GENERATORS
// ============================================================================

/**
 * Generate a multiline test script with numbered lines.
 */
export function generateScript(lines: number = 20): string {
  return Array.from(
    { length: lines },
    (_, i) => `Line ${i + 1}: This is test content for the teleprompter.`
  ).join('\n');
}

/**
 * Generate a script with specific word count.
 */
export function generateScriptWithWords(wordCount: number): string {
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(`word${i + 1}`);
    if ((i + 1) % 10 === 0) words.push('\n');
  }
  return words.join(' ').trim();
}

/**
 * Generate RTL script (Hebrew, Arabic, etc.)
 */
export function generateRTLScript(type: 'hebrew' | 'arabic' | 'persian' = 'hebrew'): string {
  const scripts = {
    hebrew: 'שלום עולם. זה טקסט בעברית לבדיקת כיוון RTL.',
    arabic: 'مرحبا بالعالم. هذا نص عربي لاختبار اتجاه RTL.',
    persian: 'سلام دنیا. این یک متن فارسی برای آزمایش جهت RTL است.',
  };
  return scripts[type];
}

/**
 * Generate a long script for scroll testing.
 */
export function generateLongScript(paragraphs: number = 10): string {
  const para = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.';
  return Array.from({ length: paragraphs }, () => para).join('\n\n');
}

// ============================================================================
// UI INTERACTION HELPERS
// ============================================================================

/**
 * Open the settings drawer.
 */
export async function openSettings(page: Page): Promise<void> {
  await page.click('[data-action="settings"]');
  await page.waitForSelector('.settings-drawer', { state: 'visible', timeout: 3000 });
}

/**
 * Close the settings drawer.
 */
export async function closeSettings(page: Page): Promise<void> {
  await page.click('.settings-drawer-backdrop');
  await page.waitForSelector('.settings-drawer', { state: 'hidden', timeout: 3000 });
}

/**
 * Open the script editor.
 */
export async function openEditor(page: Page): Promise<void> {
  await page.click('[data-action="edit"]');
  await page.waitForSelector('[data-testid="script-editor"]', { state: 'visible', timeout: 3000 });
}

/**
 * Close the script editor.
 */
export async function closeEditor(page: Page): Promise<void> {
  await page.click('[data-action="close-editor"]');
  await page.waitForSelector('[data-testid="script-editor"]', { state: 'hidden', timeout: 3000 });
}

/**
 * Toggle play/pause.
 */
export async function togglePlay(page: Page): Promise<void> {
  await page.click('[data-action="toggle-play"]');
}

/**
 * Wait for countdown to complete (default 3 seconds + buffer).
 */
export async function waitForCountdown(page: Page, countdownSeconds: number = 3): Promise<void> {
  await page.waitForTimeout((countdownSeconds + 1) * 1000);
}

/**
 * Start playback and wait for countdown.
 */
export async function startPlayback(page: Page, countdownSeconds: number = 3): Promise<void> {
  await togglePlay(page);
  await waitForCountdown(page, countdownSeconds);
}

/**
 * Change scroll speed using toolbar buttons.
 */
export async function adjustSpeed(page: Page, direction: 'up' | 'down', clicks: number = 1): Promise<void> {
  const selector = direction === 'up' ? '[data-action="speed-up"]' : '[data-action="speed-down"]';
  for (let i = 0; i < clicks; i++) {
    await page.click(selector);
    await page.waitForTimeout(100);
  }
}

/**
 * Reset scroll position to top.
 */
export async function resetToTop(page: Page): Promise<void> {
  await page.click('[data-action="restart"]');
}

// ============================================================================
// SCROLL & POSITION HELPERS
// ============================================================================

/**
 * Get current scroll position of the teleprompter display.
 */
export async function getScrollPosition(page: Page): Promise<number> {
  return page.evaluate(() => {
    const display = document.querySelector('[data-testid="teleprompter-display"]');
    return display ? (display as HTMLElement).scrollTop : 0;
  });
}

/**
 * Set scroll position of the teleprompter display.
 */
export async function setScrollPosition(page: Page, position: number): Promise<void> {
  await page.evaluate((pos) => {
    const display = document.querySelector('[data-testid="teleprompter-display"]');
    if (display) (display as HTMLElement).scrollTop = pos;
  }, position);
}

/**
 * Get the scroll height of the teleprompter display.
 */
export async function getScrollHeight(page: Page): Promise<number> {
  return page.evaluate(() => {
    const display = document.querySelector('[data-testid="teleprompter-display"]');
    return display ? (display as HTMLElement).scrollHeight : 0;
  });
}

/**
 * Check if scrolling is active by comparing positions over time.
 */
export async function isScrolling(page: Page, checkDuration: number = 500): Promise<boolean> {
  const initialPos = await getScrollPosition(page);
  await page.waitForTimeout(checkDuration);
  const finalPos = await getScrollPosition(page);
  return finalPos !== initialPos;
}

// ============================================================================
// SETTINGS HELPERS
// ============================================================================

/**
 * Get current settings from localStorage.
 */
export async function getStoredSettings(page: Page): Promise<AppSettings> {
  return page.evaluate(() => {
    const stored = localStorage.getItem('tpt/settings');
    return stored ? JSON.parse(stored) : {};
  });
}

/**
 * Get stored script from localStorage.
 */
export async function getStoredScript(page: Page): Promise<string> {
  return page.evaluate(() => localStorage.getItem('tpt/script') || '');
}

/**
 * Clear all localStorage data.
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
}

/**
 * Change a setting via the settings drawer UI.
 */
export async function changeSetting(
  page: Page,
  settingSelector: string,
  value: string | number | boolean
): Promise<void> {
  await openSettings(page);
  const element = page.locator(settingSelector);
  const tagName = await element.evaluate((el) => el.tagName.toLowerCase());

  if (tagName === 'select') {
    await element.selectOption(String(value));
  } else if (tagName === 'input') {
    const type = await element.getAttribute('type');
    if (type === 'checkbox') {
      const checked = await element.isChecked();
      if (checked !== value) await element.click();
    } else if (type === 'range') {
      await element.fill(String(value));
    } else if (type === 'color') {
      await element.fill(String(value));
    } else {
      await element.fill(String(value));
    }
  }
  await closeSettings(page);
}

// ============================================================================
// KEYBOARD HELPERS
// ============================================================================

/**
 * Press a keyboard shortcut.
 */
export async function pressKey(
  page: Page,
  key: string,
  modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean } = {}
): Promise<void> {
  const keys: string[] = [];
  if (modifiers.ctrl) keys.push('Control');
  if (modifiers.shift) keys.push('Shift');
  if (modifiers.alt) keys.push('Alt');
  if (modifiers.meta) keys.push('Meta');
  keys.push(key);
  await page.keyboard.press(keys.join('+'));
}

/**
 * Type text into the currently focused element.
 */
export async function typeText(page: Page, text: string, delay: number = 50): Promise<void> {
  await page.keyboard.type(text, { delay });
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert element has specific CSS property value.
 */
export async function expectCssProperty(
  locator: Locator,
  property: string,
  expectedValue: string | RegExp
): Promise<void> {
  const actualValue = await locator.evaluate((el, prop) => {
    return window.getComputedStyle(el).getPropertyValue(prop);
  }, property);

  if (typeof expectedValue === 'string') {
    expect(actualValue).toBe(expectedValue);
  } else {
    expect(actualValue).toMatch(expectedValue);
  }
}

/**
 * Assert element contains text (case-insensitive).
 */
export async function expectContainsText(
  locator: Locator,
  text: string
): Promise<void> {
  const content = await locator.textContent();
  expect(content?.toLowerCase()).toContain(text.toLowerCase());
}

/**
 * Wait for animation/transition to complete.
 */
export async function waitForAnimation(page: Page, duration: number = 300): Promise<void> {
  await page.waitForTimeout(duration);
}

// ============================================================================
// GAMEPAD SIMULATION HELPERS
// ============================================================================

export interface GamepadState {
  id: string;
  index: number;
  connected: boolean;
  mapping: string;
  buttons: Array<{ pressed: boolean; value: number }>;
  axes: number[];
  timestamp: number;
}

/**
 * Create a simulated gamepad with default state.
 */
export function createGamepadState(index: number = 0): GamepadState {
  return {
    id: `Test Gamepad ${index}`,
    index,
    connected: true,
    mapping: 'standard',
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    axes: [0, 0, 0, 0],
    timestamp: Date.now(),
  };
}

/**
 * Simulate gamepad connection in the page.
 */
export async function simulateGamepadConnect(page: Page, gamepadIndex: number = 0): Promise<void> {
  await page.evaluate((index) => {
    const gamepad = {
      id: `Test Gamepad ${index}`,
      index,
      connected: true,
      mapping: 'standard',
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
      axes: [0, 0, 0, 0],
      timestamp: Date.now(),
    };
    (window as any).__testGamepads = (window as any).__testGamepads || [];
    (window as any).__testGamepads[index] = gamepad;

    // Override navigator.getGamepads
    if (!(navigator as any).__originalGetGamepads) {
      (navigator as any).__originalGetGamepads = navigator.getGamepads.bind(navigator);
      (navigator as any).getGamepads = () => (window as any).__testGamepads;
    }

    window.dispatchEvent(new CustomEvent('gamepadconnected', { detail: { gamepad } }));
  }, gamepadIndex);
}

/**
 * Simulate gamepad button press.
 */
export async function pressGamepadButton(
  page: Page,
  buttonIndex: number,
  gamepadIndex: number = 0
): Promise<void> {
  await page.evaluate(
    ({ btnIdx, gpIdx }) => {
      const gamepad = (window as any).__testGamepads?.[gpIdx];
      if (gamepad) {
        gamepad.buttons[btnIdx] = { pressed: true, value: 1 };
        gamepad.timestamp = Date.now();
      }
    },
    { btnIdx: buttonIndex, gpIdx: gamepadIndex }
  );
  await page.waitForTimeout(100);
  await page.evaluate(
    ({ btnIdx, gpIdx }) => {
      const gamepad = (window as any).__testGamepads?.[gpIdx];
      if (gamepad) {
        gamepad.buttons[btnIdx] = { pressed: false, value: 0 };
        gamepad.timestamp = Date.now();
      }
    },
    { btnIdx: buttonIndex, gpIdx: gamepadIndex }
  );
}

// ============================================================================
// TEST DATA CONSTANTS
// ============================================================================

export const SELECTORS = {
  // Main components
  display: '[data-testid="teleprompter-display"]',
  editor: '[data-testid="script-editor"]',
  textarea: '[data-testid="script-textarea"]',
  settingsDrawer: '.settings-drawer',

  // Toolbar actions
  togglePlay: '[data-action="toggle-play"]',
  edit: '[data-action="edit"]',
  settings: '[data-action="settings"]',
  closeEditor: '[data-action="close-editor"]',
  speedUp: '[data-action="speed-up"]',
  speedDown: '[data-action="speed-down"]',
  restart: '[data-action="restart"]',

  // Indicators
  speedValue: '[data-testid="speed-value"]',
  pageIndicator: '[data-testid="page-indicator"]',
  wordCount: '[data-testid="word-count"]',
  duration: '[data-testid="duration"]',

  // Settings controls
  languageSelect: '[data-testid="language-select"]',
  fontSizeSlider: '[data-testid="font-size"]',
  scrollSpeedSlider: '[data-testid="scroll-speed"]',

  // Modal
  helpModal: '[data-testid="help-modal"]',
  countdown: '.countdown-overlay',
} as const;

export const SAMPLE_SCRIPTS = {
  short: 'Hello World. This is a short test script.',
  medium: generateScript(20),
  long: generateScript(100),
  rtlHebrew: generateRTLScript('hebrew'),
  rtlArabic: generateRTLScript('arabic'),
} as const;

export const THEMES = {
  dark: { textColor: '#ffffff', backgroundColor: '#1a1a1a' },
  light: { textColor: '#000000', backgroundColor: '#ffffff' },
  highContrast: { textColor: '#ffff00', backgroundColor: '#000000' },
} as const;
