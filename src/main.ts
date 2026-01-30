import "./style.css";
import { i18n, type Locale, type Translations } from "./i18n";

// Helper function for formatting labels with values
function formatLabel(key: keyof Translations, value: number | string, unitKey?: keyof Translations): string {
  const label = i18n.t(key);
  const unit = unitKey ? i18n.t(unitKey) : '';
  return `${label}: ${value}${unit}`;
}

// Custom event types for type safety
interface ScrollingToggledDetail {
  isScrolling: boolean;
  isCountingDown: boolean;
}

declare global {
  interface DocumentEventMap {
    "scrolling-toggled": CustomEvent<ScrollingToggledDetail>;
    "toggle-scrolling": CustomEvent<void>;
    "back-to-top": CustomEvent<void>;
    "speed-changed": CustomEvent<void>;
    "settings-changed": CustomEvent<void>;
    "drawer-opened": CustomEvent<void>;
    "drawer-closed": CustomEvent<void>;
  }
}

// Constants for configuration limits
const CONFIG = {
  FONT_SIZE: { MIN: 16, MAX: 72, DEFAULT: 32 },
  SCROLL_SPEED: { MIN: 0.1, MAX: 8, DEFAULT: 1.5, STEP: 0.1 },
  LINE_SPACING: { MIN: 0.5, MAX: 3, DEFAULT: 1, STEP: 0.1 },
  LETTER_SPACING: { MIN: 0, MAX: 10, DEFAULT: 0 },
  MAX_WORDS_PER_LINE: { MIN: 0, DEFAULT: 0 },
  ACTIVE_LINE_UPDATE_INTERVAL: 100, // ms
  END_THRESHOLD: 5, // pixels from end to trigger stop
  SPACER_HEIGHT: "50vh",
  STORAGE_KEY: "teleprompter_script",
  COUNTDOWN_SECONDS: 3, // 3-2-1 countdown before scrolling
  RAMP_DURATION: 1000, // ms for speed ramp up/down
} as const;

const systemFontStack =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';

// Map display names to actual font families
const fontFamilyMap: Record<string, string> = {
  System: systemFontStack,
  Arial: "Arial, sans-serif",
  "Times New Roman": '"Times New Roman", Times, serif',
  "Courier New": '"Courier New", Courier, monospace',
  Georgia: "Georgia, serif",
  Verdana: "Verdana, sans-serif",
  Roboto: "Roboto, sans-serif",
  "Open Sans": '"Open Sans", sans-serif',
};

function getFontFamily(displayName: string): string {
  return fontFamilyMap[displayName] || displayName;
}

// SVG Icons for Fullscreen Toggle
const fullscreenEnterIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
    <path d="M4 4h6V2H2v8h2V4zm16 0v6h2V2h-8v2h6zm0 16h-6v2h8v-8h-2v6zM4 20v-6H2v8h8v-2H4z"/>
  </svg>
`;

const fullscreenExitIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
    <path d="M16 14h2v4h-4v-2h2v-2zm-8 0v2h2v2H6v-4h2zm8-8v2h-2V6h4v4h-2V8zm-8 2H6V6h4v2H8v2z"/>
  </svg>
`;

// SVG Icons for toolbar
const editIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
const settingsIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`;
const helpIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>`;
const closeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

// Teleprompter state class
class TeleprompterState {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  backgroundColor: string;
  lineSpacing: number;
  letterSpacing: number;
  scrollSpeed: number; // Now represents lines per second
  isFlipped: boolean;
  isFlippedVertical: boolean;
  isScrolling: boolean;
  activeLineIndex: number;
  scriptEnded: boolean;
  isFullscreen: boolean;
  maxWordsPerLine: number; // New property to control line word limit

  constructor() {
    // Try to load saved script from localStorage
    const savedScript = localStorage.getItem(CONFIG.STORAGE_KEY);
    const defaultText = i18n.t('defaultScript');

    this.text = savedScript || `${defaultText}\n\n${defaultText}\n\n${defaultText}`;
    this.fontSize = CONFIG.FONT_SIZE.DEFAULT;
    this.fontFamily = "System"; // Use display name, will be mapped to font stack
    this.fontColor = "#ffffff";
    this.backgroundColor = "#000000";
    this.lineSpacing = CONFIG.LINE_SPACING.DEFAULT;
    this.letterSpacing = CONFIG.LETTER_SPACING.DEFAULT;
    this.scrollSpeed = CONFIG.SCROLL_SPEED.DEFAULT;
    this.isFlipped = false;
    this.isFlippedVertical = false;
    this.isScrolling = false;
    this.activeLineIndex = 0;
    this.scriptEnded = false;
    this.isFullscreen = false;
    this.maxWordsPerLine = CONFIG.MAX_WORDS_PER_LINE.DEFAULT;
  }
}

// Teleprompter Display Component
class TeleprompterDisplay {
  private element: HTMLDivElement;
  private telepromptText: HTMLDivElement;
  private telepromptTextInner: HTMLDivElement;
  private state: TeleprompterState;
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private currentTranslateY: number = 0; // Track current translateY
  private cachedLineHeight: number = 0; // Cache for performance
  private cachedLines: NodeListOf<Element> | null = null; // Cache DOM query
  private lastActiveLineUpdate: number = 0; // For proper throttling
  private countdownOverlay: HTMLDivElement | null = null;
  private scrollStartTime: number = 0; // For speed ramping
  private isRampingUp: boolean = false;
  private isRampingDown: boolean = false;
  private rampDownStartTime: number = 0;
  private isCountingDown: boolean = false; // Prevent race condition
  private countdownIntervalId: number | null = null; // For cleanup
  private rampDownTimeoutId: number | null = null; // For cleanup
  // Store event listeners for cleanup
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private backToTopHandler: ((e: CustomEvent<void>) => void) | null = null;

  constructor(container: HTMLElement, state: TeleprompterState) {
    this.state = state;

    // Create teleprompter container
    this.element = document.createElement("div");
    this.element.className =
      "teleprompter-container flex-grow relative overflow-hidden";
    if (this.state.isFlipped) this.element.classList.add("flipped");
    this.element.style.backgroundColor = this.state.backgroundColor;

    // Create teleprompter text area
    this.telepromptText = document.createElement("div");
    this.telepromptText.id = "teleprompt-text";
    this.telepromptText.className =
      "p-4 text-center whitespace-pre-line teleprompter-hide-scrollbar";
    this.telepromptText.style.overflow = "hidden";
    this.telepromptText.style.position = "relative";

    // Inner wrapper for text (receives transforms for scrolling and flip)
    this.telepromptTextInner = document.createElement("div");
    this.telepromptTextInner.className = "teleprompt-text-inner";
    this.telepromptTextInner.style.transition = "none"; // Will be set dynamically for smooth transitions

    // Append telepromptTextInner to telepromptText
    this.telepromptText.appendChild(this.telepromptTextInner);

    this.updateStyles();

    this.element.appendChild(this.telepromptText);

    // Create countdown overlay (styles in CSS)
    this.countdownOverlay = document.createElement("div");
    this.countdownOverlay.className = "countdown-overlay";
    this.countdownOverlay.setAttribute("aria-live", "assertive"); // Accessibility
    this.countdownOverlay.setAttribute("role", "timer");
    this.element.appendChild(this.countdownOverlay);

    container.appendChild(this.element);

    this.updateTelepromptText();
    this.setupKeyboardNavigation();
    this.setupCustomEventListeners(); // Add setup for custom events
  }

  private setupKeyboardNavigation() {
    this.keydownHandler = (e: KeyboardEvent) => {
      // Detect macOS using userAgentData (modern) or userAgent (fallback)
      const isMac = (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData?.platform === "macOS"
        || /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      // --- Custom Shortcuts ---
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (ctrlOrCmd) {
          // Cmd/Ctrl + Left/Right: Font size
          if (e.key === "ArrowLeft") {
            this.state.fontSize = Math.max(CONFIG.FONT_SIZE.MIN, this.state.fontSize - 1);
          } else {
            this.state.fontSize = Math.min(CONFIG.FONT_SIZE.MAX, this.state.fontSize + 1);
          }
          this.updateStyles();
          // Notify UI components to update their displays
          document.dispatchEvent(new CustomEvent("settings-changed"));
        } else {
          // Left/Right: Scroll speed in lines per second
          if (e.key === "ArrowLeft") {
            this.state.scrollSpeed = Math.max(CONFIG.SCROLL_SPEED.MIN, this.state.scrollSpeed - CONFIG.SCROLL_SPEED.STEP);
          } else {
            this.state.scrollSpeed = Math.min(CONFIG.SCROLL_SPEED.MAX, this.state.scrollSpeed + CONFIG.SCROLL_SPEED.STEP);
          }
          // Round to 1 decimal place for cleaner display
          this.state.scrollSpeed = Math.round(this.state.scrollSpeed * 10) / 10;

          // Notify UI components to update their displays
          document.dispatchEvent(new CustomEvent("speed-changed"));
        }
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        if (ctrlOrCmd) {
          // Ctrl/Cmd + Up/Down: Line spacing
          if (e.key === "ArrowUp") {
            this.state.lineSpacing = Math.min(CONFIG.LINE_SPACING.MAX, this.state.lineSpacing + CONFIG.LINE_SPACING.STEP);
          } else {
            this.state.lineSpacing = Math.max(CONFIG.LINE_SPACING.MIN, this.state.lineSpacing - CONFIG.LINE_SPACING.STEP);
          }
          this.state.lineSpacing = Math.round(this.state.lineSpacing * 10) / 10;
          this.updateStyles();
          // Notify UI components to update their displays
          document.dispatchEvent(new CustomEvent("settings-changed"));
        } else if (!this.state.isScrolling) {
          // Up/Down: Move active line only if not playing
          if (e.key === "ArrowUp") {
            this.state.activeLineIndex = Math.max(
              0,
              this.state.activeLineIndex - 1
            );
          } else {
            const lines = this.state.text.split("\n");
            this.state.activeLineIndex = Math.min(
              lines.length - 1,
              this.state.activeLineIndex + 1
            );
          }
          // Scroll to the active line
          const targetLine = this.element.querySelector(
            `.line[data-index="${this.state.activeLineIndex}"]`
          ) as HTMLElement;
          if (targetLine) {
            targetLine.scrollIntoView({ behavior: "smooth", block: "center" });
            this.updateTelepromptText();
          }
        }
        e.preventDefault();
        return;
      }
      if (e.key === " ") {
        // Space bar toggles play/pause
        this.toggleScrolling();
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", this.keydownHandler);
  }

  updateTelepromptText() {
    if (!this.telepromptTextInner) return;

    // Invalidate caches when text changes
    this.cachedLines = null;
    this.cachedLineHeight = 0;

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();

    // Split text into lines
    const inputLines = this.state.text.split("\n");
    
    // Process lines with maxWordsPerLine if enabled
    const lines: string[] = [];
    
    // Process each line, potentially splitting by word limit
    inputLines.forEach(line => {
      if (this.state.maxWordsPerLine > 0 && line.trim() !== "") {
        // Split the line into words
        const words = line.trim().split(/\s+/);
        
        // If we have more words than the limit, we need to split the line
        if (words.length > this.state.maxWordsPerLine) {
          // Create chunks of words based on the max words per line
          for (let i = 0; i < words.length; i += this.state.maxWordsPerLine) {
            const chunk = words.slice(i, i + this.state.maxWordsPerLine).join(" ");
            lines.push(chunk);
          }
        } else {
          // Line is already within the limit
          lines.push(line);
        }
      } else {
        // No word limit or empty line
        lines.push(line);
      }
    });

    // Create elements in batches to reduce reflow
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const lineElement = document.createElement("div");
      lineElement.className = "line";
      lineElement.dataset.index = index.toString();

      if (index === this.state.activeLineIndex) {
        lineElement.classList.add("active-line");
      }

      if (line.trim() === "") {
        // For empty lines, add a non-breaking space to maintain height
        lineElement.textContent = "\u00A0"; // Unicode non-breaking space (safer than innerHTML)
      } else {
        lineElement.textContent = line;
      }

      fragment.appendChild(lineElement);
    }

    // Add spacer at the end for half the container height
    const spacer = document.createElement("div");
    spacer.style.height = CONFIG.SPACER_HEIGHT;
    spacer.style.pointerEvents = "none";
    fragment.appendChild(spacer);

    // Replace all content at once (more efficient than clearing + appending)
    this.telepromptTextInner.replaceChildren(fragment);
  }


  // Cache line height calculation - only recalculate when needed
  private getLineHeight(): number {
    if (this.cachedLineHeight > 0) {
      return this.cachedLineHeight;
    }

    // Cache the lines query
    if (!this.cachedLines) {
      this.cachedLines = this.element.querySelectorAll(".line");
    }

    if (this.cachedLines.length > 0) {
      // Sample a few lines to get average height
      const sampleSize = Math.min(3, this.cachedLines.length);
      let totalHeight = 0;
      for (let i = 0; i < sampleSize; i++) {
        totalHeight += (this.cachedLines[i] as HTMLElement).offsetHeight;
      }
      this.cachedLineHeight = totalHeight / sampleSize;
    }

    // Fallback calculation
    if (this.cachedLineHeight === 0) {
      this.cachedLineHeight = this.state.fontSize * this.state.lineSpacing;
    }

    return this.cachedLineHeight;
  }

  private animateScroll = (timestamp: number = performance.now()) => {
    if (!this.state.isScrolling || !this.telepromptTextInner) {
      return;
    }

    // Calculate how much to scroll based on time difference and lines per second
    const elapsed = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    // Use cached line height for performance
    const avgLineHeight = this.getLineHeight();

    // Apply speed ramping multiplier for smooth start/stop
    const rampMultiplier = this.getRampMultiplier(timestamp);

    // Calculate scroll amount based on lines per second with ramping
    const pixelsPerSecond = avgLineHeight * this.state.scrollSpeed * rampMultiplier;
    const scrollAmount = (elapsed * pixelsPerSecond) / 1000;

    // Remove any transition when actively animating for immediate response
    this.telepromptTextInner.style.transition = "none";

    // Update translateY position and apply transform
    this.currentTranslateY -= scrollAmount;
    this.applyTransform();

    // Throttle active line updates to every 100ms for performance
    if (timestamp - this.lastActiveLineUpdate > 100) {
      this.lastActiveLineUpdate = timestamp;
      this.updateActiveLine();
    }

    // Check if we've reached the end
    const totalHeight = this.telepromptTextInner.scrollHeight;
    const containerHeight = this.telepromptText.clientHeight;
    const endThreshold = 5; // pixels from end
    if (Math.abs(this.currentTranslateY) + containerHeight >= totalHeight - endThreshold && !this.state.scriptEnded) {
      this.toggleScrolling(); // Auto-pause when reaching the end
      this.state.scriptEnded = true; // Set flag when script ends
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      }
      return;
    }

    // Continue the animation with requestAnimationFrame
    this.animationFrameId = window.requestAnimationFrame(this.animateScroll);
  };

  // Show countdown overlay before starting
  private showCountdown(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.countdownOverlay) {
        resolve(true);
        return;
      }

      this.isCountingDown = true;
      let count = CONFIG.COUNTDOWN_SECONDS;
      this.countdownOverlay.style.display = "flex";
      this.countdownOverlay.textContent = count.toString();

      this.countdownIntervalId = window.setInterval(() => {
        // Check if countdown was cancelled
        if (!this.isCountingDown) {
          if (this.countdownIntervalId !== null) {
            clearInterval(this.countdownIntervalId);
            this.countdownIntervalId = null;
          }
          if (this.countdownOverlay) {
            this.countdownOverlay.style.display = "none";
          }
          resolve(false); // Cancelled
          return;
        }

        count--;
        if (count > 0) {
          if (this.countdownOverlay) {
            this.countdownOverlay.textContent = count.toString();
          }
        } else {
          if (this.countdownIntervalId !== null) {
            clearInterval(this.countdownIntervalId);
            this.countdownIntervalId = null;
          }
          if (this.countdownOverlay) {
            this.countdownOverlay.style.display = "none";
          }
          this.isCountingDown = false;
          resolve(true); // Completed
        }
      }, 1000);
    });
  }

  // Cancel ongoing countdown
  private cancelCountdown(): void {
    this.isCountingDown = false;
    if (this.countdownIntervalId !== null) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
    if (this.countdownOverlay) {
      this.countdownOverlay.style.display = "none";
    }
  }

  // Calculate speed multiplier for ramping (ease-in-out)
  private getRampMultiplier(timestamp: number): number {
    if (this.isRampingUp) {
      const elapsed = timestamp - this.scrollStartTime;
      if (elapsed >= CONFIG.RAMP_DURATION) {
        this.isRampingUp = false;
        return 1;
      }
      // Ease-in using sine curve
      return Math.sin((elapsed / CONFIG.RAMP_DURATION) * (Math.PI / 2));
    }

    if (this.isRampingDown) {
      const elapsed = timestamp - this.rampDownStartTime;
      if (elapsed >= CONFIG.RAMP_DURATION) {
        return 0;
      }
      // Ease-out using cosine curve
      return Math.cos((elapsed / CONFIG.RAMP_DURATION) * (Math.PI / 2));
    }

    return 1;
  }

  toggleScrolling() {
    // If currently counting down, cancel and return to idle
    if (this.isCountingDown) {
      this.cancelCountdown();
      // Notify that we're back to idle
      document.dispatchEvent(new CustomEvent("scrolling-toggled", {
        detail: { isScrolling: false, isCountingDown: false },
      }));
      return;
    }

    // If currently ramping down, ignore toggle (let it complete)
    if (this.isRampingDown) {
      return;
    }

    if (this.state.isScrolling) {
      // Stop scrolling with ramp-down
      this.isRampingDown = true;
      this.rampDownStartTime = performance.now();

      // Clear any existing timeout
      if (this.rampDownTimeoutId !== null) {
        clearTimeout(this.rampDownTimeoutId);
      }

      // Let the animation loop handle the ramp-down, then stop
      this.rampDownTimeoutId = window.setTimeout(() => {
        if (this.animationFrameId !== null) {
          window.cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }
        this.state.isScrolling = false;
        this.isRampingDown = false;
        this.rampDownTimeoutId = null;
        // Notify that scrolling state changed
        document.dispatchEvent(new CustomEvent("scrolling-toggled", {
          detail: { isScrolling: false, isCountingDown: false },
        }));
      }, CONFIG.RAMP_DURATION);
    } else {
      // Start scrolling with countdown
      if (this.state.scriptEnded && this.telepromptTextInner) {
        // Reset to start
        this.currentTranslateY = 0;
        this.applyTransform();
        this.state.activeLineIndex = 0;
        this.state.scriptEnded = false;
        this.updateTelepromptText(); // Update display to show reset state
      }

      // Notify that countdown is starting
      document.dispatchEvent(new CustomEvent("scrolling-toggled", {
        detail: { isScrolling: false, isCountingDown: true },
      }));

      // Show countdown then start scrolling with ramp-up
      this.showCountdown().then((completed) => {
        if (!completed) {
          // Countdown was cancelled
          return;
        }
        this.state.isScrolling = true;
        this.isRampingUp = true;
        this.scrollStartTime = performance.now();
        this.lastTimestamp = performance.now();
        this.lastActiveLineUpdate = 0; // Reset throttle
        this.animationFrameId = window.requestAnimationFrame(this.animateScroll);
        // Notify that scrolling state changed
        document.dispatchEvent(new CustomEvent("scrolling-toggled", {
          detail: { isScrolling: true, isCountingDown: false },
        }));
      });
    }
  }

  private setupCustomEventListeners() {
    this.backToTopHandler = () => {
      // When going back to top, apply a smooth transition
      if (this.telepromptTextInner) {
        // Calculate appropriate transition duration based on current position and speed
        const distanceToTop = Math.abs(this.currentTranslateY);
        const avgLineHeight = this.getLineHeight();
        const pixelsPerSecond = avgLineHeight * this.state.scrollSpeed;
        const transitionDuration = Math.min(0.5, distanceToTop / (pixelsPerSecond * 2));

        this.telepromptTextInner.style.transition = `transform ${transitionDuration}s ease-out`;
        this.currentTranslateY = 0;
        this.applyTransform();

        // Reset to no transition after animation is done
        setTimeout(() => {
          if (this.telepromptTextInner) {
            this.telepromptTextInner.style.transition = "none";
          }
        }, transitionDuration * 1000);
      }

      this.state.activeLineIndex = 0;
      this.state.scriptEnded = false;
      this.updateTelepromptText();
    };
    document.addEventListener("back-to-top", this.backToTopHandler as EventListener);
  }

  // Compose transform from translateY and flip state - prevents accumulation
  private applyTransform() {
    if (!this.telepromptTextInner) return;
    const translatePart = `translateY(${this.currentTranslateY}px)`;
    const flipX = this.state.isFlipped ? " scaleX(-1)" : "";
    const flipY = this.state.isFlippedVertical ? " scaleY(-1)" : "";
    this.telepromptTextInner.style.transform = translatePart + flipX + flipY;
  }

  updateStyles() {
    if (!this.telepromptTextInner) return;
    this.telepromptTextInner.style.fontFamily = getFontFamily(this.state.fontFamily);
    this.telepromptTextInner.style.fontSize = `${this.state.fontSize}px`;
    this.telepromptTextInner.style.color = this.state.fontColor;
    this.telepromptTextInner.style.lineHeight = `${this.state.lineSpacing}`;
    this.telepromptTextInner.style.letterSpacing = `${this.state.letterSpacing}px`;
    if (this.element) {
      this.element.style.backgroundColor = this.state.backgroundColor;
      this.element.classList.toggle("flipped", this.state.isFlipped);
    }
    // Apply transform correctly without accumulation
    this.applyTransform();
    // Invalidate cached line height when styles change
    this.cachedLineHeight = 0;
    this.cachedLines = null;
    // Reset scriptEnded flag if text changes or styles affecting layout change
    this.state.scriptEnded = false;
    this.updateTelepromptText();
  }

  private updateActiveLine() {
    if (!this.telepromptTextInner) return;

    // Ensure lines are cached
    if (!this.cachedLines) {
      this.cachedLines = this.element.querySelectorAll(".line");
    }

    const lines = this.cachedLines;
    if (lines.length === 0) return;

    // Use the bounding client rect to find which line is at the center of the screen
    const containerRect = this.telepromptText.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    let newActiveIndex = -1;
    let minDistance = Infinity;

    // Find which line is closest to center
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const lineRect = line.getBoundingClientRect();
      const lineCenter = lineRect.top + lineRect.height / 2;
      const distance = Math.abs(lineCenter - containerCenter);

      if (distance < minDistance) {
        minDistance = distance;
        newActiveIndex = index;
      }

      // Early exit optimization: if we've passed center and distance is increasing, stop
      if (lineCenter > containerCenter && distance > minDistance) {
        break;
      }
    }

    // Update the active line class
    if (newActiveIndex >= 0 && newActiveIndex !== this.state.activeLineIndex) {
      // Remove active class from old line (use cached reference)
      const oldActiveLine = lines[this.state.activeLineIndex];
      if (oldActiveLine) {
        oldActiveLine.classList.remove("active-line");
      }
      // Add active class to new line
      const newActiveLine = lines[newActiveIndex];
      if (newActiveLine) {
        newActiveLine.classList.add("active-line");
      }
      this.state.activeLineIndex = newActiveIndex;
    }
  }

  // Cleanup method to remove event listeners and clear timers
  destroy() {
    // Remove event listeners
    if (this.keydownHandler) {
      document.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.backToTopHandler) {
      document.removeEventListener("back-to-top", this.backToTopHandler as EventListener);
      this.backToTopHandler = null;
    }

    // Clear intervals and timeouts
    if (this.countdownIntervalId !== null) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
    if (this.rampDownTimeoutId !== null) {
      clearTimeout(this.rampDownTimeoutId);
      this.rampDownTimeoutId = null;
    }
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remove DOM element
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

// Floating Toolbar Component
class FloatingToolbar {
  private element: HTMLDivElement;
  private state: TeleprompterState;
  private editBtn: HTMLButtonElement;
  private playPauseBtn: HTMLButtonElement;
  private speedMinusBtn: HTMLButtonElement;
  private speedPlusBtn: HTMLButtonElement;
  private speedValue: HTMLSpanElement;
  private fullscreenBtn: HTMLButtonElement;
  private settingsBtn: HTMLButtonElement;
  private helpBtn: HTMLButtonElement;
  private scrollingToggledHandler: ((e: CustomEvent<ScrollingToggledDetail>) => void) | null = null;
  private fullscreenChangeHandler: (() => void) | null = null;
  private autoHideTimeout: number | null = null;
  private i18nUnsubscribe: (() => void) | null = null;

  // Callbacks
  private onEditClick: () => void;
  private onSettingsClick: () => void;
  private onHelpClick: () => void;

  constructor(
    container: HTMLElement,
    state: TeleprompterState,
    callbacks: {
      onEditClick: () => void;
      onSettingsClick: () => void;
      onHelpClick: () => void;
    }
  ) {
    this.state = state;
    this.onEditClick = callbacks.onEditClick;
    this.onSettingsClick = callbacks.onSettingsClick;
    this.onHelpClick = callbacks.onHelpClick;

    // Create toolbar element
    this.element = document.createElement("div");
    this.element.className = "floating-toolbar";

    // Create buttons
    this.editBtn = this.createButton("toolbar-btn toolbar-btn-edit toolbar-btn-icon", editIcon, i18n.t('edit'));
    this.playPauseBtn = this.createButton("toolbar-btn toolbar-btn-play", "", i18n.t('play'));
    this.playPauseBtn.textContent = i18n.t('play');

    // Speed control
    const speedControl = document.createElement("div");
    speedControl.className = "speed-control";

    this.speedMinusBtn = document.createElement("button");
    this.speedMinusBtn.className = "speed-btn";
    this.speedMinusBtn.textContent = "−";
    this.speedMinusBtn.setAttribute("aria-label", i18n.t('decreaseSpeed'));

    this.speedValue = document.createElement("span");
    this.speedValue.className = "speed-value";
    this.speedValue.textContent = `${this.state.scrollSpeed}x`;

    this.speedPlusBtn = document.createElement("button");
    this.speedPlusBtn.className = "speed-btn";
    this.speedPlusBtn.textContent = "+";
    this.speedPlusBtn.setAttribute("aria-label", i18n.t('increaseSpeed'));

    speedControl.appendChild(this.speedMinusBtn);
    speedControl.appendChild(this.speedValue);
    speedControl.appendChild(this.speedPlusBtn);

    this.fullscreenBtn = this.createButton("toolbar-btn toolbar-btn-fullscreen toolbar-btn-icon", fullscreenEnterIcon, i18n.t('toggleFullscreen'));
    this.settingsBtn = this.createButton("toolbar-btn toolbar-btn-settings toolbar-btn-icon", settingsIcon, i18n.t('settings'));
    this.helpBtn = this.createButton("toolbar-btn toolbar-btn-help toolbar-btn-icon", helpIcon, i18n.t('helpKeyboardShortcuts'));

    // Append all elements
    this.element.appendChild(this.editBtn);
    this.element.appendChild(this.playPauseBtn);
    this.element.appendChild(speedControl);
    this.element.appendChild(this.fullscreenBtn);
    this.element.appendChild(this.settingsBtn);
    this.element.appendChild(this.helpBtn);

    container.appendChild(this.element);

    this.setupEventListeners();

    // Subscribe to locale changes
    this.i18nUnsubscribe = i18n.onChange(() => {
      this.updateLabels();
    });
  }

  private createButton(className: string, iconHtml: string, ariaLabel: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = className;
    btn.innerHTML = iconHtml;
    btn.setAttribute("aria-label", ariaLabel);
    return btn;
  }

  private updateLabels() {
    this.editBtn.setAttribute("aria-label", i18n.t('edit'));
    this.speedMinusBtn.setAttribute("aria-label", i18n.t('decreaseSpeed'));
    this.speedPlusBtn.setAttribute("aria-label", i18n.t('increaseSpeed'));
    this.fullscreenBtn.setAttribute("aria-label", i18n.t('toggleFullscreen'));
    this.settingsBtn.setAttribute("aria-label", i18n.t('settings'));
    this.helpBtn.setAttribute("aria-label", i18n.t('helpKeyboardShortcuts'));
    // Play/pause button text is managed by scrolling-toggled event
  }

  private setupEventListeners() {
    // Edit button
    this.editBtn.addEventListener("click", () => {
      this.onEditClick();
    });

    // Play/Pause button
    this.playPauseBtn.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("toggle-scrolling"));
    });

    // Speed controls
    this.speedMinusBtn.addEventListener("click", () => {
      this.state.scrollSpeed = Math.max(CONFIG.SCROLL_SPEED.MIN, this.state.scrollSpeed - CONFIG.SCROLL_SPEED.STEP);
      this.state.scrollSpeed = Math.round(this.state.scrollSpeed * 10) / 10;
      this.updateSpeedDisplay();
      document.dispatchEvent(new CustomEvent("speed-changed"));
    });

    this.speedPlusBtn.addEventListener("click", () => {
      this.state.scrollSpeed = Math.min(CONFIG.SCROLL_SPEED.MAX, this.state.scrollSpeed + CONFIG.SCROLL_SPEED.STEP);
      this.state.scrollSpeed = Math.round(this.state.scrollSpeed * 10) / 10;
      this.updateSpeedDisplay();
      document.dispatchEvent(new CustomEvent("speed-changed"));
    });

    // Fullscreen button
    this.fullscreenBtn.addEventListener("click", () => {
      this.toggleFullscreen();
    });

    // Settings button
    this.settingsBtn.addEventListener("click", () => {
      this.onSettingsClick();
    });

    // Help button
    this.helpBtn.addEventListener("click", () => {
      this.onHelpClick();
    });

    // Listen for scrolling state changes
    this.scrollingToggledHandler = (e: CustomEvent<ScrollingToggledDetail>) => {
      if (e.detail.isCountingDown) {
        this.playPauseBtn.textContent = i18n.t('cancel');
        this.playPauseBtn.classList.remove("playing");
        this.playPauseBtn.classList.add("countdown");
      } else if (e.detail.isScrolling) {
        this.playPauseBtn.textContent = i18n.t('pause');
        this.playPauseBtn.classList.add("playing");
        this.playPauseBtn.classList.remove("countdown");
        this.startAutoHide();
      } else {
        this.playPauseBtn.textContent = i18n.t('play');
        this.playPauseBtn.classList.remove("playing", "countdown");
        this.stopAutoHide();
      }
    };
    document.addEventListener("scrolling-toggled", this.scrollingToggledHandler as EventListener);

    // Listen for fullscreen changes
    this.fullscreenChangeHandler = () => {
      this.updateFullscreenIcon();
    };
    document.addEventListener("fullscreenchange", this.fullscreenChangeHandler);
  }

  private toggleFullscreen() {
    const appRoot = document.documentElement;

    if (!document.fullscreenElement) {
      appRoot.requestFullscreen().catch((err) => {
        alert(`${i18n.t('fullscreenError')}: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  private updateFullscreenIcon() {
    this.fullscreenBtn.innerHTML = document.fullscreenElement
      ? fullscreenExitIcon
      : fullscreenEnterIcon;
  }

  private updateSpeedDisplay() {
    this.speedValue.textContent = `${this.state.scrollSpeed}x`;
  }

  updateSpeed(speed: number) {
    this.state.scrollSpeed = speed;
    this.updateSpeedDisplay();
  }

  private startAutoHide() {
    // Only auto-hide in phone landscape mode
    if (window.innerWidth <= 900 && window.innerHeight <= 500) {
      this.stopAutoHide();
      this.autoHideTimeout = window.setTimeout(() => {
        this.element.classList.add("auto-hide");
      }, 3000);
    }
  }

  private stopAutoHide() {
    if (this.autoHideTimeout !== null) {
      clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = null;
    }
    this.element.classList.remove("auto-hide");
  }

  destroy() {
    if (this.scrollingToggledHandler) {
      document.removeEventListener("scrolling-toggled", this.scrollingToggledHandler as EventListener);
      this.scrollingToggledHandler = null;
    }
    if (this.fullscreenChangeHandler) {
      document.removeEventListener("fullscreenchange", this.fullscreenChangeHandler);
      this.fullscreenChangeHandler = null;
    }
    if (this.i18nUnsubscribe) {
      this.i18nUnsubscribe();
      this.i18nUnsubscribe = null;
    }
    this.stopAutoHide();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

// Settings Drawer Component
class SettingsDrawer {
  private backdrop: HTMLDivElement;
  private drawer: HTMLDivElement;
  private state: TeleprompterState;
  private onStateChange: () => void;
  private isOpen: boolean = false;
  private activeTab: string = "display";
  private i18nUnsubscribe: (() => void) | null = null;
  private settingsChangedHandler: (() => void) | null = null;

  // Input references for updating labels
  private fontSizeInput: HTMLInputElement | null = null;
  private fontSizeLabel: HTMLLabelElement | null = null;
  private lineSpacingInput: HTMLInputElement | null = null;
  private lineSpacingLabel: HTMLLabelElement | null = null;
  private letterSpacingInput: HTMLInputElement | null = null;
  private letterSpacingLabel: HTMLLabelElement | null = null;
  private scrollSpeedInput: HTMLInputElement | null = null;
  private scrollSpeedLabel: HTMLLabelElement | null = null;
  private maxWordsPerLineInput: HTMLInputElement | null = null;
  private maxWordsPerLineLabel: HTMLLabelElement | null = null;
  private tabButtons: HTMLButtonElement[] = [];
  private closeBtn: HTMLButtonElement | null = null;

  constructor(
    container: HTMLElement,
    state: TeleprompterState,
    onStateChange: () => void
  ) {
    this.state = state;
    this.onStateChange = onStateChange;

    // Create backdrop
    this.backdrop = document.createElement("div");
    this.backdrop.className = "settings-drawer-backdrop";
    this.backdrop.addEventListener("click", () => this.close());

    // Create drawer
    this.drawer = document.createElement("div");
    this.drawer.className = "settings-drawer";

    this.render();

    container.appendChild(this.backdrop);
    container.appendChild(this.drawer);

    // Subscribe to locale changes
    this.i18nUnsubscribe = i18n.onChange(() => {
      this.updateLabels();
    });

    // Subscribe to settings changes (from keyboard shortcuts)
    this.settingsChangedHandler = () => {
      this.syncInputsFromState();
    };
    document.addEventListener("settings-changed", this.settingsChangedHandler);
  }

  private render() {
    // Drag handle
    const handle = document.createElement("div");
    handle.className = "drawer-handle";
    this.drawer.appendChild(handle);

    // Tab navigation
    const tabs = document.createElement("div");
    tabs.className = "drawer-tabs";

    const tabNames = [
      { id: "display", label: i18n.t('display') },
      { id: "typography", label: i18n.t('typography') },
      { id: "general", label: i18n.t('general') },
    ];

    this.tabButtons = tabNames.map(({ id, label }) => {
      const btn = document.createElement("button");
      btn.className = `drawer-tab${id === this.activeTab ? " active" : ""}`;
      btn.textContent = label;
      btn.dataset.tab = id;
      btn.addEventListener("click", () => this.switchTab(id));
      tabs.appendChild(btn);
      return btn;
    });

    this.drawer.appendChild(tabs);

    // Content area
    const content = document.createElement("div");
    content.className = "drawer-content";

    // Display tab
    const displayPanel = this.createPanel("display");
    this.renderDisplayTab(displayPanel);
    content.appendChild(displayPanel);

    // Typography tab
    const typographyPanel = this.createPanel("typography");
    this.renderTypographyTab(typographyPanel);
    content.appendChild(typographyPanel);

    // General tab
    const generalPanel = this.createPanel("general");
    this.renderGeneralTab(generalPanel);
    content.appendChild(generalPanel);

    this.drawer.appendChild(content);

    // Close button
    this.closeBtn = document.createElement("button");
    this.closeBtn.className = "drawer-close-btn";
    this.closeBtn.textContent = i18n.t('closeDrawer');
    this.closeBtn.addEventListener("click", () => this.close());

    const closeContainer = document.createElement("div");
    closeContainer.style.padding = "0 16px 16px";
    closeContainer.appendChild(this.closeBtn);
    this.drawer.appendChild(closeContainer);
  }

  private createPanel(id: string): HTMLDivElement {
    const panel = document.createElement("div");
    panel.className = `drawer-tab-panel${id === this.activeTab ? " active" : ""}`;
    panel.dataset.panel = id;
    return panel;
  }

  private renderDisplayTab(panel: HTMLDivElement) {
    // Font Size
    const fontSizeGroup = this.createSettingsGroup();
    this.fontSizeLabel = document.createElement("label");
    this.fontSizeLabel.className = "settings-label";
    this.fontSizeLabel.textContent = formatLabel('fontSize', this.state.fontSize, 'px');

    const fontSizeRow = document.createElement("div");
    fontSizeRow.className = "settings-row";

    this.fontSizeInput = document.createElement("input");
    this.fontSizeInput.type = "range";
    this.fontSizeInput.min = CONFIG.FONT_SIZE.MIN.toString();
    this.fontSizeInput.max = CONFIG.FONT_SIZE.MAX.toString();
    this.fontSizeInput.value = this.state.fontSize.toString();
    this.fontSizeInput.addEventListener("input", () => {
      this.state.fontSize = this.fontSizeInput!.valueAsNumber;
      this.fontSizeLabel!.textContent = formatLabel('fontSize', this.state.fontSize, 'px');
      this.onStateChange();
    });

    fontSizeRow.appendChild(this.fontSizeInput);
    fontSizeGroup.appendChild(this.fontSizeLabel);
    fontSizeGroup.appendChild(fontSizeRow);
    panel.appendChild(fontSizeGroup);

    // Colors row
    const colorsGroup = this.createSettingsGroup();
    const colorsLabel = document.createElement("label");
    colorsLabel.className = "settings-label";
    colorsLabel.textContent = `${i18n.t('fontColor')} / ${i18n.t('backgroundColor')}`;

    const colorsRow = document.createElement("div");
    colorsRow.className = "settings-color-row";

    // Font color
    const fontColorItem = document.createElement("div");
    fontColorItem.className = "settings-color-item";
    const fontColorInput = document.createElement("input");
    fontColorInput.type = "color";
    fontColorInput.className = "settings-color-input";
    fontColorInput.value = this.state.fontColor;
    fontColorInput.addEventListener("input", () => {
      this.state.fontColor = fontColorInput.value;
      this.onStateChange();
    });
    fontColorItem.appendChild(fontColorInput);

    // Background color
    const bgColorItem = document.createElement("div");
    bgColorItem.className = "settings-color-item";
    const bgColorInput = document.createElement("input");
    bgColorInput.type = "color";
    bgColorInput.className = "settings-color-input";
    bgColorInput.value = this.state.backgroundColor;
    bgColorInput.addEventListener("input", () => {
      this.state.backgroundColor = bgColorInput.value;
      this.onStateChange();
    });
    bgColorItem.appendChild(bgColorInput);

    colorsRow.appendChild(fontColorItem);
    colorsRow.appendChild(bgColorItem);
    colorsGroup.appendChild(colorsLabel);
    colorsGroup.appendChild(colorsRow);
    panel.appendChild(colorsGroup);

    // Flip controls - Apple-style with full a11y
    const flipGroup = document.createElement("div");
    flipGroup.className = "flip-controls-group";
    flipGroup.setAttribute("role", "group");
    flipGroup.setAttribute("aria-label", i18n.t('flipScreen'));

    // Horizontal flip row
    const flipRow = document.createElement("div");
    flipRow.className = "flip-control-row";

    const flipLabelContainer = document.createElement("div");
    flipLabelContainer.className = "flip-control-label";

    const flipTitleId = "flip-horizontal-title";
    const flipDescId = "flip-horizontal-desc";

    const flipTitle = document.createElement("span");
    flipTitle.className = "flip-control-title";
    flipTitle.id = flipTitleId;
    flipTitle.textContent = i18n.t('flipScreen');

    const flipSubtitle = document.createElement("span");
    flipSubtitle.className = "flip-control-subtitle";
    flipSubtitle.id = flipDescId;
    flipSubtitle.textContent = i18n.t('tipFlipMode');

    flipLabelContainer.appendChild(flipTitle);
    flipLabelContainer.appendChild(flipSubtitle);

    const flipToggle = document.createElement("label");
    flipToggle.className = "toggle-switch";
    const flipInput = document.createElement("input");
    flipInput.type = "checkbox";
    flipInput.checked = this.state.isFlipped;
    flipInput.setAttribute("role", "switch");
    flipInput.setAttribute("aria-checked", String(this.state.isFlipped));
    flipInput.setAttribute("aria-labelledby", flipTitleId);
    flipInput.setAttribute("aria-describedby", flipDescId);
    flipInput.addEventListener("change", () => {
      this.state.isFlipped = flipInput.checked;
      flipInput.setAttribute("aria-checked", String(flipInput.checked));
      this.onStateChange();
    });
    const flipSlider = document.createElement("span");
    flipSlider.className = "toggle-slider";
    flipSlider.setAttribute("aria-hidden", "true");
    flipToggle.appendChild(flipInput);
    flipToggle.appendChild(flipSlider);

    flipRow.appendChild(flipLabelContainer);
    flipRow.appendChild(flipToggle);
    flipGroup.appendChild(flipRow);

    // Vertical flip row
    const flipVerticalRow = document.createElement("div");
    flipVerticalRow.className = "flip-control-row";

    const flipVerticalLabelContainer = document.createElement("div");
    flipVerticalLabelContainer.className = "flip-control-label";

    const flipVerticalTitleId = "flip-vertical-title";
    const flipVerticalDescId = "flip-vertical-desc";

    const flipVerticalTitle = document.createElement("span");
    flipVerticalTitle.className = "flip-control-title";
    flipVerticalTitle.id = flipVerticalTitleId;
    flipVerticalTitle.textContent = i18n.t('flipVertical');

    const flipVerticalSubtitle = document.createElement("span");
    flipVerticalSubtitle.className = "flip-control-subtitle";
    flipVerticalSubtitle.id = flipVerticalDescId;
    flipVerticalSubtitle.textContent = i18n.t('tipFlipVertical');

    flipVerticalLabelContainer.appendChild(flipVerticalTitle);
    flipVerticalLabelContainer.appendChild(flipVerticalSubtitle);

    const flipVerticalToggle = document.createElement("label");
    flipVerticalToggle.className = "toggle-switch";
    const flipVerticalInput = document.createElement("input");
    flipVerticalInput.type = "checkbox";
    flipVerticalInput.checked = this.state.isFlippedVertical;
    flipVerticalInput.setAttribute("role", "switch");
    flipVerticalInput.setAttribute("aria-checked", String(this.state.isFlippedVertical));
    flipVerticalInput.setAttribute("aria-labelledby", flipVerticalTitleId);
    flipVerticalInput.setAttribute("aria-describedby", flipVerticalDescId);
    flipVerticalInput.addEventListener("change", () => {
      this.state.isFlippedVertical = flipVerticalInput.checked;
      flipVerticalInput.setAttribute("aria-checked", String(flipVerticalInput.checked));
      this.onStateChange();
    });
    const flipVerticalSlider = document.createElement("span");
    flipVerticalSlider.className = "toggle-slider";
    flipVerticalSlider.setAttribute("aria-hidden", "true");
    flipVerticalToggle.appendChild(flipVerticalInput);
    flipVerticalToggle.appendChild(flipVerticalSlider);

    flipVerticalRow.appendChild(flipVerticalLabelContainer);
    flipVerticalRow.appendChild(flipVerticalToggle);
    flipGroup.appendChild(flipVerticalRow);

    panel.appendChild(flipGroup);
  }

  private renderTypographyTab(panel: HTMLDivElement) {
    // Font Family
    const fontFamilyGroup = this.createSettingsGroup();
    const fontFamilyLabel = document.createElement("label");
    fontFamilyLabel.className = "settings-label";
    fontFamilyLabel.textContent = i18n.t('font');

    const fontFamilySelect = document.createElement("select");
    fontFamilySelect.className = "settings-select";

    const fontOptions = [
      "System",
      "Arial",
      "Times New Roman",
      "Courier New",
      "Georgia",
      "Verdana",
      "Roboto",
      "Open Sans",
    ];

    fontOptions.forEach((font) => {
      const option = document.createElement("option");
      option.value = font;
      option.textContent = font;
      if (this.state.fontFamily === font) {
        option.selected = true;
      }
      fontFamilySelect.appendChild(option);
    });

    fontFamilySelect.addEventListener("change", () => {
      this.state.fontFamily = fontFamilySelect.value;
      this.onStateChange();
    });

    fontFamilyGroup.appendChild(fontFamilyLabel);
    fontFamilyGroup.appendChild(fontFamilySelect);
    panel.appendChild(fontFamilyGroup);

    // Line Spacing
    const lineSpacingGroup = this.createSettingsGroup();
    this.lineSpacingLabel = document.createElement("label");
    this.lineSpacingLabel.className = "settings-label";
    this.lineSpacingLabel.textContent = formatLabel('lineSpacing', this.state.lineSpacing);

    this.lineSpacingInput = document.createElement("input");
    this.lineSpacingInput.type = "range";
    this.lineSpacingInput.min = CONFIG.LINE_SPACING.MIN.toString();
    this.lineSpacingInput.max = CONFIG.LINE_SPACING.MAX.toString();
    this.lineSpacingInput.step = CONFIG.LINE_SPACING.STEP.toString();
    this.lineSpacingInput.value = this.state.lineSpacing.toString();
    this.lineSpacingInput.addEventListener("input", () => {
      this.state.lineSpacing = parseFloat(this.lineSpacingInput!.value);
      this.lineSpacingLabel!.textContent = formatLabel('lineSpacing', this.state.lineSpacing);
      this.onStateChange();
    });

    lineSpacingGroup.appendChild(this.lineSpacingLabel);
    lineSpacingGroup.appendChild(this.lineSpacingInput);
    panel.appendChild(lineSpacingGroup);

    // Letter Spacing
    const letterSpacingGroup = this.createSettingsGroup();
    this.letterSpacingLabel = document.createElement("label");
    this.letterSpacingLabel.className = "settings-label";
    this.letterSpacingLabel.textContent = formatLabel('letterSpacing', this.state.letterSpacing, 'px');

    this.letterSpacingInput = document.createElement("input");
    this.letterSpacingInput.type = "range";
    this.letterSpacingInput.min = CONFIG.LETTER_SPACING.MIN.toString();
    this.letterSpacingInput.max = CONFIG.LETTER_SPACING.MAX.toString();
    this.letterSpacingInput.value = this.state.letterSpacing.toString();
    this.letterSpacingInput.addEventListener("input", () => {
      this.state.letterSpacing = this.letterSpacingInput!.valueAsNumber;
      this.letterSpacingLabel!.textContent = formatLabel('letterSpacing', this.state.letterSpacing, 'px');
      this.onStateChange();
    });

    letterSpacingGroup.appendChild(this.letterSpacingLabel);
    letterSpacingGroup.appendChild(this.letterSpacingInput);
    panel.appendChild(letterSpacingGroup);

    // Max Words Per Line
    const maxWordsGroup = this.createSettingsGroup();
    this.maxWordsPerLineLabel = document.createElement("label");
    this.maxWordsPerLineLabel.className = "settings-label";
    this.maxWordsPerLineLabel.textContent = formatLabel('maxWordsPerLine', this.state.maxWordsPerLine);

    this.maxWordsPerLineInput = document.createElement("input");
    this.maxWordsPerLineInput.type = "number";
    this.maxWordsPerLineInput.className = "settings-select";
    this.maxWordsPerLineInput.min = CONFIG.MAX_WORDS_PER_LINE.MIN.toString();
    this.maxWordsPerLineInput.value = this.state.maxWordsPerLine.toString();
    this.maxWordsPerLineInput.addEventListener("input", () => {
      const value = this.maxWordsPerLineInput!.valueAsNumber;
      this.state.maxWordsPerLine = Number.isNaN(value) || value < 0 ? 0 : Math.floor(value);
      this.maxWordsPerLineLabel!.textContent = formatLabel('maxWordsPerLine', this.state.maxWordsPerLine);
      this.onStateChange();
    });

    maxWordsGroup.appendChild(this.maxWordsPerLineLabel);
    maxWordsGroup.appendChild(this.maxWordsPerLineInput);
    panel.appendChild(maxWordsGroup);

    // Scroll Speed
    const scrollSpeedGroup = this.createSettingsGroup();
    this.scrollSpeedLabel = document.createElement("label");
    this.scrollSpeedLabel.className = "settings-label";
    this.scrollSpeedLabel.textContent = formatLabel('scrollSpeed', `${this.state.scrollSpeed} `, 'linesPerSec');

    this.scrollSpeedInput = document.createElement("input");
    this.scrollSpeedInput.type = "range";
    this.scrollSpeedInput.min = CONFIG.SCROLL_SPEED.MIN.toString();
    this.scrollSpeedInput.max = CONFIG.SCROLL_SPEED.MAX.toString();
    this.scrollSpeedInput.step = CONFIG.SCROLL_SPEED.STEP.toString();
    this.scrollSpeedInput.value = this.state.scrollSpeed.toString();
    this.scrollSpeedInput.addEventListener("input", () => {
      this.state.scrollSpeed = parseFloat(this.scrollSpeedInput!.value);
      this.state.scrollSpeed = Math.round(this.state.scrollSpeed * 10) / 10;
      this.scrollSpeedLabel!.textContent = formatLabel('scrollSpeed', `${this.state.scrollSpeed} `, 'linesPerSec');
      this.onStateChange();
      document.dispatchEvent(new CustomEvent("speed-changed"));
    });

    scrollSpeedGroup.appendChild(this.scrollSpeedLabel);
    scrollSpeedGroup.appendChild(this.scrollSpeedInput);
    panel.appendChild(scrollSpeedGroup);
  }

  private renderGeneralTab(panel: HTMLDivElement) {
    // Language
    const languageGroup = this.createSettingsGroup();
    const languageLabel = document.createElement("label");
    languageLabel.className = "settings-label";
    languageLabel.textContent = i18n.t('language');

    const languageSelect = document.createElement("select");
    languageSelect.className = "settings-select";

    i18n.getAvailableLocales().forEach((locale) => {
      const option = document.createElement("option");
      option.value = locale.code;
      option.textContent = locale.name;
      if (i18n.locale === locale.code) {
        option.selected = true;
      }
      languageSelect.appendChild(option);
    });

    languageSelect.addEventListener("change", () => {
      i18n.setLocale(languageSelect.value as Locale);
    });

    languageGroup.appendChild(languageLabel);
    languageGroup.appendChild(languageSelect);
    panel.appendChild(languageGroup);

    // Back to Top button
    const backToTopGroup = this.createSettingsGroup();
    const backToTopBtn = document.createElement("button");
    backToTopBtn.className = "drawer-close-btn";
    backToTopBtn.style.marginTop = "0";
    backToTopBtn.textContent = i18n.t('backToTop');
    backToTopBtn.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("back-to-top"));
      this.close();
    });
    backToTopGroup.appendChild(backToTopBtn);
    panel.appendChild(backToTopGroup);
  }

  private createSettingsGroup(): HTMLDivElement {
    const group = document.createElement("div");
    group.className = "settings-group";
    return group;
  }

  private switchTab(tabId: string) {
    this.activeTab = tabId;

    // Update tab buttons
    this.tabButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });

    // Update panels
    this.drawer.querySelectorAll(".drawer-tab-panel").forEach((panel) => {
      panel.classList.toggle("active", (panel as HTMLElement).dataset.panel === tabId);
    });
  }

  private updateLabels() {
    // Update tab labels
    const tabNames = [i18n.t('display'), i18n.t('typography'), i18n.t('general')];
    this.tabButtons.forEach((btn, index) => {
      btn.textContent = tabNames[index];
    });

    // Update close button
    if (this.closeBtn) {
      this.closeBtn.textContent = i18n.t('closeDrawer');
    }

    // Update other labels
    if (this.fontSizeLabel) {
      this.fontSizeLabel.textContent = formatLabel('fontSize', this.state.fontSize, 'px');
    }
    if (this.lineSpacingLabel) {
      this.lineSpacingLabel.textContent = formatLabel('lineSpacing', this.state.lineSpacing);
    }
    if (this.letterSpacingLabel) {
      this.letterSpacingLabel.textContent = formatLabel('letterSpacing', this.state.letterSpacing, 'px');
    }
    if (this.scrollSpeedLabel) {
      this.scrollSpeedLabel.textContent = formatLabel('scrollSpeed', `${this.state.scrollSpeed} `, 'linesPerSec');
    }
    if (this.maxWordsPerLineLabel) {
      this.maxWordsPerLineLabel.textContent = formatLabel('maxWordsPerLine', this.state.maxWordsPerLine);
    }
  }

  // Sync input values from state (called when settings change via keyboard shortcuts)
  private syncInputsFromState() {
    if (this.fontSizeInput) {
      this.fontSizeInput.value = this.state.fontSize.toString();
    }
    if (this.fontSizeLabel) {
      this.fontSizeLabel.textContent = formatLabel('fontSize', this.state.fontSize, 'px');
    }
    if (this.lineSpacingInput) {
      this.lineSpacingInput.value = this.state.lineSpacing.toString();
    }
    if (this.lineSpacingLabel) {
      this.lineSpacingLabel.textContent = formatLabel('lineSpacing', this.state.lineSpacing);
    }
    if (this.letterSpacingInput) {
      this.letterSpacingInput.value = this.state.letterSpacing.toString();
    }
    if (this.letterSpacingLabel) {
      this.letterSpacingLabel.textContent = formatLabel('letterSpacing', this.state.letterSpacing, 'px');
    }
  }

  open() {
    this.isOpen = true;
    this.backdrop.classList.add("open");
    this.drawer.classList.add("open");
    // Notify that drawer is open (for teleprompter container resizing)
    document.dispatchEvent(new CustomEvent("drawer-opened"));
  }

  close() {
    this.isOpen = false;
    this.backdrop.classList.remove("open");
    this.drawer.classList.remove("open");
    document.dispatchEvent(new CustomEvent("drawer-closed"));
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  updateScrollSpeed(speed: number) {
    if (this.scrollSpeedInput) {
      this.scrollSpeedInput.value = speed.toString();
    }
    if (this.scrollSpeedLabel) {
      this.scrollSpeedLabel.textContent = formatLabel('scrollSpeed', `${speed} `, 'linesPerSec');
    }
  }

  destroy() {
    if (this.i18nUnsubscribe) {
      this.i18nUnsubscribe();
      this.i18nUnsubscribe = null;
    }
    if (this.settingsChangedHandler) {
      document.removeEventListener("settings-changed", this.settingsChangedHandler);
      this.settingsChangedHandler = null;
    }
    if (this.backdrop && this.backdrop.parentNode) {
      this.backdrop.parentNode.removeChild(this.backdrop);
    }
    if (this.drawer && this.drawer.parentNode) {
      this.drawer.parentNode.removeChild(this.drawer);
    }
  }
}

// Script Editor Component (Full-screen overlay)
class ScriptEditor {
  private overlay: HTMLDivElement;
  private textarea: HTMLTextAreaElement;
  private charCount: HTMLDivElement;
  private state: TeleprompterState;
  private onSave: () => void;
  private isOpen: boolean = false;
  private escKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private i18nUnsubscribe: (() => void) | null = null;
  private closeBtn: HTMLButtonElement;
  private titleSpan: HTMLSpanElement;
  private saveBtn: HTMLButtonElement;

  constructor(
    container: HTMLElement,
    state: TeleprompterState,
    onSave: () => void
  ) {
    this.state = state;
    this.onSave = onSave;

    // Create overlay
    this.overlay = document.createElement("div");
    this.overlay.className = "script-editor-overlay";

    // Header
    const header = document.createElement("div");
    header.className = "editor-header";

    this.closeBtn = document.createElement("button");
    this.closeBtn.className = "editor-close-btn";
    this.closeBtn.innerHTML = closeIcon;
    const closeText = document.createElement("span");
    closeText.textContent = i18n.t('close');
    this.closeBtn.appendChild(closeText);
    this.closeBtn.addEventListener("click", () => this.close());

    this.titleSpan = document.createElement("span");
    this.titleSpan.className = "editor-title";
    this.titleSpan.textContent = i18n.t('editScript');

    this.saveBtn = document.createElement("button");
    this.saveBtn.className = "editor-save-btn";
    this.saveBtn.textContent = i18n.t('saveAndClose');
    this.saveBtn.addEventListener("click", () => this.saveAndClose());

    header.appendChild(this.closeBtn);
    header.appendChild(this.titleSpan);
    header.appendChild(this.saveBtn);
    this.overlay.appendChild(header);

    // Textarea container
    const textareaContainer = document.createElement("div");
    textareaContainer.className = "editor-textarea-container";

    this.textarea = document.createElement("textarea");
    this.textarea.className = "editor-textarea";
    this.textarea.value = this.state.text;
    this.textarea.placeholder = i18n.t('script');
    this.textarea.addEventListener("input", () => {
      this.updateCharCount();
    });

    this.charCount = document.createElement("div");
    this.charCount.className = "editor-char-count";
    this.updateCharCount();

    textareaContainer.appendChild(this.textarea);
    textareaContainer.appendChild(this.charCount);
    this.overlay.appendChild(textareaContainer);

    container.appendChild(this.overlay);

    // Subscribe to locale changes
    this.i18nUnsubscribe = i18n.onChange(() => {
      this.updateLabels();
    });
  }

  private updateLabels() {
    this.titleSpan.textContent = i18n.t('editScript');
    this.saveBtn.textContent = i18n.t('saveAndClose');
    // Update close button text
    const closeText = this.closeBtn.querySelector("span");
    if (closeText) {
      closeText.textContent = i18n.t('close');
    }
    this.textarea.placeholder = i18n.t('script');
    this.updateCharCount();
  }

  private updateCharCount() {
    const text = this.textarea.value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.split("\n").length;
    this.charCount.textContent = `${chars} ${i18n.t('chars')} · ${words} ${i18n.t('words')} · ${lines} ${i18n.t('lines')}`;
  }

  open() {
    this.isOpen = true;
    this.textarea.value = this.state.text;
    this.updateCharCount();
    this.overlay.classList.add("open");

    // Focus textarea after animation
    setTimeout(() => {
      this.textarea.focus();
    }, 350);

    // Setup ESC key handler
    this.escKeyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    };
    document.addEventListener("keydown", this.escKeyHandler);
  }

  close() {
    // Auto-save on close (only if not already saved by saveAndClose)
    if (this.isOpen) {
      this.save();
    }
    this.isOpen = false;
    this.overlay.classList.remove("open");

    if (this.escKeyHandler) {
      document.removeEventListener("keydown", this.escKeyHandler);
      this.escKeyHandler = null;
    }
  }

  private save() {
    this.state.text = this.textarea.value;
    this.state.scriptEnded = false;

    // Save to localStorage
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, this.state.text);
    } catch (e) {
      console.warn("Could not save script to localStorage:", e);
    }

    this.onSave();
  }

  private saveAndClose() {
    this.save();
    this.isOpen = false; // Prevent close() from saving again
    this.close();
  }

  destroy() {
    if (this.escKeyHandler) {
      document.removeEventListener("keydown", this.escKeyHandler);
      this.escKeyHandler = null;
    }
    if (this.i18nUnsubscribe) {
      this.i18nUnsubscribe();
      this.i18nUnsubscribe = null;
    }
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}

// Help Modal Component (moved from TeleprompterControls)
class HelpModal {
  private overlay: HTMLDivElement;
  private isVisible: boolean = false;
  private escKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private questionKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private i18nUnsubscribe: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.overlay = document.createElement("div");
    this.overlay.className = "help-modal-overlay";
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-labelledby", "help-modal-title");

    this.overlay.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("help-modal-close") || target === this.overlay) {
        this.hide();
      }
    });

    this.renderContent();
    container.appendChild(this.overlay);

    // Setup global keyboard shortcuts
    this.setupGlobalKeyboardShortcuts();

    // Subscribe to locale changes
    this.i18nUnsubscribe = i18n.onChange(() => {
      this.renderContent();
    });
  }

  private setupGlobalKeyboardShortcuts() {
    this.questionKeyHandler = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        this.show();
      }
    };
    document.addEventListener("keydown", this.questionKeyHandler);
  }

  private renderContent() {
    this.overlay.replaceChildren();

    const modal = document.createElement("div");
    modal.className = "help-modal";

    // Header
    const header = document.createElement("div");
    header.className = "help-modal-header";

    const title = document.createElement("h2");
    title.id = "help-modal-title";
    title.textContent = i18n.t('helpTitle');

    const closeBtn = document.createElement("button");
    closeBtn.className = "help-modal-close";
    closeBtn.setAttribute("aria-label", i18n.t('close'));
    closeBtn.textContent = "×";

    header.appendChild(title);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Content
    const content = document.createElement("div");
    content.className = "help-modal-content";

    // Keyboard shortcuts section
    const shortcutsSection = this.createHelpSection(i18n.t('keyboardShortcuts'));
    const shortcutList = document.createElement("div");
    shortcutList.className = "shortcut-list";

    const shortcuts: Array<{ desc: string; keys: string[] }> = [
      { desc: i18n.t('shortcutPlayPause'), keys: ['Space'] },
      { desc: i18n.t('shortcutScrollSpeed'), keys: ['←', '→'] },
      { desc: i18n.t('shortcutNavigateLines'), keys: ['↑', '↓'] },
      { desc: i18n.t('shortcutFontSize'), keys: ['Ctrl', '←', '→'] },
      { desc: i18n.t('shortcutLineSpacing'), keys: ['Ctrl', '↑', '↓'] },
      { desc: i18n.t('shortcutShowHelp'), keys: ['?'] },
      { desc: i18n.t('shortcutCloseDialog'), keys: ['Esc'] },
    ];

    shortcuts.forEach(({ desc, keys }) => {
      const item = document.createElement("div");
      item.className = "shortcut-item";

      const descSpan = document.createElement("span");
      descSpan.className = "shortcut-desc";
      descSpan.textContent = desc;

      const keysDiv = document.createElement("div");
      keysDiv.className = "shortcut-keys";
      keys.forEach(key => {
        const keySpan = document.createElement("span");
        keySpan.className = "key";
        keySpan.textContent = key;
        keysDiv.appendChild(keySpan);
      });

      item.appendChild(descSpan);
      item.appendChild(keysDiv);
      shortcutList.appendChild(item);
    });

    shortcutsSection.appendChild(shortcutList);
    content.appendChild(shortcutsSection);

    // Features section
    const featuresSection = this.createHelpSection(i18n.t('features'));
    const featuresList = document.createElement("ul");
    featuresList.className = "feature-list";

    const features: Array<{ label: keyof Translations; desc: keyof Translations }> = [
      { label: 'labelAutoSave', desc: 'featureAutoSave' },
      { label: 'labelCountdown', desc: 'featureCountdown' },
      { label: 'labelSmoothRamping', desc: 'featureSmoothRamping' },
      { label: 'labelFlipMode', desc: 'featureFlipMode' },
      { label: 'labelFullscreen', desc: 'featureFullscreen' },
      { label: 'labelCustomization', desc: 'featureCustomization' },
      { label: 'labelWordLimit', desc: 'featureWordLimit' },
      { label: 'labelWorksOffline', desc: 'featureWorksOffline' },
    ];

    features.forEach(({ label, desc }) => {
      const li = document.createElement("li");
      const strong = document.createElement("strong");
      strong.textContent = `${i18n.t(label)}:`;
      li.appendChild(strong);
      li.appendChild(document.createTextNode(` ${i18n.t(desc)}`));
      featuresList.appendChild(li);
    });

    featuresSection.appendChild(featuresList);
    content.appendChild(featuresSection);

    // Tips section
    const tipsSection = this.createHelpSection(i18n.t('tipsForBestResults'));
    const tipsList = document.createElement("ul");
    tipsList.className = "feature-list";

    const tips: Array<keyof Translations> = [
      'tipFontSize',
      'tipLineSpacing',
      'tipScrollSpeed',
      'tipFlipMode',
      'tipPractice',
    ];

    tips.forEach(tipKey => {
      const li = document.createElement("li");
      li.textContent = i18n.t(tipKey);
      tipsList.appendChild(li);
    });

    tipsSection.appendChild(tipsList);
    content.appendChild(tipsSection);

    modal.appendChild(content);

    // Footer
    const footer = document.createElement("div");
    footer.className = "help-footer";
    footer.appendChild(document.createTextNode(`${i18n.t('footerText')} · `));

    const link = document.createElement("a");
    link.href = "https://github.com/lifeart/tpt";
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = i18n.t('viewOnGitHub');
    footer.appendChild(link);

    modal.appendChild(footer);
    this.overlay.appendChild(modal);
  }

  private createHelpSection(title: string): HTMLDivElement {
    const section = document.createElement("div");
    section.className = "help-section";
    const h3 = document.createElement("h3");
    h3.textContent = title;
    section.appendChild(h3);
    return section;
  }

  show() {
    this.isVisible = true;
    this.overlay.classList.add("visible");

    // Focus close button for accessibility
    const closeBtn = this.overlay.querySelector(".help-modal-close") as HTMLButtonElement;
    if (closeBtn) closeBtn.focus();

    // Setup ESC key handler
    this.escKeyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && this.isVisible) {
        this.hide();
      }
    };
    document.addEventListener("keydown", this.escKeyHandler);
  }

  hide() {
    this.isVisible = false;
    this.overlay.classList.remove("visible");

    if (this.escKeyHandler) {
      document.removeEventListener("keydown", this.escKeyHandler);
      this.escKeyHandler = null;
    }
  }

  destroy() {
    if (this.escKeyHandler) {
      document.removeEventListener("keydown", this.escKeyHandler);
      this.escKeyHandler = null;
    }
    if (this.questionKeyHandler) {
      document.removeEventListener("keydown", this.questionKeyHandler);
      this.questionKeyHandler = null;
    }
    if (this.i18nUnsubscribe) {
      this.i18nUnsubscribe();
      this.i18nUnsubscribe = null;
    }
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}

// Main Teleprompter App (New UI with Floating Toolbar + Drawer)
class TeleprompterApp {
  private appElement: HTMLDivElement;
  private mainContainer: HTMLDivElement | null = null;
  private state: TeleprompterState;
  private display: TeleprompterDisplay | null = null;
  private toolbar: FloatingToolbar | null = null;
  private drawer: SettingsDrawer | null = null;
  private editor: ScriptEditor | null = null;
  private helpModal: HelpModal | null = null;
  private toggleScrollingHandler: (() => void) | null = null;
  private speedChangedHandler: (() => void) | null = null;
  private drawerOpenedHandler: (() => void) | null = null;
  private drawerClosedHandler: (() => void) | null = null;

  constructor(appElement: HTMLDivElement) {
    this.appElement = appElement;
    this.state = new TeleprompterState();

    // Setup the app container
    this.setupAppContainer();

    // Initialize components
    this.initializeComponents();

    // Setup event listeners for component communication
    this.setupComponentCommunication();
  }

  private setupAppContainer() {
    // Clear the app container
    this.appElement.replaceChildren();

    // Create main container with data attribute for reliable querying
    this.mainContainer = document.createElement("div");
    this.mainContainer.className = "flex flex-col h-screen";
    this.mainContainer.dataset.teleprompterMain = "true";

    this.appElement.appendChild(this.mainContainer);
  }

  private initializeComponents() {
    if (!this.mainContainer) return;

    // Initialize display component (teleprompter text display)
    this.display = new TeleprompterDisplay(this.mainContainer, this.state);

    // Initialize floating toolbar
    this.toolbar = new FloatingToolbar(document.body, this.state, {
      onEditClick: () => this.editor?.open(),
      onSettingsClick: () => this.drawer?.toggle(),
      onHelpClick: () => this.helpModal?.show(),
    });

    // Initialize settings drawer
    this.drawer = new SettingsDrawer(document.body, this.state, () => {
      if (this.display) {
        this.display.updateStyles();
      }
    });

    // Initialize script editor
    this.editor = new ScriptEditor(document.body, this.state, () => {
      if (this.display) {
        this.display.updateTelepromptText();
        this.display.updateStyles();
      }
    });

    // Initialize help modal
    this.helpModal = new HelpModal(document.body);
  }

  private setupComponentCommunication() {
    // Handle toggle scrolling event
    this.toggleScrollingHandler = () => {
      if (this.display) {
        this.display.toggleScrolling();
      }
    };
    document.addEventListener("toggle-scrolling", this.toggleScrollingHandler);

    // Handle speed changed event (sync between toolbar and drawer)
    this.speedChangedHandler = () => {
      if (this.toolbar) {
        this.toolbar.updateSpeed(this.state.scrollSpeed);
      }
      if (this.drawer) {
        this.drawer.updateScrollSpeed(this.state.scrollSpeed);
      }
    };
    document.addEventListener("speed-changed", this.speedChangedHandler);

    // Handle drawer open/close for teleprompter container resizing
    this.drawerOpenedHandler = () => {
      const container = this.mainContainer?.querySelector(".teleprompter-container");
      if (container) {
        container.classList.add("drawer-open");
      }
    };
    document.addEventListener("drawer-opened", this.drawerOpenedHandler);

    this.drawerClosedHandler = () => {
      const container = this.mainContainer?.querySelector(".teleprompter-container");
      if (container) {
        container.classList.remove("drawer-open");
      }
    };
    document.addEventListener("drawer-closed", this.drawerClosedHandler);
  }

  // Cleanup method to destroy all components
  destroy() {
    if (this.toggleScrollingHandler) {
      document.removeEventListener("toggle-scrolling", this.toggleScrollingHandler);
      this.toggleScrollingHandler = null;
    }
    if (this.speedChangedHandler) {
      document.removeEventListener("speed-changed", this.speedChangedHandler);
      this.speedChangedHandler = null;
    }
    if (this.drawerOpenedHandler) {
      document.removeEventListener("drawer-opened", this.drawerOpenedHandler);
      this.drawerOpenedHandler = null;
    }
    if (this.drawerClosedHandler) {
      document.removeEventListener("drawer-closed", this.drawerClosedHandler);
      this.drawerClosedHandler = null;
    }
    if (this.display) {
      this.display.destroy();
      this.display = null;
    }
    if (this.toolbar) {
      this.toolbar.destroy();
      this.toolbar = null;
    }
    if (this.drawer) {
      this.drawer.destroy();
      this.drawer = null;
    }
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
    if (this.helpModal) {
      this.helpModal.destroy();
      this.helpModal = null;
    }
    if (this.mainContainer && this.mainContainer.parentNode) {
      this.mainContainer.parentNode.removeChild(this.mainContainer);
      this.mainContainer = null;
    }
  }
}

// Initialize the app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const appElement = document.querySelector<HTMLDivElement>("#app");
  if (appElement) {
    new TeleprompterApp(appElement);
  }
});
