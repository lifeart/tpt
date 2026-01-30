import { CONFIG } from "../config";
import { getFontFamily } from "../fonts";
import type { TeleprompterState } from "../state";
import { splitTextIntoLines } from "../utils";

// Teleprompter Display Component
export class TeleprompterDisplay {
  private element: HTMLDivElement;
  private telepromptText: HTMLDivElement;
  private telepromptTextInner: HTMLDivElement;
  private readingGuide: HTMLDivElement;
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
  private wheelHandler: ((e: WheelEvent) => void) | null = null;
  // Smooth scroll animation state
  private smoothScrollAnimationId: number | null = null;
  private targetTranslateY: number = 0;

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

    // Create reading guide overlay
    this.readingGuide = document.createElement("div");
    this.readingGuide.className = "reading-guide";
    if (this.state.readingGuideEnabled) {
      this.readingGuide.classList.add("enabled");
    }
    this.element.appendChild(this.readingGuide);

    // Create countdown overlay (styles in CSS)
    this.countdownOverlay = document.createElement("div");
    this.countdownOverlay.className = "countdown-overlay";
    this.countdownOverlay.setAttribute("aria-live", "assertive"); // Accessibility
    this.countdownOverlay.setAttribute("role", "timer");
    this.element.appendChild(this.countdownOverlay);

    container.appendChild(this.element);

    this.updateTelepromptText();
    this.setupKeyboardNavigation();
    this.setupWheelNavigation();
    this.setupCustomEventListeners(); // Add setup for custom events
  }

  private setupWheelNavigation() {
    this.wheelHandler = (e: WheelEvent) => {
      // Only handle wheel when not scrolling (paused)
      if (this.state.isScrolling) return;

      // Prevent default to avoid page scroll
      e.preventDefault();

      if (!this.telepromptTextInner) return;

      // Calculate scroll amount from wheel delta
      const scrollAmount = e.deltaY;

      // Update target translateY position
      const containerRect = this.telepromptText.getBoundingClientRect();
      const totalHeight = this.telepromptTextInner.scrollHeight;
      const maxTranslateY = 0;
      const minTranslateY = -(totalHeight - containerRect.height);

      // Update target for smooth scrolling
      this.targetTranslateY = Math.max(
        minTranslateY,
        Math.min(maxTranslateY, this.targetTranslateY - scrollAmount)
      );

      // Start smooth scroll animation
      this.startSmoothScroll();
    };

    this.telepromptText.addEventListener("wheel", this.wheelHandler, { passive: false });
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
          this.state.saveSettings();
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
          this.state.saveSettings();
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
          this.state.saveSettings();
        } else if (e.shiftKey && !this.state.isScrolling) {
          // Shift + Up/Down: Jump to prev/next cue point
          const cuePointsArray = Array.from(this.state.cuePoints).sort((a, b) => a - b);
          if (cuePointsArray.length > 0) {
            let targetIndex = -1;
            if (e.key === "ArrowUp") {
              // Find previous cue point
              for (let i = cuePointsArray.length - 1; i >= 0; i--) {
                if (cuePointsArray[i] < this.state.activeLineIndex) {
                  targetIndex = cuePointsArray[i];
                  break;
                }
              }
            } else {
              // Find next cue point
              for (let i = 0; i < cuePointsArray.length; i++) {
                if (cuePointsArray[i] > this.state.activeLineIndex) {
                  targetIndex = cuePointsArray[i];
                  break;
                }
              }
            }
            if (targetIndex >= 0) {
              this.state.activeLineIndex = targetIndex;
              this.jumpToLine(targetIndex);
            }
          }
          e.preventDefault();
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
          // Scroll to the active line using transform-based scrolling
          this.scrollToLine(this.state.activeLineIndex);
          this.updateTelepromptText();
        }
        e.preventDefault();
        return;
      }
      // M key: Toggle cue point on current line (when paused)
      // Don't trigger if typing in an input field
      if ((e.key === "m" || e.key === "M") && !this.state.isScrolling) {
        if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
          return;
        }
        this.toggleCuePoint(this.state.activeLineIndex);
        e.preventDefault();
        return;
      }
      if (e.key === " ") {
        // Space bar toggles play/pause
        this.toggleScrolling();
        e.preventDefault();
        return;
      }
      // Home key: Go back to top/restart
      // Don't trigger if typing in an input field
      if (e.key === "Home") {
        if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
          return;
        }
        document.dispatchEvent(new CustomEvent("back-to-top"));
        e.preventDefault();
        return;
      }
    };
    document.addEventListener("keydown", this.keydownHandler);
  }

  private toggleCuePoint(lineIndex: number) {
    if (this.state.cuePoints.has(lineIndex)) {
      this.state.cuePoints.delete(lineIndex);
    } else {
      this.state.cuePoints.add(lineIndex);
    }
    this.updateTelepromptText();
    this.state.saveSettings();
  }

  private jumpToLine(lineIndex: number) {
    this.scrollToLine(lineIndex);
    this.updateTelepromptText();
  }

  // Scroll to center a specific line using transform-based scrolling
  private scrollToLine(lineIndex: number, smooth: boolean = true) {
    const targetLine = this.element.querySelector(
      `.line[data-index="${lineIndex}"]`
    ) as HTMLElement;
    if (!targetLine || !this.telepromptTextInner) return;

    // Get the container's center position
    const containerRect = this.telepromptText.getBoundingClientRect();
    const containerCenter = containerRect.height / 2;

    // Get the line's position relative to the inner container
    const lineRect = targetLine.getBoundingClientRect();
    const innerRect = this.telepromptTextInner.getBoundingClientRect();
    const lineOffsetInContainer = lineRect.top - innerRect.top + lineRect.height / 2;

    // Calculate translateY needed to center this line
    const newTargetY = containerCenter - lineOffsetInContainer;

    // Clamp to valid range
    const maxTranslateY = 0;
    const totalHeight = this.telepromptTextInner.scrollHeight;
    const minTranslateY = -(totalHeight - containerRect.height);

    this.targetTranslateY = Math.max(minTranslateY, Math.min(maxTranslateY, newTargetY));

    if (smooth) {
      this.startSmoothScroll();
    } else {
      this.currentTranslateY = this.targetTranslateY;
      this.applyTransform();
    }
  }

  // Smooth scroll animation using requestAnimationFrame with easing
  private startSmoothScroll() {
    // Cancel any existing animation
    if (this.smoothScrollAnimationId !== null) {
      cancelAnimationFrame(this.smoothScrollAnimationId);
    }

    const animateSmoothScroll = () => {
      const distance = this.targetTranslateY - this.currentTranslateY;

      // If close enough to target, snap to it and stop
      if (Math.abs(distance) < 0.5) {
        this.currentTranslateY = this.targetTranslateY;
        this.applyTransform();
        this.updateActiveLine();
        this.smoothScrollAnimationId = null;
        return;
      }

      // Lerp towards target (0.15 = smooth easing factor)
      this.currentTranslateY += distance * 0.15;
      this.applyTransform();
      this.updateActiveLine();

      // Continue animation
      this.smoothScrollAnimationId = requestAnimationFrame(animateSmoothScroll);
    };

    this.smoothScrollAnimationId = requestAnimationFrame(animateSmoothScroll);
  }

  updateTelepromptText() {
    if (!this.telepromptTextInner) return;

    // Invalidate caches when text changes
    this.cachedLines = null;
    this.cachedLineHeight = 0;

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();

    // Split text into lines using shared utility
    const lines = splitTextIntoLines(this.state.text, this.state.maxWordsPerLine);

    // Create elements in batches to reduce reflow
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const lineElement = document.createElement("div");
      lineElement.className = "line";
      lineElement.dataset.index = index.toString();

      if (index === this.state.activeLineIndex) {
        lineElement.classList.add("active-line");
      }

      // Add cue-point class if this line is marked
      if (this.state.cuePoints.has(index)) {
        lineElement.classList.add("cue-point");
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
    this.targetTranslateY = this.currentTranslateY; // Keep target in sync
    this.applyTransform();

    // Throttle active line updates to every 100ms for performance
    if (timestamp - this.lastActiveLineUpdate > CONFIG.ACTIVE_LINE_UPDATE_INTERVAL) {
      this.lastActiveLineUpdate = timestamp;
      this.updateActiveLine();
    }

    // Check if we've reached the end
    const totalHeight = this.telepromptTextInner.scrollHeight;
    const containerHeight = this.telepromptText.clientHeight;
    if (Math.abs(this.currentTranslateY) + containerHeight >= totalHeight - CONFIG.END_THRESHOLD && !this.state.scriptEnded) {
      this.toggleScrolling(); // Auto-pause when reaching the end
      this.state.scriptEnded = true; // Set flag when script ends
      // Exit fullscreen (standard + Safari)
      const doc = document as Document & {
        webkitFullscreenElement?: Element;
        webkitExitFullscreen?: () => Promise<void>;
      };
      const isFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement;
      if (isFullscreen) {
        const exitFullscreen = doc.exitFullscreen || doc.webkitExitFullscreen;
        if (exitFullscreen) {
          exitFullscreen.call(doc);
        }
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
        this.targetTranslateY = 0;
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
      // Stop scrolling if currently playing
      if (this.state.isScrolling) {
        if (this.animationFrameId !== null) {
          window.cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }
        this.state.isScrolling = false;
        this.isRampingUp = false;
        this.isRampingDown = false;
        // Notify UI that scrolling stopped
        document.dispatchEvent(new CustomEvent("scrolling-toggled", {
          detail: { isScrolling: false, isCountingDown: false },
        }));
      }

      // Clear ramp down timeout if in progress
      if (this.rampDownTimeoutId !== null) {
        clearTimeout(this.rampDownTimeoutId);
        this.rampDownTimeoutId = null;
      }

      // Cancel countdown if in progress
      this.cancelCountdown();

      // Cancel any smooth scroll animation
      if (this.smoothScrollAnimationId !== null) {
        cancelAnimationFrame(this.smoothScrollAnimationId);
        this.smoothScrollAnimationId = null;
      }

      // When going back to top, apply a smooth transition
      if (this.telepromptTextInner) {
        // Calculate appropriate transition duration based on current position and speed
        const distanceToTop = Math.abs(this.currentTranslateY);
        const avgLineHeight = this.getLineHeight();
        const pixelsPerSecond = avgLineHeight * this.state.scrollSpeed;
        const transitionDuration = Math.min(0.5, distanceToTop / (pixelsPerSecond * 2));

        this.telepromptTextInner.style.transition = `transform ${transitionDuration}s ease-out`;
        this.currentTranslateY = 0;
        this.targetTranslateY = 0;
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
    // Update reading guide state and size
    if (this.readingGuide) {
      this.readingGuide.classList.toggle("enabled", this.state.readingGuideEnabled);
      // Set reading guide height based on current font size and line spacing
      const guideHeight = this.state.fontSize * this.state.lineSpacing * 1.5; // ~1.5 lines
      this.readingGuide.style.height = `${guideHeight}px`;
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
    if (this.wheelHandler && this.telepromptText) {
      this.telepromptText.removeEventListener("wheel", this.wheelHandler);
      this.wheelHandler = null;
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
    if (this.smoothScrollAnimationId !== null) {
      cancelAnimationFrame(this.smoothScrollAnimationId);
      this.smoothScrollAnimationId = null;
    }

    // Remove DOM element
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
