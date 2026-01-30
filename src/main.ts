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
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
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
          // Update font size label and input if present
          const fontSizeLabel = document.querySelector(
            'label[for="font-size"]'
          ) as HTMLLabelElement;
          if (fontSizeLabel)
            fontSizeLabel.textContent = formatLabel('fontSize', this.state.fontSize, 'px');
          const fontSizeInput = document.getElementById(
            "font-size"
          ) as HTMLInputElement;
          if (fontSizeInput)
            fontSizeInput.value = this.state.fontSize.toString();
        } else {
          // Left/Right: Scroll speed in lines per second
          if (e.key === "ArrowLeft") {
            this.state.scrollSpeed = Math.max(CONFIG.SCROLL_SPEED.MIN, this.state.scrollSpeed - CONFIG.SCROLL_SPEED.STEP);
          } else {
            this.state.scrollSpeed = Math.min(CONFIG.SCROLL_SPEED.MAX, this.state.scrollSpeed + CONFIG.SCROLL_SPEED.STEP);
          }
          // Round to 1 decimal place for cleaner display
          this.state.scrollSpeed = Math.round(this.state.scrollSpeed * 10) / 10;

          // Update label if present
          const scrollSpeedLabel = document.querySelector(
            'label[for="scroll-speed"]'
          ) as HTMLLabelElement;
          if (scrollSpeedLabel)
            scrollSpeedLabel.textContent = formatLabel('scrollSpeed', `${this.state.scrollSpeed} `, 'linesPerSec');
          const scrollSpeedInput = document.getElementById(
            "scroll-speed"
          ) as HTMLInputElement;
          if (scrollSpeedInput)
            scrollSpeedInput.value = this.state.scrollSpeed.toString();
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
          // Update label if present
          const lineSpacingLabel = document.querySelector(
            'label[for="line-spacing"]'
          ) as HTMLLabelElement;
          if (lineSpacingLabel)
            lineSpacingLabel.textContent = formatLabel('lineSpacing', this.state.lineSpacing);
          const lineSpacingInput = document.getElementById(
            "line-spacing"
          ) as HTMLInputElement;
          if (lineSpacingInput)
            lineSpacingInput.value = this.state.lineSpacing.toString();
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
    const flipPart = this.state.isFlipped ? " scaleX(-1)" : "";
    this.telepromptTextInner.style.transform = translatePart + flipPart;
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

// Teleprompter Controls Component
class TeleprompterControls {
  private element: HTMLDivElement;
  private state: TeleprompterState;
  private onStateChange: () => void;
  // Store event listeners for cleanup
  private scrollingToggledHandler: ((e: CustomEvent<ScrollingToggledDetail>) => void) | null = null;
  private fullscreenChangeHandler: (() => void) | null = null;
  private helpKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private i18nUnsubscribe: (() => void) | null = null;
  private fontOptions = [
    "System",
    "Arial",
    "Times New Roman",
    "Courier New",
    "Georgia",
    "Verdana",
    "Roboto",
    "Open Sans",
  ];
  private appNodes: {
    scriptInput: HTMLTextAreaElement;
    fontFamilySelect: HTMLSelectElement;
    fontSizeInput: HTMLInputElement;
    fontColorInput: HTMLInputElement;
    bgColorInput: HTMLInputElement;
    lineSpacingInput: HTMLInputElement;
    letterSpacingInput: HTMLInputElement;
    scrollSpeedInput: HTMLInputElement;
    maxWordsPerLineInput: HTMLInputElement;
    languageSelect: HTMLSelectElement;
    flipBtn: HTMLButtonElement;
    playPauseBtn: HTMLButtonElement;
    backToTopBtn: HTMLButtonElement;
    fullscreenBtn: HTMLButtonElement;
    helpBtn: HTMLButtonElement;
    helpModal: HTMLDivElement;
    // Add direct references to labels
    scriptLabel: HTMLLabelElement;
    fontLabel: HTMLLabelElement;
    fontSizeLabel: HTMLLabelElement;
    fontColorLabel: HTMLLabelElement;
    bgColorLabel: HTMLLabelElement;
    lineSpacingLabel: HTMLLabelElement;
    letterSpacingLabel: HTMLLabelElement;
    scrollSpeedLabel: HTMLLabelElement;
    maxWordsPerLineLabel: HTMLLabelElement;
    flipLabel: HTMLLabelElement;
    languageLabel: HTMLLabelElement;
  };

  constructor(
    container: HTMLElement,
    state: TeleprompterState,
    onStateChange: () => void
  ) {
    this.state = state;
    this.onStateChange = onStateChange;

    this.element = document.createElement("div");
    this.element.className = "controls-panel bg-gray-800 p-4 relative"; // Keep relative positioning

    // Initialize appNodes
    this.appNodes = {
      scriptInput: document.createElement("textarea"),
      fontFamilySelect: document.createElement("select"),
      fontSizeInput: document.createElement("input"),
      fontColorInput: document.createElement("input"),
      bgColorInput: document.createElement("input"),
      lineSpacingInput: document.createElement("input"),
      letterSpacingInput: document.createElement("input"),
      scrollSpeedInput: document.createElement("input"),
      maxWordsPerLineInput: document.createElement("input"),
      languageSelect: document.createElement("select"),
      flipBtn: document.createElement("button"),
      playPauseBtn: document.createElement("button"),
      backToTopBtn: document.createElement("button"),
      fullscreenBtn: document.createElement("button"),
      helpBtn: document.createElement("button"),
      helpModal: document.createElement("div"),
      // Add direct references to labels
      scriptLabel: document.createElement("label"),
      fontLabel: document.createElement("label"),
      fontSizeLabel: document.createElement("label"),
      fontColorLabel: document.createElement("label"),
      bgColorLabel: document.createElement("label"),
      lineSpacingLabel: document.createElement("label"),
      letterSpacingLabel: document.createElement("label"),
      scrollSpeedLabel: document.createElement("label"),
      maxWordsPerLineLabel: document.createElement("label"),
      flipLabel: document.createElement("label"),
      languageLabel: document.createElement("label"),
    };

    this.render();
    container.appendChild(this.element);
    this.setupEventListeners();
    this.setupFullscreenListener(); // Add listener for fullscreen changes
    this.handleFullscreenPanelVisibility(); // Initial check

    // Subscribe to locale changes
    this.i18nUnsubscribe = i18n.onChange(() => {
      this.updateAllLabels();
    });
  }

  private updateAllLabels() {
    // Update all labels with current locale
    this.appNodes.scriptLabel.textContent = i18n.t('script');
    this.appNodes.fontLabel.textContent = i18n.t('font');
    this.appNodes.fontSizeLabel.textContent = formatLabel('fontSize', this.state.fontSize, 'px');
    this.appNodes.fontColorLabel.textContent = i18n.t('fontColor');
    this.appNodes.bgColorLabel.textContent = i18n.t('backgroundColor');
    this.appNodes.lineSpacingLabel.textContent = formatLabel('lineSpacing', this.state.lineSpacing);
    this.appNodes.letterSpacingLabel.textContent = formatLabel('letterSpacing', this.state.letterSpacing, 'px');
    this.appNodes.scrollSpeedLabel.textContent = formatLabel('scrollSpeed', `${this.state.scrollSpeed} `, 'linesPerSec');
    this.appNodes.maxWordsPerLineLabel.textContent = formatLabel('maxWordsPerLine', this.state.maxWordsPerLine);
    this.appNodes.flipLabel.textContent = i18n.t('flipScreen');
    this.appNodes.languageLabel.textContent = i18n.t('language');

    // Update buttons
    this.appNodes.flipBtn.textContent = this.state.isFlipped ? i18n.t('unflip') : i18n.t('flip');
    // Note: play/pause button state is managed by scrolling-toggled event, just update with current text
    this.appNodes.playPauseBtn.textContent = i18n.t('play');
    this.appNodes.backToTopBtn.textContent = i18n.t('backToTop');

    // Update aria-labels
    this.appNodes.fullscreenBtn.setAttribute("aria-label", i18n.t('toggleFullscreen'));
    this.appNodes.helpBtn.setAttribute("aria-label", i18n.t('helpKeyboardShortcuts'));

    // Update help modal content (uses DOM methods, not innerHTML)
    this.updateHelpModalContent();
  }

  private render() {
    const controlsGrid = document.createElement("div");
    controlsGrid.className = "grid grid-cols-2 md:grid-cols-4 gap-4";

    // Text Input
    const textInputContainer = document.createElement("div");
    textInputContainer.className = "col-span-2 md:col-span-4";

    this.appNodes.scriptLabel.htmlFor = "script-input";
    this.appNodes.scriptLabel.className = "block text-sm font-medium text-gray-300";
    this.appNodes.scriptLabel.textContent = i18n.t('script');

    this.appNodes.scriptInput.id = "script-input";
    this.appNodes.scriptInput.className =
      "w-full h-24 p-2 rounded bg-gray-700 text-white";
    this.appNodes.scriptInput.value = this.state.text;

    textInputContainer.appendChild(this.appNodes.scriptLabel);
    textInputContainer.appendChild(this.appNodes.scriptInput);
    controlsGrid.appendChild(textInputContainer);

    // Font Family
    const fontFamilyContainer = document.createElement("div");

    this.appNodes.fontLabel.htmlFor = "font-family";
    this.appNodes.fontLabel.className = "block text-sm font-medium text-gray-300";
    this.appNodes.fontLabel.textContent = i18n.t('font');

    this.appNodes.fontFamilySelect.id = "font-family";
    this.appNodes.fontFamilySelect.className =
      "w-full p-2 rounded bg-gray-700 text-white";

    this.fontOptions.forEach((font) => {
      const option = document.createElement("option");
      option.value = font;
      option.textContent = font;
      if (this.state.fontFamily === font) {
        option.selected = true;
      }
      this.appNodes.fontFamilySelect.appendChild(option);
    });

    fontFamilyContainer.appendChild(this.appNodes.fontLabel);
    fontFamilyContainer.appendChild(this.appNodes.fontFamilySelect);
    controlsGrid.appendChild(fontFamilyContainer);

    // Font Size
    const fontSizeContainer = document.createElement("div");

    this.appNodes.fontSizeLabel.htmlFor = "font-size";
    this.appNodes.fontSizeLabel.className =
      "block text-sm font-medium text-gray-300";
    this.appNodes.fontSizeLabel.textContent = formatLabel('fontSize', this.state.fontSize, 'px');

    this.appNodes.fontSizeInput.id = "font-size";
    this.appNodes.fontSizeInput.type = "range";
    this.appNodes.fontSizeInput.min = CONFIG.FONT_SIZE.MIN.toString();
    this.appNodes.fontSizeInput.max = CONFIG.FONT_SIZE.MAX.toString();
    this.appNodes.fontSizeInput.value = this.state.fontSize.toString();
    this.appNodes.fontSizeInput.className = "w-full";

    fontSizeContainer.appendChild(this.appNodes.fontSizeLabel);
    fontSizeContainer.appendChild(this.appNodes.fontSizeInput);
    controlsGrid.appendChild(fontSizeContainer);

    // Font Color
    const fontColorContainer = document.createElement("div");

    this.appNodes.fontColorLabel.htmlFor = "font-color";
    this.appNodes.fontColorLabel.className = "block text-sm font-medium text-gray-300";
    this.appNodes.fontColorLabel.textContent = i18n.t('fontColor');

    this.appNodes.fontColorInput.id = "font-color";
    this.appNodes.fontColorInput.type = "color";
    this.appNodes.fontColorInput.value = this.state.fontColor;
    this.appNodes.fontColorInput.className =
      "w-full h-10 p-1 rounded bg-gray-700";

    fontColorContainer.appendChild(this.appNodes.fontColorLabel);
    fontColorContainer.appendChild(this.appNodes.fontColorInput);
    controlsGrid.appendChild(fontColorContainer);

    // Background Color
    const bgColorContainer = document.createElement("div");

    this.appNodes.bgColorLabel.htmlFor = "bg-color";
    this.appNodes.bgColorLabel.className = "block text-sm font-medium text-gray-300";
    this.appNodes.bgColorLabel.textContent = i18n.t('backgroundColor');

    this.appNodes.bgColorInput.id = "bg-color";
    this.appNodes.bgColorInput.type = "color";
    this.appNodes.bgColorInput.value = this.state.backgroundColor;
    this.appNodes.bgColorInput.className =
      "w-full h-10 p-1 rounded bg-gray-700";

    bgColorContainer.appendChild(this.appNodes.bgColorLabel);
    bgColorContainer.appendChild(this.appNodes.bgColorInput);
    controlsGrid.appendChild(bgColorContainer);

    // Line Spacing
    const lineSpacingContainer = document.createElement("div");

    this.appNodes.lineSpacingLabel.htmlFor = "line-spacing";
    this.appNodes.lineSpacingLabel.className =
      "block text-sm font-medium text-gray-300";
    this.appNodes.lineSpacingLabel.textContent = formatLabel('lineSpacing', this.state.lineSpacing);

    this.appNodes.lineSpacingInput.id = "line-spacing";
    this.appNodes.lineSpacingInput.type = "range";
    this.appNodes.lineSpacingInput.min = CONFIG.LINE_SPACING.MIN.toString();
    this.appNodes.lineSpacingInput.max = CONFIG.LINE_SPACING.MAX.toString();
    this.appNodes.lineSpacingInput.step = CONFIG.LINE_SPACING.STEP.toString();
    this.appNodes.lineSpacingInput.value = this.state.lineSpacing.toString();
    this.appNodes.lineSpacingInput.className = "w-full";

    lineSpacingContainer.appendChild(this.appNodes.lineSpacingLabel);
    lineSpacingContainer.appendChild(this.appNodes.lineSpacingInput);
    controlsGrid.appendChild(lineSpacingContainer);

    // Letter Spacing
    const letterSpacingContainer = document.createElement("div");

    this.appNodes.letterSpacingLabel.htmlFor = "letter-spacing";
    this.appNodes.letterSpacingLabel.className =
      "block text-sm font-medium text-gray-300";
    this.appNodes.letterSpacingLabel.textContent = formatLabel('letterSpacing', this.state.letterSpacing, 'px');

    this.appNodes.letterSpacingInput.id = "letter-spacing";
    this.appNodes.letterSpacingInput.type = "range";
    this.appNodes.letterSpacingInput.min = CONFIG.LETTER_SPACING.MIN.toString();
    this.appNodes.letterSpacingInput.max = CONFIG.LETTER_SPACING.MAX.toString();
    this.appNodes.letterSpacingInput.value =
      this.state.letterSpacing.toString();
    this.appNodes.letterSpacingInput.className = "w-full";

    letterSpacingContainer.appendChild(this.appNodes.letterSpacingLabel);
    letterSpacingContainer.appendChild(this.appNodes.letterSpacingInput);
    controlsGrid.appendChild(letterSpacingContainer);

    // Scroll Speed
    const scrollSpeedContainer = document.createElement("div");

    this.appNodes.scrollSpeedLabel.htmlFor = "scroll-speed";
    this.appNodes.scrollSpeedLabel.className =
      "block text-sm font-medium text-gray-300";
    this.appNodes.scrollSpeedLabel.textContent = formatLabel('scrollSpeed', `${this.state.scrollSpeed} `, 'linesPerSec');

    this.appNodes.scrollSpeedInput.id = "scroll-speed";
    this.appNodes.scrollSpeedInput.type = "range";
    this.appNodes.scrollSpeedInput.min = CONFIG.SCROLL_SPEED.MIN.toString();
    this.appNodes.scrollSpeedInput.max = CONFIG.SCROLL_SPEED.MAX.toString();
    this.appNodes.scrollSpeedInput.step = CONFIG.SCROLL_SPEED.STEP.toString();
    this.appNodes.scrollSpeedInput.value = this.state.scrollSpeed.toString();
    this.appNodes.scrollSpeedInput.className = "w-full";

    scrollSpeedContainer.appendChild(this.appNodes.scrollSpeedLabel);
    scrollSpeedContainer.appendChild(this.appNodes.scrollSpeedInput);
    controlsGrid.appendChild(scrollSpeedContainer);

    // Max Words Per Line
    const maxWordsPerLineContainer = document.createElement("div");

    this.appNodes.maxWordsPerLineLabel.htmlFor = "max-words-per-line";
    this.appNodes.maxWordsPerLineLabel.className =
      "block text-sm font-medium text-gray-300";
    this.appNodes.maxWordsPerLineLabel.textContent = formatLabel('maxWordsPerLine', this.state.maxWordsPerLine);

    this.appNodes.maxWordsPerLineInput.id = "max-words-per-line";
    this.appNodes.maxWordsPerLineInput.type = "number";
    this.appNodes.maxWordsPerLineInput.min = CONFIG.MAX_WORDS_PER_LINE.MIN.toString();
    this.appNodes.maxWordsPerLineInput.value = this.state.maxWordsPerLine.toString();
    this.appNodes.maxWordsPerLineInput.className = "w-full p-2 rounded bg-gray-700 text-white";

    maxWordsPerLineContainer.appendChild(this.appNodes.maxWordsPerLineLabel);
    maxWordsPerLineContainer.appendChild(this.appNodes.maxWordsPerLineInput);
    controlsGrid.appendChild(maxWordsPerLineContainer);

    // Flip Screen
    const flipContainer = document.createElement("div");

    this.appNodes.flipLabel.className = "block text-sm font-medium text-gray-300";
    this.appNodes.flipLabel.textContent = i18n.t('flipScreen');

    this.appNodes.flipBtn.id = "flip-btn";
    this.appNodes.flipBtn.className =
      "w-full p-2 rounded bg-blue-600 hover:bg-blue-700 text-white";
    this.appNodes.flipBtn.textContent = this.state.isFlipped
      ? i18n.t('unflip')
      : i18n.t('flip');

    flipContainer.appendChild(this.appNodes.flipLabel);
    flipContainer.appendChild(this.appNodes.flipBtn);
    controlsGrid.appendChild(flipContainer);

    // Language Selector
    const languageContainer = document.createElement("div");

    this.appNodes.languageLabel.htmlFor = "language-select";
    this.appNodes.languageLabel.className = "block text-sm font-medium text-gray-300";
    this.appNodes.languageLabel.textContent = i18n.t('language');

    this.appNodes.languageSelect.id = "language-select";
    this.appNodes.languageSelect.className =
      "w-full p-2 rounded bg-gray-700 text-white";

    i18n.getAvailableLocales().forEach((locale) => {
      const option = document.createElement("option");
      option.value = locale.code;
      option.textContent = locale.name;
      if (i18n.locale === locale.code) {
        option.selected = true;
      }
      this.appNodes.languageSelect.appendChild(option);
    });

    languageContainer.appendChild(this.appNodes.languageLabel);
    languageContainer.appendChild(this.appNodes.languageSelect);
    controlsGrid.appendChild(languageContainer);

    // Play/Pause Button Container (Should be outside the grid)
    const playPauseContainer = document.createElement("div");
    playPauseContainer.className = "mt-4 text-center col-span-2 md:col-span-4"; // Spanning full width below grid

    this.appNodes.playPauseBtn.id = "play-pause-btn";
    this.appNodes.playPauseBtn.className =
      "px-6 py-2 rounded bg-green-600 hover:bg-green-700 text-white";
    this.appNodes.playPauseBtn.textContent = this.state.isScrolling
      ? i18n.t('pause')
      : i18n.t('play');

    // Create Back to Top button
    this.appNodes.backToTopBtn.id = "back-to-top-btn";
    this.appNodes.backToTopBtn.className =
      "px-6 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white ml-4";
    this.appNodes.backToTopBtn.textContent = i18n.t('backToTop');

    playPauseContainer.appendChild(this.appNodes.playPauseBtn); // Add play/pause button to its container
    playPauseContainer.appendChild(this.appNodes.backToTopBtn); // Add back to top button to the container

    // Fullscreen Button (Positioned absolutely within the main element)
    this.appNodes.fullscreenBtn.id = "fullscreen-btn";
    this.appNodes.fullscreenBtn.className =
      "absolute bottom-4 right-4 p-2 rounded bg-gray-600 hover:bg-gray-700 text-white w-8 h-8 flex items-center justify-center";
    this.appNodes.fullscreenBtn.setAttribute("aria-label", i18n.t('toggleFullscreen'));
    this.updateFullscreenButtonIcon();

    // Help Button (Positioned absolutely on the left)
    this.appNodes.helpBtn.className = "help-btn";
    this.appNodes.helpBtn.setAttribute("aria-label", i18n.t('helpKeyboardShortcuts'));
    this.appNodes.helpBtn.textContent = "?";

    // Create help modal
    this.createHelpModal();

    // Assemble the controls panel
    this.element.appendChild(controlsGrid);
    this.element.appendChild(playPauseContainer);
    this.element.appendChild(this.appNodes.fullscreenBtn);
    this.element.appendChild(this.appNodes.helpBtn);
    this.element.appendChild(this.appNodes.helpModal);
  }

  private createHelpModal() {
    this.appNodes.helpModal.className = "help-modal-overlay";
    this.appNodes.helpModal.setAttribute("role", "dialog");
    this.appNodes.helpModal.setAttribute("aria-labelledby", "help-modal-title");

    // Use event delegation for close button (handles dynamically updated content)
    this.appNodes.helpModal.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("help-modal-close") || target === this.appNodes.helpModal) {
        this.hideHelpModal();
      }
    });

    this.updateHelpModalContent();
  }

  private updateHelpModalContent() {
    // Clear existing content
    this.appNodes.helpModal.replaceChildren();

    // Build modal using DOM methods (XSS-safe)
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
    this.appNodes.helpModal.appendChild(modal);
  }

  private createHelpSection(title: string): HTMLDivElement {
    const section = document.createElement("div");
    section.className = "help-section";
    const h3 = document.createElement("h3");
    h3.textContent = title;
    section.appendChild(h3);
    return section;
  }

  private showHelpModal() {
    this.appNodes.helpModal.classList.add("visible");
    // Focus the close button for accessibility
    const closeBtn = this.appNodes.helpModal.querySelector(".help-modal-close") as HTMLButtonElement;
    if (closeBtn) closeBtn.focus();
  }

  private hideHelpModal() {
    this.appNodes.helpModal.classList.remove("visible");
  }

  setupEventListeners() {
    // Script input with auto-save
    this.appNodes.scriptInput.addEventListener("input", () => {
      this.state.text = this.appNodes.scriptInput.value;
      this.state.scriptEnded = false; // Reset flag on text change
      // Save to localStorage
      try {
        localStorage.setItem(CONFIG.STORAGE_KEY, this.state.text);
      } catch (e) {
        // localStorage might be full or disabled
        console.warn("Could not save script to localStorage:", e);
      }
      this.onStateChange();
    });

    // Font family
    this.appNodes.fontFamilySelect.addEventListener("change", () => {
      this.state.fontFamily = this.appNodes.fontFamilySelect.value;
      this.onStateChange();
    });

    // Font size
    this.appNodes.fontSizeInput.addEventListener("input", () => {
      this.state.fontSize = this.appNodes.fontSizeInput.valueAsNumber;
      this.onStateChange();
      this.appNodes.fontSizeLabel.textContent = formatLabel('fontSize', this.state.fontSize, 'px');
    });

    // Font color
    this.appNodes.fontColorInput.addEventListener("input", () => {
      this.state.fontColor = this.appNodes.fontColorInput.value;
      this.onStateChange();
    });

    // Background color
    this.appNodes.bgColorInput.addEventListener("input", () => {
      this.state.backgroundColor = this.appNodes.bgColorInput.value;
      this.onStateChange();
    });

    // Line spacing
    this.appNodes.lineSpacingInput.addEventListener("input", () => {
      this.state.lineSpacing = parseFloat(this.appNodes.lineSpacingInput.value);
      this.onStateChange();
      this.appNodes.lineSpacingLabel.textContent = formatLabel('lineSpacing', this.state.lineSpacing);
    });

    // Letter spacing
    this.appNodes.letterSpacingInput.addEventListener("input", () => {
      this.state.letterSpacing = this.appNodes.letterSpacingInput.valueAsNumber;
      this.onStateChange();
      this.appNodes.letterSpacingLabel.textContent = formatLabel('letterSpacing', this.state.letterSpacing, 'px');
    });

    // Scroll speed
    this.appNodes.scrollSpeedInput.addEventListener("input", () => {
      this.state.scrollSpeed = parseFloat(this.appNodes.scrollSpeedInput.value);
      // Round to 1 decimal place for cleaner display
      this.state.scrollSpeed = Math.round(this.state.scrollSpeed * 10) / 10;
      this.onStateChange();
      this.appNodes.scrollSpeedLabel.textContent = formatLabel('scrollSpeed', `${this.state.scrollSpeed} `, 'linesPerSec');
    });

    // Max Words Per Line with NaN validation
    this.appNodes.maxWordsPerLineInput.addEventListener("input", () => {
      const value = this.appNodes.maxWordsPerLineInput.valueAsNumber;
      // Validate: use 0 if NaN or negative
      this.state.maxWordsPerLine = Number.isNaN(value) || value < 0 ? 0 : Math.floor(value);
      this.onStateChange();
      this.appNodes.maxWordsPerLineLabel.textContent = formatLabel('maxWordsPerLine', this.state.maxWordsPerLine);
    });

    // Flip screen button
    this.appNodes.flipBtn.addEventListener("click", () => {
      this.state.isFlipped = !this.state.isFlipped;
      this.onStateChange();
      this.appNodes.flipBtn.textContent = this.state.isFlipped
        ? i18n.t('unflip')
        : i18n.t('flip');
    });

    // Language selector
    this.appNodes.languageSelect.addEventListener("change", () => {
      const newLocale = this.appNodes.languageSelect.value as Locale;
      i18n.setLocale(newLocale);
    });

    // Play/Pause button
    this.appNodes.playPauseBtn.addEventListener("click", () => {
      const event = new CustomEvent("toggle-scrolling");
      document.dispatchEvent(event);
    });

    // Back to Top button
    this.appNodes.backToTopBtn.addEventListener("click", () => {
      const event = new CustomEvent("back-to-top");
      document.dispatchEvent(event);
    });

    // Fullscreen button
    this.appNodes.fullscreenBtn.addEventListener("click", () => {
      this.toggleFullscreen();
    });

    // Help button
    this.appNodes.helpBtn.addEventListener("click", () => {
      this.showHelpModal();
    });

    // Listen for scrolling state changes with proper typing
    this.scrollingToggledHandler = (e: CustomEvent<ScrollingToggledDetail>) => {
      if (e.detail.isCountingDown) {
        this.appNodes.playPauseBtn.textContent = i18n.t('cancel');
      } else if (e.detail.isScrolling) {
        this.appNodes.playPauseBtn.textContent = i18n.t('pause');
      } else {
        this.appNodes.playPauseBtn.textContent = i18n.t('play');
      }
    };
    document.addEventListener("scrolling-toggled", this.scrollingToggledHandler as EventListener);

    // Keyboard shortcut to open help (?) and close (Escape)
    this.helpKeyHandler = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        this.showHelpModal();
      }
      if (e.key === "Escape" && this.appNodes.helpModal.classList.contains("visible")) {
        this.hideHelpModal();
      }
    };
    document.addEventListener("keydown", this.helpKeyHandler);
  }

  private toggleFullscreen() {
    const appRoot = document.documentElement; // Target the whole page for fullscreen

    if (!document.fullscreenElement) {
      appRoot.requestFullscreen().catch((err) => {
        alert(
          `${i18n.t('fullscreenError')}: ${err.message} (${err.name})`
        );
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    // No need to manually update icon here, fullscreenchange listener handles it
  }

  private updateFullscreenButtonIcon() {
    if (this.appNodes.fullscreenBtn) {
      // Set innerHTML to the appropriate SVG string
      this.appNodes.fullscreenBtn.innerHTML = document.fullscreenElement
        ? fullscreenExitIcon
        : fullscreenEnterIcon;
    }
  }

  // Listen for fullscreen changes (e.g., user pressing ESC)
  private setupFullscreenListener() {
    this.fullscreenChangeHandler = () => {
      this.updateFullscreenButtonIcon();
      this.handleFullscreenPanelVisibility();
    };
    document.addEventListener("fullscreenchange", this.fullscreenChangeHandler);
  }

  private handleFullscreenPanelVisibility() {
    // Hide the controls panel except the fullscreen button in fullscreen mode
    const isFullscreen = !!document.fullscreenElement;
    // Hide all children except the fullscreen button
    Array.from(this.element.children).forEach((child) => {
      if (child === this.appNodes.fullscreenBtn) {
        (child as HTMLElement).style.display = "flex";
      } else {
        (child as HTMLElement).style.display = isFullscreen ? "none" : "";
      }
    });
    // Always show the fullscreen button
    if (this.appNodes.fullscreenBtn) {
      this.appNodes.fullscreenBtn.style.display = "flex";
    }
  }

  // Cleanup method to remove event listeners
  destroy() {
    if (this.scrollingToggledHandler) {
      document.removeEventListener("scrolling-toggled", this.scrollingToggledHandler as EventListener);
      this.scrollingToggledHandler = null;
    }
    if (this.fullscreenChangeHandler) {
      document.removeEventListener("fullscreenchange", this.fullscreenChangeHandler);
      this.fullscreenChangeHandler = null;
    }
    if (this.helpKeyHandler) {
      document.removeEventListener("keydown", this.helpKeyHandler);
      this.helpKeyHandler = null;
    }
    if (this.i18nUnsubscribe) {
      this.i18nUnsubscribe();
      this.i18nUnsubscribe = null;
    }

    // Remove DOM element
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

// Main Teleprompter App
class TeleprompterApp {
  private appElement: HTMLDivElement;
  private mainContainer: HTMLDivElement | null = null;
  private state: TeleprompterState;
  private display: TeleprompterDisplay | null = null;
  private controls: TeleprompterControls | null = null;
  private toggleScrollingHandler: (() => void) | null = null;

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

    // Initialize display component
    this.display = new TeleprompterDisplay(this.mainContainer, this.state);

    // Initialize controls component
    this.controls = new TeleprompterControls(this.mainContainer, this.state, () => {
      if (this.display) {
        this.display.updateStyles();
      }
    });
  }

  private setupComponentCommunication() {
    // Handle toggle scrolling event
    this.toggleScrollingHandler = () => {
      if (this.display) {
        this.display.toggleScrolling();
      }
    };
    document.addEventListener("toggle-scrolling", this.toggleScrollingHandler);
  }

  // Cleanup method to destroy all components
  destroy() {
    if (this.toggleScrollingHandler) {
      document.removeEventListener("toggle-scrolling", this.toggleScrollingHandler);
      this.toggleScrollingHandler = null;
    }
    if (this.display) {
      this.display.destroy();
      this.display = null;
    }
    if (this.controls) {
      this.controls.destroy();
      this.controls = null;
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
