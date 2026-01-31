#!/usr/bin/env npx tsx

/**
 * Test Generator Script
 *
 * Creates a new test file with boilerplate code.
 *
 * Usage:
 *   pnpm new:test <test-name> [--category <category>]
 *
 * Examples:
 *   pnpm new:test navigation
 *   pnpm new:test dark-mode --category display
 */

import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestConfig {
  name: string;
  category?: string;
  filename: string;
}

function kebabToTitle(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function generateTestTemplate(config: TestConfig): string {
  const titleName = kebabToTitle(config.name);
  const categoryTitle = config.category ? kebabToTitle(config.category) : titleName;

  return `import { test, expect } from '@playwright/test';
import {
  setupApp,
  generateScript,
  openSettings,
  closeSettings,
  togglePlay,
  waitForCountdown,
  getScrollPosition,
  SELECTORS,
  SAMPLE_SCRIPTS,
} from './utils/test-helpers';

// Sample script for testing
const sampleScript = generateScript(20);

test.describe('${categoryTitle} - ${titleName}', () => {
  test.beforeEach(async ({ page }) => {
    // Common setup for all tests in this describe block
    await setupApp(page, {}, sampleScript);
  });

  test('should have correct initial state', async ({ page }) => {
    // Verify initial state
    const display = page.locator(SELECTORS.display);
    await expect(display).toBeVisible();
  });

  test('should handle user interaction', async ({ page }) => {
    // TODO: Add your test logic here
    // Example: Test a specific interaction
    await togglePlay(page);
    await waitForCountdown(page);

    // Add assertions
    const isScrolling = await page.evaluate(() => {
      const display = document.querySelector('[data-testid="teleprompter-display"]');
      return display ? (display as HTMLElement).scrollTop > 0 : false;
    });

    // Placeholder assertion - replace with actual test
    expect(true).toBe(true);
  });

  test('should persist changes', async ({ page }) => {
    // TODO: Test persistence behavior
    // Example: Make a change and verify it persists

    // Reload the page
    await page.reload();
    await page.waitForSelector(SELECTORS.display, { timeout: 5000 });

    // Verify the change persisted
    expect(true).toBe(true);
  });
});

test.describe('${categoryTitle} - ${titleName} Edge Cases', () => {
  test('should handle empty state', async ({ page }) => {
    await setupApp(page, {}, '');

    const display = page.locator(SELECTORS.display);
    await expect(display).toBeVisible();
  });

  test('should handle rapid interactions', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // TODO: Test rapid user interactions
    for (let i = 0; i < 5; i++) {
      await togglePlay(page);
      await page.waitForTimeout(100);
    }

    expect(true).toBe(true);
  });
});

// Uncomment and modify these sections as needed:

/*
test.describe('${categoryTitle} - ${titleName} Keyboard Shortcuts', () => {
  test('should respond to keyboard shortcut', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    // Press keyboard shortcut
    await page.keyboard.press('Space');

    // Verify result
    expect(true).toBe(true);
  });
});
*/

/*
test.describe('${categoryTitle} - ${titleName} Settings Integration', () => {
  test('should update when settings change', async ({ page }) => {
    await setupApp(page, {}, sampleScript);

    await openSettings(page);

    // Make setting change
    // await page.selectOption('[data-testid="some-select"]', 'value');

    await closeSettings(page);

    // Verify the change took effect
    expect(true).toBe(true);
  });
});
*/
`;
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Test Generator - Creates a new Playwright test file

Usage:
  pnpm new:test <test-name> [options]

Options:
  --category, -c <name>  Group tests under a category name
  --help, -h             Show this help message

Examples:
  pnpm new:test navigation
  pnpm new:test dark-mode --category display
  pnpm new:test voice-control -c accessibility

The test file will be created at: tests/<test-name>.spec.ts
`);
    process.exit(0);
  }

  const testName = args[0];
  let category: string | undefined;

  const categoryIndex = args.findIndex((arg) => arg === '--category' || arg === '-c');
  if (categoryIndex !== -1 && args[categoryIndex + 1]) {
    category = args[categoryIndex + 1];
  }

  const config: TestConfig = {
    name: testName,
    category,
    filename: `${testName}.spec.ts`,
  };

  const testsDir = join(process.cwd(), 'tests');
  const filePath = join(testsDir, config.filename);

  if (existsSync(filePath)) {
    console.error(`Error: Test file already exists: ${filePath}`);
    process.exit(1);
  }

  const template = generateTestTemplate(config);

  try {
    writeFileSync(filePath, template, 'utf-8');
    console.log(`✓ Created test file: tests/${config.filename}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Open tests/${config.filename}`);
    console.log(`  2. Replace TODO comments with actual test logic`);
    console.log(`  3. Run: pnpm test:file ${testName}`);
  } catch (error) {
    console.error('Error creating test file:', error);
    process.exit(1);
  }
}

main();
