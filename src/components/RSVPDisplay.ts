import { CONFIG } from "../config";
import { getFontFamily } from "../fonts";
import { i18n } from "../i18n";
import type { TeleprompterState } from "../state";
import { parseHexColor } from "../utils";

// RSVP (Rapid Serial Visual Presentation) Display Component
export class RSVPDisplay {
  private container: HTMLDivElement;
  private wordContainer: HTMLDivElement;
  private wordElement: HTMLDivElement;
  private orpMarker: HTMLDivElement;
  private progressBar: HTMLDivElement;
  private counterElement: HTMLDivElement;
  private speedDisplay: HTMLDivElement;
  private state: TeleprompterState;

  private words: string[] = [];
  private currentIndex: number = 0;
  private isPlaying: boolean = false;
  private intervalId: number | null = null;
  private onComplete: (() => void) | null = null;
  private i18nUnsubscribe: (() => void) | null = null;

  constructor(parent: HTMLElement, state: TeleprompterState) {
    this.state = state;

    // Create main container
    this.container = document.createElement("div");
    this.container.className = "rsvp-container";

    // Create ORP marker (vertical line showing focal point)
    this.orpMarker = document.createElement("div");
    this.orpMarker.className = "rsvp-orp-marker";
    this.container.appendChild(this.orpMarker);

    // Create word container
    this.wordContainer = document.createElement("div");
    this.wordContainer.className = "rsvp-word-container";

    // Create word display element
    this.wordElement = document.createElement("div");
    this.wordElement.className = "rsvp-word";
    this.wordElement.setAttribute("aria-live", "polite");
    this.wordElement.setAttribute("role", "status");
    this.wordContainer.appendChild(this.wordElement);

    this.container.appendChild(this.wordContainer);

    // Create progress container
    const progressContainer = document.createElement("div");
    progressContainer.className = "rsvp-progress-container";

    // Progress bar
    const progressWrapper = document.createElement("div");
    progressWrapper.className = "rsvp-progress";
    this.progressBar = document.createElement("div");
    this.progressBar.className = "rsvp-progress-bar";
    progressWrapper.appendChild(this.progressBar);
    progressContainer.appendChild(progressWrapper);

    // Counter
    this.counterElement = document.createElement("div");
    this.counterElement.className = "rsvp-counter";
    progressContainer.appendChild(this.counterElement);

    this.container.appendChild(progressContainer);

    // Speed display
    this.speedDisplay = document.createElement("div");
    this.speedDisplay.className = "rsvp-speed-display";
    this.updateSpeedDisplay();
    this.container.appendChild(this.speedDisplay);

    parent.appendChild(this.container);

    // Apply initial styles
    this.updateStyles();

    // Subscribe to locale changes
    this.i18nUnsubscribe = i18n.onChange(() => {
      this.updateSpeedDisplay();
    });
  }

  // Parse text into word array
  setWords(text: string): void {
    // Stop playback when text changes
    const wasPlaying = this.isPlaying;
    this.pause();

    // Split text into words, preserving punctuation attached to words
    this.words = text
      .split(/\s+/)
      .filter(word => word.length > 0);
    this.currentIndex = 0;
    this.updateDisplay();

    // Resume playback if was playing (optional - for live updates)
    if (wasPlaying && this.words.length > 0) {
      this.start();
    }
  }

  // Punctuation regex - includes Latin, CJK, and common Unicode punctuation
  // Used for both ORP calculation and delay timing
  private static readonly PUNCTUATION_REGEX = /[.,!?;:'"()\-\u2014\u2013\u00AB\u00BB\u201C\u201D\u2018\u2019\u3001\u3002\u300C\u300D\u300E\u300F\u3010\u3011\uFF01\uFF0C\uFF1A\uFF1B\uFF1F\u2026\u2025]/;

  // Major punctuation for sentence-end delays (includes CJK)
  private static readonly MAJOR_PUNCTUATION_REGEX = /[.!?\u3002\uFF01\uFF1F]$/;

  // Minor punctuation for pause delays (includes CJK)
  private static readonly MINOR_PUNCTUATION_REGEX = /[,;:\u3001\uFF0C\uFF1A\uFF1B]$/;

  // Calculate ORP (Optimal Recognition Point) position
  // Returns the index of the character that should be highlighted in the original word
  // Uses proper Unicode iteration to handle emoji and surrogate pairs
  private calculateORP(word: string): number {
    if (word.length === 0) return 0;

    // Convert to array of graphemes to properly handle emoji/surrogate pairs
    const chars = [...word];
    const charCount = chars.length;

    if (charCount === 0) return 0;

    // Find the start of the actual letters (skip leading punctuation)
    let letterStart = 0;
    while (letterStart < charCount && RSVPDisplay.PUNCTUATION_REGEX.test(chars[letterStart])) {
      letterStart++;
    }

    // Find the end of the actual letters (skip trailing punctuation)
    let letterEnd = charCount;
    while (letterEnd > letterStart && RSVPDisplay.PUNCTUATION_REGEX.test(chars[letterEnd - 1])) {
      letterEnd--;
    }

    // Get the actual letter portion
    const letterLen = letterEnd - letterStart;

    // Calculate ORP index in grapheme array
    let orpGraphemeIndex: number;
    if (letterLen <= 0) {
      orpGraphemeIndex = 0; // Word is all punctuation
    } else if (letterLen <= 1) {
      orpGraphemeIndex = letterStart;
    } else if (letterLen <= 3) {
      orpGraphemeIndex = letterStart; // First letter for short words
    } else if (letterLen <= 7) {
      orpGraphemeIndex = letterStart + Math.floor(letterLen / 3); // ~1/3 for medium words
    } else {
      orpGraphemeIndex = letterStart + Math.floor(letterLen / 3); // ~1/3 for long words
    }

    // Convert grapheme index back to string index
    // Sum up the lengths of all graphemes before the ORP
    let stringIndex = 0;
    for (let i = 0; i < orpGraphemeIndex && i < chars.length; i++) {
      stringIndex += chars[i].length;
    }
    return stringIndex;
  }

  // Calculate delay for a word based on punctuation
  private calculateDelay(word: string): number {
    const baseDelay = (60 * 1000) / this.state.rsvpSpeed; // ms per word

    // Check for major punctuation (end of sentence) - includes CJK
    if (RSVPDisplay.MAJOR_PUNCTUATION_REGEX.test(word)) {
      return baseDelay * CONFIG.RSVP_PUNCTUATION_DELAY_MAJOR;
    }

    // Check for minor punctuation (pause) - includes CJK
    if (RSVPDisplay.MINOR_PUNCTUATION_REGEX.test(word)) {
      return baseDelay * CONFIG.RSVP_PUNCTUATION_DELAY_MINOR;
    }

    return baseDelay;
  }

  // Render a word with ORP highlighting
  private renderWord(word: string): void {
    if (!word) {
      this.wordElement.textContent = "";
      return;
    }

    const orpIndex = this.calculateORP(word);

    // Build HTML with ORP letter highlighted
    const before = word.slice(0, orpIndex);
    const orp = word[orpIndex] || '';
    const after = word.slice(orpIndex + 1);

    this.wordElement.innerHTML = '';

    if (before) {
      const beforeSpan = document.createElement('span');
      beforeSpan.textContent = before;
      this.wordElement.appendChild(beforeSpan);
    }

    if (orp) {
      const orpSpan = document.createElement('span');
      orpSpan.className = 'orp';
      orpSpan.textContent = orp;
      this.wordElement.appendChild(orpSpan);
    }

    if (after) {
      const afterSpan = document.createElement('span');
      afterSpan.textContent = after;
      this.wordElement.appendChild(afterSpan);
    }

    // Center the ORP character at the marker position
    // This requires calculating the offset
    requestAnimationFrame(() => {
      this.centerOnORP();
    });
  }

  // Center the word so the ORP character aligns with the center marker
  private centerOnORP(): void {
    const orpSpan = this.wordElement.querySelector('.orp') as HTMLElement;
    if (!orpSpan) return;

    const wordWidth = this.wordElement.offsetWidth;
    const orpLeft = orpSpan.offsetLeft;
    const orpWidth = orpSpan.offsetWidth;

    // The word is already centered by flexbox (word center = container center)
    // We need to shift so that ORP center aligns with container center instead
    // Shift = (word center position) - (ORP center position within word)
    const wordCenter = wordWidth / 2;
    const orpCenterInWord = orpLeft + orpWidth / 2;
    const offset = wordCenter - orpCenterInWord;

    this.wordElement.style.transform = `translateX(${offset}px)`;
  }

  // Update the display
  private updateDisplay(): void {
    if (this.words.length === 0) {
      this.wordElement.textContent = "";
      this.progressBar.style.width = "0%";
      this.counterElement.textContent = "0 / 0";
      return;
    }

    const word = this.words[this.currentIndex] || "";
    this.renderWord(word);

    // Update progress
    const progress = ((this.currentIndex + 1) / this.words.length) * 100;
    this.progressBar.style.width = `${progress}%`;
    this.counterElement.textContent = `${this.currentIndex + 1} / ${this.words.length}`;
  }

  // Start word display
  start(): void {
    if (this.isPlaying || this.words.length === 0) return;

    // If at the end, don't start - user should reset first
    if (this.currentIndex >= this.words.length) {
      return;
    }

    this.isPlaying = true;
    // Ensure current word is displayed
    this.updateDisplay();
    this.scheduleNextWord();
  }

  // Schedule the next word display
  private scheduleNextWord(): void {
    if (!this.isPlaying) return;

    // Check if we've reached the end
    if (this.currentIndex >= this.words.length - 1) {
      // We're on the last word, show it for a moment then complete
      const lastWord = this.words[this.currentIndex];
      const delay = lastWord ? this.calculateDelay(lastWord) : 200;

      this.intervalId = window.setTimeout(() => {
        this.isPlaying = false;
        this.intervalId = null;
        if (this.onComplete) {
          this.onComplete();
        }
      }, delay);
      return;
    }

    const currentWord = this.words[this.currentIndex];
    const delay = this.calculateDelay(currentWord);

    this.intervalId = window.setTimeout(() => {
      if (!this.isPlaying) return; // Check again in case paused during timeout
      this.currentIndex++;
      this.updateDisplay();
      this.scheduleNextWord();
    }, delay);
  }

  // Pause display
  pause(): void {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  // Reset to beginning
  reset(): void {
    this.pause();
    this.currentIndex = 0;
    this.updateDisplay();
  }

  // Set speed (WPM)
  setSpeed(wpm: number): void {
    this.state.rsvpSpeed = Math.max(
      CONFIG.RSVP_SPEED.MIN,
      Math.min(CONFIG.RSVP_SPEED.MAX, wpm)
    );
    this.state.saveSettings();
    this.updateSpeedDisplay();
  }

  // Adjust speed by delta
  adjustSpeed(delta: number): void {
    this.setSpeed(this.state.rsvpSpeed + delta);
  }

  // Update speed display
  private updateSpeedDisplay(): void {
    this.speedDisplay.textContent = `${this.state.rsvpSpeed} ${i18n.t('wpm')}`;
  }

  // Get progress percentage
  getProgress(): number {
    if (this.words.length === 0) return 0;
    return ((this.currentIndex + 1) / this.words.length) * 100;
  }

  // Check if currently playing
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  // Set completion callback
  setOnComplete(callback: () => void): void {
    this.onComplete = callback;
  }

  // Show the RSVP container
  show(): void {
    this.container.classList.add("active");
  }

  // Hide the RSVP container
  hide(): void {
    this.container.classList.remove("active");
    this.pause();
  }

  // Update styles from state
  updateStyles(): void {
    // Apply font settings to word element
    this.wordElement.style.color = this.state.fontColor;
    this.wordElement.style.fontFamily = getFontFamily(this.state.fontFamily);

    // Apply background with overlay opacity
    const bgColor = this.state.backgroundColor;
    const opacity = this.state.overlayOpacity;
    if (opacity < 1) {
      const rgb = parseHexColor(bgColor);
      if (rgb) {
        this.container.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
      } else {
        this.container.style.backgroundColor = bgColor;
      }
    } else {
      this.container.style.backgroundColor = bgColor;
    }
  }

  // Check if visible
  isVisible(): boolean {
    return this.container.classList.contains("active");
  }

  // Navigate to specific word
  goToWord(index: number): void {
    this.currentIndex = Math.max(0, Math.min(this.words.length - 1, index));
    this.updateDisplay();
  }

  // Get current word index
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  // Get total words
  getTotalWords(): number {
    return this.words.length;
  }

  // Clean up
  destroy(): void {
    this.pause();
    if (this.i18nUnsubscribe) {
      this.i18nUnsubscribe();
      this.i18nUnsubscribe = null;
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
