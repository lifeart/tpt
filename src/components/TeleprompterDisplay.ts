import { CONFIG } from "../config";
import { getFontFamily } from "../fonts";
import type { TeleprompterState } from "../state";
import type { PageChangedDetail, SafariDocument } from "../types";
import { splitTextIntoLines, isRTL, parseHexColor } from "../utils";
import { VoiceScrollEngine, isVoiceSupported } from "../voice-scroll";
import { i18n } from "../i18n";

// Teleprompter Display Component
export class TeleprompterDisplay {
  private element: HTMLDivElement;
  private telepromptText: HTMLDivElement;
  private telepromptTextInner: HTMLDivElement;
  private readingGuide: HTMLDivElement;
  private progressBar: HTMLDivElement;
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
  private scrollModeChangedHandler: (() => void) | null = null;
  private advancePageHandler: ((e: CustomEvent<{ direction: 1 | -1 }>) => void) | null = null;
  // Smooth scroll animation state
  private smoothScrollAnimationId: number | null = null;
  private targetTranslateY: number = 0;
  private isManualNavigation: boolean = false; // Skip activeLineIndex override during manual nav
  // Paging mode state
  private totalPages: number = 1;
  // Inline editing state
  private inlineEditor: HTMLTextAreaElement | null = null;
  private editingLineIndex: number = -1;
  // Voice scroll state
  private voiceEngine: VoiceScrollEngine | null = null;
  private voiceIndicator: HTMLDivElement | null = null;
  private recognizedTextDisplay: HTMLDivElement | null = null;
  private recognizedTextTimeout: number | null = null;
  // Inline editing event handler (stored for cleanup)
  private dblclickHandler: ((e: MouseEvent) => void) | null = null;

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

    // Create progress bar
    this.progressBar = document.createElement("div");
    this.progressBar.className = "teleprompter-progress-bar";
    this.element.appendChild(this.progressBar);

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
    this.setupCustomEventListeners();
    this.setupInlineEditing();
    this.setupVoiceScroll();
    this.calculateTotalPages();
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

      // Reset scriptEnded flag when scrolling up (away from end)
      if (scrollAmount < 0 && this.state.scriptEnded) {
        this.state.scriptEnded = false;
      }

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
        // Don't handle arrow keys if typing in an input field
        if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
          return;
        }
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
            // Reset scriptEnded flag when navigating back from end
            if (this.state.scriptEnded) {
              this.state.scriptEnded = false;
            }
          } else {
            // Use splitTextIntoLines to get correct line count (respects maxWordsPerLine)
            const lines = splitTextIntoLines(this.state.text, this.state.maxWordsPerLine);
            this.state.activeLineIndex = Math.min(
              lines.length - 1,
              this.state.activeLineIndex + 1
            );
          }
          // Scroll to the active line using transform-based scrolling
          this.isManualNavigation = true; // Prevent updateActiveLine from overriding
          this.scrollToLine(this.state.activeLineIndex);
          this.updateActiveLineVisual(); // Lightweight update, no DOM recreation
          // Sync voice engine position when manually navigating
          if (this.voiceEngine) {
            this.voiceEngine.setCurrentLine(this.state.activeLineIndex);
          }
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
        // In paging mode, Space advances to next page
        if (this.state.scrollMode === 'paging' && !this.state.isScrolling) {
          this.advancePage(1);
          e.preventDefault();
          return;
        }
        // Otherwise, Space toggles play/pause
        this.toggleScrolling();
        e.preventDefault();
        return;
      }
      // Enter key advances page in paging mode
      if (e.key === "Enter" && this.state.scrollMode === 'paging' && !this.state.isScrolling) {
        if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
          return;
        }
        this.advancePage(1);
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
    this.isManualNavigation = true; // Prevent updateActiveLine from overriding
    // Reset scriptEnded flag when jumping to a different line
    if (this.state.scriptEnded) {
      this.state.scriptEnded = false;
    }
    this.scrollToLine(lineIndex);
    this.updateActiveLineVisual(); // Lightweight update, no DOM recreation
    // Sync voice engine position when manually navigating
    if (this.voiceEngine) {
      this.voiceEngine.setCurrentLine(lineIndex);
    }
  }

  // Lightweight method to update active line visual without recreating DOM
  private updateActiveLineVisual() {
    // Remove active class from all lines
    const currentActive = this.element.querySelector(".line.active-line");
    if (currentActive) {
      currentActive.classList.remove("active-line");
    }
    // Add active class to new line
    const newActive = this.element.querySelector(`.line[data-index="${this.state.activeLineIndex}"]`);
    if (newActive) {
      newActive.classList.add("active-line");
    }
    // Update progress bar
    this.updateProgressBar();
  }

  // Update the progress bar and page indicator based on current position
  private updateProgressBar() {
    const lines = splitTextIntoLines(this.state.text, this.state.maxWordsPerLine);
    const totalLines = lines.length || 1;
    const progress = ((this.state.activeLineIndex + 1) / totalLines) * 100;

    // Update progress bar
    if (this.progressBar) {
      this.progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }

    // Calculate current page and dispatch page-changed event only when page changes
    const linesPerPage = this.getLinesPerPage();
    const currentPage = Math.floor(this.state.activeLineIndex / linesPerPage);
    const totalPages = Math.max(1, Math.ceil(totalLines / linesPerPage));

    // Only dispatch event if page changed (avoid unnecessary updates)
    if (this.state.currentPage !== currentPage || this.totalPages !== totalPages) {
      this.state.currentPage = currentPage;
      this.totalPages = totalPages;
      document.dispatchEvent(new CustomEvent<PageChangedDetail>("page-changed", {
        detail: { currentPage, totalPages }
      }));
    }
  }

  // Get lines per page based on container height
  private getLinesPerPage(): number {
    if (!this.telepromptText) return 10; // Default fallback
    const containerHeight = this.telepromptText.clientHeight;
    const lineHeight = this.getLineHeight();
    if (lineHeight <= 0) return 10;
    return Math.max(1, Math.floor(containerHeight / lineHeight));
  }

  // Scroll to center a specific line using transform-based scrolling
  // Returns true if scroll was initiated, false if it failed (element not found)
  private scrollToLine(lineIndex: number, smooth: boolean = true): boolean {
    const targetLine = this.element.querySelector(
      `.line[data-index="${lineIndex}"]`
    ) as HTMLElement;
    if (!targetLine || !this.telepromptTextInner) {
      this.isManualNavigation = false; // Clear flag since no animation will run
      return false;
    }

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
      this.isManualNavigation = false; // Clear flag since no animation runs
    }
    return true;
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
      if (Math.abs(distance) < CONFIG.SMOOTH_SCROLL_SNAP_THRESHOLD) {
        this.currentTranslateY = this.targetTranslateY;
        this.applyTransform();
        // Only update active line during auto-scroll, not manual navigation
        // (manual navigation already set activeLineIndex and visual class)
        if (!this.isManualNavigation) {
          this.updateActiveLine();
        }
        this.isManualNavigation = false;
        this.smoothScrollAnimationId = null;
        return;
      }

      // Lerp towards target using configured easing factor
      this.currentTranslateY += distance * CONFIG.SMOOTH_SCROLL_EASING;
      this.applyTransform();
      // Only update active line during auto-scroll, not manual navigation
      if (!this.isManualNavigation) {
        this.updateActiveLine();
      }

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

    // Update voice engine word index if active
    if (this.voiceEngine && this.state.scrollMode === 'voice') {
      this.voiceEngine.updateScript(this.state.text, this.state.maxWordsPerLine);
    }

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();

    // Add spacer at the beginning for half the container height
    // This ensures text starts from the center of the screen (teleprompter reading position)
    const topSpacer = document.createElement("div");
    topSpacer.className = "teleprompter-top-spacer";
    topSpacer.style.height = CONFIG.SPACER_HEIGHT;
    topSpacer.style.pointerEvents = "none";
    fragment.appendChild(topSpacer);

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

    // Update progress bar
    this.updateProgressBar();
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
      // Remove is-scrolling class to enable inline edit affordance
      this.element.classList.remove("is-scrolling");
      // Exit fullscreen (standard + Safari)
      const doc = document as SafariDocument;
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
    // In voice mode, toggle voice listening instead of continuous scroll
    if (this.state.scrollMode === 'voice' && this.voiceEngine) {
      if (this.voiceEngine.isActive()) {
        this.stopVoiceMode();
        document.dispatchEvent(new CustomEvent("scrolling-toggled", {
          detail: { isScrolling: false, isCountingDown: false },
        }));
      } else {
        this.startVoiceMode();
        document.dispatchEvent(new CustomEvent("scrolling-toggled", {
          detail: { isScrolling: true, isCountingDown: false },
        }));
      }
      return;
    }

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
        // Remove is-scrolling class to enable inline edit affordance
        this.element.classList.remove("is-scrolling");
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
        // Add is-scrolling class to disable inline edit affordance
        this.element.classList.add("is-scrolling");
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
        // Remove is-scrolling class to enable inline edit affordance
        this.element.classList.remove("is-scrolling");
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
      this.state.currentPage = 0;
      this.state.scriptEnded = false;
      this.updateTelepromptText();
      this.calculateTotalPages();

      // Reset voice engine position tracking
      if (this.voiceEngine) {
        this.voiceEngine.reset();
      }

      // Notify of page reset in paging mode
      if (this.state.scrollMode === 'paging') {
        document.dispatchEvent(new CustomEvent<PageChangedDetail>("page-changed", {
          detail: { currentPage: 0, totalPages: this.totalPages }
        }));
      }
    };
    document.addEventListener("back-to-top", this.backToTopHandler as EventListener);

    // Listen for scroll mode changes
    this.scrollModeChangedHandler = () => {
      this.calculateTotalPages();
      if (this.state.scrollMode === 'paging') {
        // Reset to first page
        this.state.currentPage = 0;
        this.scrollToPage(0);
        document.dispatchEvent(new CustomEvent<PageChangedDetail>("page-changed", {
          detail: { currentPage: 0, totalPages: this.totalPages }
        }));
        // Stop voice mode if active and hide indicator
        this.stopVoiceMode();
        if (this.voiceIndicator) {
          this.voiceIndicator.style.display = "none";
        }
      } else if (this.state.scrollMode === 'voice') {
        // Show voice indicator (user clicks Play to start listening)
        if (this.voiceIndicator) {
          this.voiceIndicator.style.display = "flex";
        }
      } else {
        // Continuous mode - stop voice if active and hide indicator
        this.stopVoiceMode();
        if (this.voiceIndicator) {
          this.voiceIndicator.style.display = "none";
        }
      }
    };
    document.addEventListener("scroll-mode-changed", this.scrollModeChangedHandler as EventListener);

    // Listen for page advance events
    this.advancePageHandler = (e: CustomEvent<{ direction: 1 | -1 }>) => {
      this.advancePage(e.detail.direction);
    };
    document.addEventListener("advance-page", this.advancePageHandler as EventListener);
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

    // Apply horizontal margins
    const marginPercent = this.state.horizontalMargin;
    this.telepromptTextInner.style.paddingLeft = `${marginPercent}%`;
    this.telepromptTextInner.style.paddingRight = `${marginPercent}%`;

    // Apply RTL text direction
    const textDirection = this.getEffectiveTextDirection();
    this.telepromptTextInner.dir = textDirection;

    if (this.element) {
      // Apply overlay opacity to background
      const bgColor = this.state.backgroundColor;
      const opacity = this.state.overlayOpacity;
      if (opacity < 1) {
        // Convert hex to rgba with opacity
        const rgb = parseHexColor(bgColor);
        if (rgb) {
          this.element.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
        } else {
          this.element.style.backgroundColor = bgColor;
        }
      } else {
        this.element.style.backgroundColor = bgColor;
      }
      this.element.classList.toggle("flipped", this.state.isFlipped);
    }
    // Update reading guide state and size
    if (this.readingGuide) {
      this.readingGuide.classList.toggle("enabled", this.state.readingGuideEnabled);
      // Set reading guide height based on current font size and line spacing
      const guideHeight = this.state.fontSize * this.state.lineSpacing * CONFIG.READING_GUIDE_HEIGHT_MULTIPLIER;
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
    // Recalculate pages after style changes
    this.calculateTotalPages();
  }

  private getEffectiveTextDirection(): 'ltr' | 'rtl' {
    if (this.state.textDirection === 'auto') {
      return isRTL(this.state.text) ? 'rtl' : 'ltr';
    }
    return this.state.textDirection === 'rtl' ? 'rtl' : 'ltr';
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

    // Update the active line class (skip during manual navigation to avoid overriding)
    if (!this.isManualNavigation && newActiveIndex >= 0 && newActiveIndex !== this.state.activeLineIndex) {
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
      // Update progress bar
      this.updateProgressBar();
    }
  }

  // ============================================
  // Paging Mode Support
  // ============================================

  private calculateTotalPages() {
    if (!this.telepromptText || !this.telepromptTextInner) return;
    const containerHeight = this.telepromptText.clientHeight;
    const contentHeight = this.telepromptTextInner.scrollHeight;
    const pageHeight = containerHeight * (1 - CONFIG.PAGING_OVERLAP);
    this.totalPages = Math.max(1, Math.ceil(contentHeight / pageHeight));
  }

  private advancePage(direction: 1 | -1) {
    if (this.state.scrollMode !== 'paging') return;

    const newPage = this.state.currentPage + direction;
    if (newPage < 0 || newPage >= this.totalPages) return;

    this.state.currentPage = newPage;
    this.scrollToPage(newPage);

    // Notify toolbar of page change
    document.dispatchEvent(new CustomEvent<PageChangedDetail>("page-changed", {
      detail: { currentPage: newPage, totalPages: this.totalPages }
    }));
  }

  private scrollToPage(pageIndex: number) {
    if (!this.telepromptText || !this.telepromptTextInner) return;

    const containerHeight = this.telepromptText.clientHeight;
    const pageHeight = containerHeight * (1 - CONFIG.PAGING_OVERLAP);
    const targetY = -pageIndex * pageHeight;

    // Apply smooth transition for page change
    this.telepromptTextInner.style.transition = `transform ${CONFIG.PAGING_TRANSITION_DURATION}ms ease-out`;
    this.currentTranslateY = targetY;
    this.targetTranslateY = targetY;
    this.applyTransform();

    // Remove transition after animation completes
    setTimeout(() => {
      if (this.telepromptTextInner) {
        this.telepromptTextInner.style.transition = "none";
      }
      this.updateActiveLine();
    }, CONFIG.PAGING_TRANSITION_DURATION);
  }

  // ============================================
  // Inline Editing Support
  // ============================================

  private setupInlineEditing() {
    // Double-click to edit a line (store handler for cleanup)
    this.dblclickHandler = (e: MouseEvent) => {
      if (this.state.isScrolling) return; // Don't allow editing while scrolling

      const target = e.target as HTMLElement;
      if (!target.classList.contains("line")) return;

      const lineIndex = parseInt(target.dataset.index || "-1", 10);
      if (lineIndex < 0) return;

      this.startInlineEdit(lineIndex, target);
    };
    this.telepromptTextInner.addEventListener("dblclick", this.dblclickHandler);
  }

  // ============================================
  // Voice Scroll Support
  // ============================================

  private setupVoiceScroll() {
    // Create voice indicator UI
    this.voiceIndicator = document.createElement("div");
    this.voiceIndicator.className = "voice-indicator";
    this.voiceIndicator.innerHTML = `
      <svg class="mic-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
      <span class="voice-status">${i18n.t('voiceScrolling')}</span>
      <div class="mic-level"><div class="mic-level-bar" style="width: 0%"></div></div>
    `;
    this.voiceIndicator.style.display = "none";
    this.element.appendChild(this.voiceIndicator);

    // Create recognized text display
    this.recognizedTextDisplay = document.createElement("div");
    this.recognizedTextDisplay.className = "recognized-text";
    this.element.appendChild(this.recognizedTextDisplay);

    // Initialize voice engine with callbacks
    this.voiceEngine = new VoiceScrollEngine({
      onScrollTo: (lineIndex: number) => {
        // Scroll to the matched line
        this.state.activeLineIndex = lineIndex;
        this.scrollToLine(lineIndex);
        this.updateActiveLineVisual(); // Lightweight update, no DOM recreation
      },
      onRecognizedText: (text: string) => {
        this.showRecognizedText(text);
      },
      onConfidenceChange: (_confidence: number) => {
        // TODO: Reserved for future use - could show confidence indicator
        // (e.g., color coding based on recognition confidence)
      },
      onMicLevelChange: (level: number) => {
        // Update mic level bar
        const levelBar = this.voiceIndicator?.querySelector(".mic-level-bar") as HTMLElement;
        if (levelBar) {
          levelBar.style.width = `${level * 100}%`;
        }
      },
      onError: (error: string) => {
        this.showRecognizedText(error);
        // If permission denied or not supported, switch back to continuous mode
        if (error.includes("permission") || error.includes("not supported")) {
          this.state.scrollMode = "continuous";
          this.state.saveSettings();
          document.dispatchEvent(new CustomEvent("scroll-mode-changed"));
        }
      },
      onStatusChange: (isListening: boolean) => {
        if (this.voiceIndicator) {
          this.voiceIndicator.classList.toggle("active", isListening);
          const statusEl = this.voiceIndicator.querySelector(".voice-status");
          if (statusEl) {
            statusEl.textContent = isListening
              ? i18n.t('microphoneActive')
              : i18n.t('voiceScrolling');
          }
        }
      },
    });

    // Set language based on browser locale
    this.voiceEngine.setLanguage(navigator.language);

    // Build initial word index
    this.voiceEngine.updateScript(this.state.text, this.state.maxWordsPerLine);

    // If in voice mode, just show indicator (user clicks Play to start listening)
    if (this.state.scrollMode === "voice") {
      if (this.voiceIndicator) {
        this.voiceIndicator.style.display = "flex";
      }
    }
  }

  private startVoiceMode() {
    if (!this.voiceEngine) return;

    // Check browser support first
    if (!isVoiceSupported()) {
      this.showRecognizedText(i18n.t('voiceNotSupported'));
      // Switch back to continuous mode
      this.state.scrollMode = "continuous";
      this.state.saveSettings();
      document.dispatchEvent(new CustomEvent("scroll-mode-changed"));
      return;
    }

    // Show voice indicator
    if (this.voiceIndicator) {
      this.voiceIndicator.style.display = "flex";
    }

    // Rebuild word index with current settings
    this.voiceEngine.updateScript(this.state.text, this.state.maxWordsPerLine);

    // Start listening
    const started = this.voiceEngine.start();

    // Emit scrolling-toggled to update play/pause button state
    if (started) {
      document.dispatchEvent(new CustomEvent("scrolling-toggled", {
        detail: { isScrolling: true, isCountingDown: false },
      }));
    }
  }

  private stopVoiceMode() {
    if (!this.voiceEngine) return;

    const wasActive = this.voiceEngine.isActive();

    // Stop listening
    this.voiceEngine.stop();

    // Note: we don't hide the voice indicator here - caller handles that
    // based on whether we're switching modes or just pausing

    // Hide recognized text
    if (this.recognizedTextDisplay) {
      this.recognizedTextDisplay.classList.remove("visible");
    }

    // Only emit if we actually stopped something
    if (wasActive) {
      document.dispatchEvent(new CustomEvent("scrolling-toggled", {
        detail: { isScrolling: false, isCountingDown: false },
      }));
    }
  }

  private showRecognizedText(text: string) {
    if (!this.recognizedTextDisplay) return;

    // Limit to last 6 words to prevent text from growing too long
    const words = text.trim().split(/\s+/);
    const displayText = words.length > 6 ? '...' + words.slice(-6).join(' ') : text;

    this.recognizedTextDisplay.textContent = displayText;
    this.recognizedTextDisplay.classList.add("visible");

    // Clear previous timeout
    if (this.recognizedTextTimeout !== null) {
      clearTimeout(this.recognizedTextTimeout);
    }

    // Hide after 2 seconds
    this.recognizedTextTimeout = window.setTimeout(() => {
      if (this.recognizedTextDisplay) {
        this.recognizedTextDisplay.classList.remove("visible");
      }
      this.recognizedTextTimeout = null;
    }, 2000);
  }

  private startInlineEdit(lineIndex: number, lineElement: HTMLElement) {
    // Disable inline editing when word wrapping is enabled
    // because it would corrupt the original text structure
    if (this.state.maxWordsPerLine > 0) {
      // Show feedback - tell user to use editor or disable word wrapping
      this.showRecognizedText(`${i18n.t('editScript')} (${i18n.t('maxWordsPerLine')}: ${this.state.maxWordsPerLine})`);
      return;
    }

    if (this.inlineEditor) {
      this.finishInlineEdit();
    }

    this.editingLineIndex = lineIndex;

    // Get the line's text content (simple case: display lines match original)
    const lines = this.state.text.split("\n");
    const lineText = lines[lineIndex] || "";

    // Create inline editor
    this.inlineEditor = document.createElement("textarea");
    this.inlineEditor.className = "inline-editor";
    this.inlineEditor.value = lineText.trim() === "\u00A0" ? "" : lineText; // Handle nbsp for empty lines
    this.inlineEditor.style.cssText = `
      position: absolute;
      width: ${lineElement.offsetWidth}px;
      min-height: ${lineElement.offsetHeight}px;
      font-family: inherit;
      font-size: inherit;
      color: inherit;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid var(--apple-system-blue);
      border-radius: 4px;
      padding: 4px 8px;
      resize: none;
      outline: none;
      z-index: 100;
      box-sizing: border-box;
    `;

    // Position the editor over the line
    const rect = lineElement.getBoundingClientRect();
    const containerRect = this.telepromptTextInner.getBoundingClientRect();
    this.inlineEditor.style.left = `${rect.left - containerRect.left}px`;
    this.inlineEditor.style.top = `${rect.top - containerRect.top}px`;

    // Hide the original line
    lineElement.style.visibility = "hidden";

    // Add editor to the container
    this.telepromptTextInner.style.position = "relative";
    this.telepromptTextInner.appendChild(this.inlineEditor);

    // Focus and select all
    this.inlineEditor.focus();
    this.inlineEditor.select();

    // Handle blur (click outside)
    this.inlineEditor.addEventListener("blur", () => {
      this.finishInlineEdit();
    });

    // Handle Escape to cancel
    this.inlineEditor.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        this.cancelInlineEdit();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.finishInlineEdit();
      }
    });
  }

  private finishInlineEdit() {
    if (!this.inlineEditor || this.editingLineIndex < 0) return;

    const newText = this.inlineEditor.value;
    const originalLines = this.state.text.split("\n");

    // Update the specific line (safe because inline editing is disabled when maxWordsPerLine > 0)
    if (this.editingLineIndex < originalLines.length) {
      originalLines[this.editingLineIndex] = newText;
      this.state.text = originalLines.join("\n");
    }

    // Save to localStorage
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, this.state.text);
    } catch (e) {
      console.warn("Could not save script:", e);
    }

    this.cleanupInlineEditor();
    this.updateTelepromptText();
    this.state.saveSettings();
  }

  private cancelInlineEdit() {
    this.cleanupInlineEditor();
    // Restore visibility of the line
    const lineElement = this.element.querySelector(`.line[data-index="${this.editingLineIndex}"]`) as HTMLElement;
    if (lineElement) {
      lineElement.style.visibility = "";
    }
  }

  private cleanupInlineEditor() {
    if (this.inlineEditor && this.inlineEditor.parentNode) {
      this.inlineEditor.parentNode.removeChild(this.inlineEditor);
    }
    this.inlineEditor = null;
    this.editingLineIndex = -1;
  }

  // ============================================
  // Updated Event Handlers
  // ============================================

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
    if (this.scrollModeChangedHandler) {
      document.removeEventListener("scroll-mode-changed", this.scrollModeChangedHandler as EventListener);
      this.scrollModeChangedHandler = null;
    }
    if (this.advancePageHandler) {
      document.removeEventListener("advance-page", this.advancePageHandler as EventListener);
      this.advancePageHandler = null;
    }

    // Cleanup inline editor and dblclick handler
    this.cleanupInlineEditor();
    if (this.dblclickHandler && this.telepromptTextInner) {
      this.telepromptTextInner.removeEventListener("dblclick", this.dblclickHandler);
      this.dblclickHandler = null;
    }

    // Cleanup voice engine
    if (this.voiceEngine) {
      this.voiceEngine.destroy();
      this.voiceEngine = null;
    }
    if (this.recognizedTextTimeout !== null) {
      clearTimeout(this.recognizedTextTimeout);
      this.recognizedTextTimeout = null;
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
