#!/usr/bin/env npx tsx

/**
 * Test Report Analyzer
 *
 * Analyzes Playwright test results and provides a summary with actionable insights.
 *
 * Usage:
 *   pnpm test:report
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestFailure {
  testFile: string;
  testName: string;
  errorType: string;
  selector?: string;
  errorMessage: string;
  folderName: string;
}

interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  failures: TestFailure[];
  failuresByFile: Map<string, number>;
  failuresByType: Map<string, number>;
}

function parseTestFileFromFolder(folderName: string): string {
  // Folder format: accessibility-Accessibilit-12f66--should-support-Lexend-font-chromium
  // Extract the test file name from the beginning
  const knownFiles = [
    'accessibility',
    'core-teleprompter',
    'display-customization',
    'gamepad',
    'i18n',
    'remote-control',
    'rsvp-centering',
    'script-editor',
    'settings-drawer',
    'storage-persistence',
    'toolbar-help',
  ];

  for (const file of knownFiles) {
    if (folderName.startsWith(file)) {
      return `${file}.spec.ts`;
    }
  }
  return 'unknown';
}

function parseTestNameFromFolder(folderName: string): string {
  // Extract descriptive parts from folder name
  // Remove hash-like parts (5 char hex) and browser suffix
  const parts = folderName.split('-');
  const cleaned = parts.filter(
    (p) => p.length > 5 && !/^[a-f0-9]{5}$/.test(p) && p !== 'chromium'
  );
  return cleaned.slice(1).join(' ').substring(0, 60);
}

function parseErrorContext(filePath: string, folderName: string): TestFailure | null {
  const testFile = parseTestFileFromFolder(folderName);
  const testName = parseTestNameFromFolder(folderName);

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    let errorType = 'Unknown';
    let errorMessage = '';
    let selector = '';

    // Check if content suggests specific error types
    if (content.includes('timeout') || content.includes('Timeout')) {
      errorType = 'Timeout';
    } else if (content.includes('not found') || content.includes('not visible')) {
      errorType = 'Element Not Found';
    } else if (content.includes('Expected:') || content.includes('Received:')) {
      errorType = 'Assertion Failed';
    }

    // Look for locator patterns
    for (const line of lines) {
      if (line.includes('locator(')) {
        const match = line.match(/locator\(['"]([^'"]+)['"]\)/);
        if (match) {
          selector = match[1];
          break;
        }
      }
      if (line.includes('waiting for locator')) {
        const match = line.match(/locator\(['"]([^'"]+)['"]\)/);
        if (match) {
          selector = match[1];
        }
      }
    }

    return {
      testFile,
      testName,
      errorType,
      selector,
      errorMessage,
      folderName,
    };
  } catch {
    return {
      testFile,
      testName,
      errorType: 'Unknown',
      selector: '',
      errorMessage: '',
      folderName,
    };
  }
}

function analyzeTestResults(resultsDir: string): TestSummary {
  const summary: TestSummary = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    failures: [],
    failuresByFile: new Map(),
    failuresByType: new Map(),
  };

  if (!existsSync(resultsDir)) {
    console.log('No test results found. Run tests first with: pnpm test');
    return summary;
  }

  const entries = readdirSync(resultsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const errorContextPath = join(resultsDir, entry.name, 'error-context.md');
      if (existsSync(errorContextPath)) {
        summary.failed++;
        const failure = parseErrorContext(errorContextPath, entry.name);
        if (failure) {
          summary.failures.push(failure);

          // Count by file
          if (failure.testFile && failure.testFile !== 'unknown') {
            const fileCount = summary.failuresByFile.get(failure.testFile) || 0;
            summary.failuresByFile.set(failure.testFile, fileCount + 1);
          }

          // Count by type
          const typeCount = summary.failuresByType.get(failure.errorType) || 0;
          summary.failuresByType.set(failure.errorType, typeCount + 1);
        }
      }
    }
  }

  return summary;
}

function printSummary(summary: TestSummary): void {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST RESULTS SUMMARY                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (summary.failed === 0) {
    console.log('✅ No test failures found in test-results directory.\n');
    return;
  }

  console.log(`📊 Failed Tests: ${summary.failed}`);
  console.log('');

  // Failures by file
  console.log('📁 Failures by File:');
  console.log('─'.repeat(50));
  const sortedFiles = [...summary.failuresByFile.entries()].sort((a, b) => b[1] - a[1]);
  for (const [file, count] of sortedFiles) {
    const bar = '█'.repeat(Math.min(count, 20));
    console.log(`  ${file.padEnd(30)} ${bar} ${count}`);
  }
  console.log('');

  // Failures by type
  console.log('🔍 Failures by Error Type:');
  console.log('─'.repeat(50));
  const sortedTypes = [...summary.failuresByType.entries()].sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedTypes) {
    const bar = '█'.repeat(Math.min(count, 20));
    console.log(`  ${type.padEnd(25)} ${bar} ${count}`);
  }
  console.log('');

  // Most common failing selectors
  const selectorCounts = new Map<string, number>();
  for (const failure of summary.failures) {
    if (failure.selector) {
      const count = selectorCounts.get(failure.selector) || 0;
      selectorCounts.set(failure.selector, count + 1);
    }
  }

  if (selectorCounts.size > 0) {
    console.log('🎯 Most Common Failing Selectors:');
    console.log('─'.repeat(50));
    const sortedSelectors = [...selectorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    for (const [selector, count] of sortedSelectors) {
      console.log(`  ${count}x  ${selector}`);
    }
    console.log('');
  }

  // Suggestions
  console.log('💡 Suggestions:');
  console.log('─'.repeat(50));

  if (summary.failuresByType.has('Timeout')) {
    console.log('  • Timeout errors: Consider increasing timeouts or adding explicit waits');
    console.log('    Example: await page.waitForSelector(selector, { timeout: 10000 })');
  }

  if (summary.failuresByType.has('Element Not Found')) {
    console.log('  • Element Not Found: Check if selectors match current DOM structure');
    console.log('    Run with --ui flag to debug: pnpm test:ui');
  }

  if (summary.failuresByType.has('Assertion Failed')) {
    console.log('  • Assertion Failed: Review expected values and app behavior');
    console.log('    Check if app behavior changed since tests were written');
  }

  console.log('');
  console.log('📝 Quick Commands:');
  console.log('─'.repeat(50));
  console.log('  pnpm test:failed          # Re-run only failed tests');
  console.log('  pnpm test:ui              # Debug with interactive UI');
  console.log('  pnpm test:headed          # Run with visible browser');
  console.log('  pnpm test:show-report     # Open HTML report in browser');

  if (sortedFiles.length > 0) {
    const topFile = sortedFiles[0][0];
    console.log(`  pnpm test tests/${topFile}  # Run tests for most failing file`);
  }

  console.log('');
  console.log('📌 Run specific test file:');
  console.log('─'.repeat(50));
  console.log('  pnpm test tests/gamepad.spec.ts');
  console.log('  pnpm test tests/i18n.spec.ts');
  console.log('');
  console.log('🔎 Run tests matching pattern:');
  console.log('─'.repeat(50));
  console.log('  pnpm test:grep "keyboard"');
  console.log('  pnpm test:grep "settings"');
  console.log('');
}

function main(): void {
  const resultsDir = join(process.cwd(), 'test-results');
  const summary = analyzeTestResults(resultsDir);
  printSummary(summary);
}

main();
