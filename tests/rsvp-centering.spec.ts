import { test, expect, Page } from '@playwright/test';

// Helper to set up RSVP mode with specific text
async function setupRSVP(page: Page, text: string) {
  // Set localStorage before navigating
  await page.addInitScript((testText) => {
    localStorage.setItem('tpt/script', testText);
    localStorage.setItem('tpt/settings', JSON.stringify({
      scrollMode: 'rsvp',
      fontSize: 64,
      rsvpSpeed: 200,
    }));
  }, text);

  // Navigate to the app
  await page.goto('/');

  // Wait for RSVP container to be active
  await page.waitForSelector('.rsvp-container.active', { timeout: 5000 });

  // Wait a bit for centering to be applied
  await page.waitForTimeout(100);
}

// Helper to get centering measurements using screen/viewport coordinates
async function getCenteringData(page: Page) {
  return await page.evaluate(() => {
    const container = document.querySelector('.rsvp-container') as HTMLElement;
    const wordElement = document.querySelector('.rsvp-word') as HTMLElement;
    const orpSpan = document.querySelector('.rsvp-word .orp') as HTMLElement;
    const orpMarker = document.querySelector('.rsvp-orp-marker') as HTMLElement;

    if (!container || !wordElement || !orpSpan) {
      return null;
    }

    // Use viewport/screen coordinates for all measurements
    const viewportCenterX = window.innerWidth / 2;
    const orpRect = orpSpan.getBoundingClientRect();
    const markerRect = orpMarker?.getBoundingClientRect();

    // ORP center in screen coordinates
    const orpCenterX = orpRect.left + orpRect.width / 2;
    const markerCenterX = markerRect ? markerRect.left + markerRect.width / 2 : null;

    return {
      viewportWidth: window.innerWidth,
      viewportCenterX,
      orpCenterX,
      markerCenterX,
      orpOffsetFromScreenCenter: orpCenterX - viewportCenterX,
      markerOffsetFromScreenCenter: markerCenterX ? markerCenterX - viewportCenterX : null,
      wordText: wordElement.textContent,
      orpChar: orpSpan.textContent,
      transform: wordElement.style.transform,
    };
  });
}

test.describe('RSVP Centering - Screen Coordinates', () => {
  test('single character word - ORP at screen center', async ({ page }) => {
    await setupRSVP(page, 'A');

    const data = await getCenteringData(page);
    expect(data).not.toBeNull();

    console.log('Single char:', data);

    // ORP should be within 2px of actual screen center
    expect(Math.abs(data!.orpOffsetFromScreenCenter)).toBeLessThan(2);
  });

  test('two character word - ORP at screen center', async ({ page }) => {
    await setupRSVP(page, 'Hi');

    const data = await getCenteringData(page);
    expect(data).not.toBeNull();

    console.log('Two char:', data);

    // ORP should be within 2px of actual screen center
    expect(Math.abs(data!.orpOffsetFromScreenCenter)).toBeLessThan(2);
  });

  test('five character word "Hello" - ORP at screen center', async ({ page }) => {
    await setupRSVP(page, 'Hello');

    const data = await getCenteringData(page);
    expect(data).not.toBeNull();

    console.log('Hello:', data);

    // ORP should be 'e' (index 1 for 5-letter word)
    expect(data!.orpChar).toBe('e');

    // ORP should be within 2px of actual screen center
    expect(Math.abs(data!.orpOffsetFromScreenCenter)).toBeLessThan(2);
  });

  test('long word "Programming" - ORP at screen center', async ({ page }) => {
    await setupRSVP(page, 'Programming');

    const data = await getCenteringData(page);
    expect(data).not.toBeNull();

    console.log('Programming:', data);

    // ORP should be within 2px of actual screen center
    expect(Math.abs(data!.orpOffsetFromScreenCenter)).toBeLessThan(2);
  });

  test('word with punctuation "Hello!" - ORP at screen center', async ({ page }) => {
    await setupRSVP(page, 'Hello!');

    const data = await getCenteringData(page);
    expect(data).not.toBeNull();

    console.log('Hello!:', data);

    // ORP should be within 2px of actual screen center
    expect(Math.abs(data!.orpOffsetFromScreenCenter)).toBeLessThan(2);
  });

  test('ORP marker at screen center', async ({ page }) => {
    await setupRSVP(page, 'Test');

    const data = await getCenteringData(page);
    expect(data).not.toBeNull();

    console.log('Marker alignment:', data);

    // Marker should be at screen center
    if (data!.markerCenterX) {
      expect(Math.abs(data!.markerOffsetFromScreenCenter!)).toBeLessThan(2);
    }

    // ORP should also be at screen center
    expect(Math.abs(data!.orpOffsetFromScreenCenter)).toBeLessThan(2);
  });

  test('verify transform is applied for off-center ORP', async ({ page }) => {
    await setupRSVP(page, 'Hello');

    const data = await getCenteringData(page);
    expect(data).not.toBeNull();

    console.log('Transform:', data);

    // For "Hello", ORP is 'e' at index 1, which is not at word center
    // So a transform should be applied
    expect(data!.transform).toContain('translateX');
  });

  test('multiple words - first word ORP at screen center', async ({ page }) => {
    await setupRSVP(page, 'Hello World Test');

    const data = await getCenteringData(page);
    expect(data).not.toBeNull();

    console.log('Multiple words:', data);

    // First word is "Hello", ORP should be 'e'
    expect(data!.orpChar).toBe('e');

    // ORP should be within 2px of actual screen center
    expect(Math.abs(data!.orpOffsetFromScreenCenter)).toBeLessThan(2);
  });
});
