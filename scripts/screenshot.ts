import { chromium } from '@playwright/test';

const SCRIPT_CONTENT = `Welcome to the Free Online Teleprompter

This professional teleprompter helps you deliver confident presentations, record videos, and stream content without losing your place.

Features you'll love:
- Adjustable scroll speed with smooth ramping
- Voice-activated scrolling that follows your speech
- Remote control from your phone or tablet
- Gamepad and foot pedal support

Perfect for YouTubers, streamers, podcasters, educators, and public speakers.

Start by pasting your script here, then press Space to begin. Use arrow keys to adjust speed. Press ? for all keyboard shortcuts.

No sign-up required. Your privacy is protected. All data stays in your browser.`;

async function captureScreenshot() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Set up app with professional settings
  await page.addInitScript(
    ({ script }) => {
      localStorage.setItem('tpt/script', script);
      localStorage.setItem(
        'tpt/settings',
        JSON.stringify({
          scrollMode: 'continuous',
          scrollSpeed: 1.5,
          fontSize: 36,
          fontFamily: 'Inter',
          textColor: '#ffffff',
          backgroundColor: '#0a0a0a',
          lineSpacing: 1.6,
          horizontalMargin: 15,
          readingGuide: true,
          cuePoints: [0, 4, 10],
        })
      );
    },
    { script: SCRIPT_CONTENT }
  );

  await page.goto('http://localhost:4300/tpt/');
  await page.waitForSelector('[data-testid="teleprompter-display"]', { timeout: 10000 });

  // Wait for fonts to load
  await page.waitForTimeout(1000);

  // Navigate to show some progress
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
  }

  await page.waitForTimeout(500);

  // Capture screenshot
  await page.screenshot({
    path: 'public/screenshot.png',
    type: 'png',
  });

  console.log('Screenshot saved to public/screenshot.png');

  await browser.close();
}

captureScreenshot().catch(console.error);
