import { CONFIG } from "../config";
import {
  editIcon,
  restartIcon,
  fullscreenEnterIcon,
  fullscreenExitIcon,
  settingsIcon,
  helpIcon,
  remoteIcon,
  scrollIcon,
  pagesIcon,
  micIcon,
  rsvpIcon,
  playIcon,
  pauseIcon,
} from "../icons";
import { i18n } from "../i18n";
import type { TeleprompterState } from "../state";
import type { ScrollingToggledDetail, ScrollMode } from "../types";
import { calculateDuration, formatDuration, calculateWPM } from "../utils";

// Floating Toolbar Component
export class FloatingToolbar {
  private element: HTMLElement;
  private state: TeleprompterState;
  private editBtn: HTMLButtonElement;
  private restartBtn: HTMLButtonElement;
  private playPauseBtn: HTMLButtonElement;
  private speedMinusBtn: HTMLButtonElement;
  private speedPlusBtn: HTMLButtonElement;
  private speedValue: HTMLSpanElement;
  private durationDisplay: HTMLSpanElement;
  private fullscreenBtn: HTMLButtonElement;
  private settingsBtn: HTMLButtonElement;
  private helpBtn: HTMLButtonElement;
  private remoteBtn: HTMLButtonElement;
  private scrollModeBtn: HTMLButtonElement;
  private pageIndicator: HTMLSpanElement | null = null;
  private speedControl: HTMLDivElement | null = null;
  private scrollingToggledHandler: ((e: CustomEvent<ScrollingToggledDetail>) => void) | null = null;
  private fullscreenChangeHandler: (() => void) | null = null;
  private resizeHandler: (() => void) | null = null;
  private autoHideTimeout: number | null = null;
  private isAutoHiding: boolean = false; // Track if auto-hide is active
  private i18nUnsubscribe: (() => void) | null = null;

  // Callbacks
  private onEditClick: () => void;
  private onSettingsClick: () => void;
  private onHelpClick: () => void;
  private onRemoteClick: () => void;

  constructor(
    container: HTMLElement,
    state: TeleprompterState,
    callbacks: {
      onEditClick: () => void;
      onSettingsClick: () => void;
      onHelpClick: () => void;
      onRemoteClick?: () => void;
    }
  ) {
    this.state = state;
    this.onEditClick = callbacks.onEditClick;
    this.onSettingsClick = callbacks.onSettingsClick;
    this.onHelpClick = callbacks.onHelpClick;
    this.onRemoteClick = callbacks.onRemoteClick || (() => {});

    // Create toolbar element
    this.element = document.createElement("nav");
    this.element.className = "floating-toolbar";
    this.element.setAttribute("role", "toolbar");
    this.element.setAttribute("aria-label", "Main toolbar");

    // Create buttons
    this.editBtn = this.createButton("toolbar-btn toolbar-btn-edit toolbar-btn-icon", editIcon, i18n.t('edit'), i18n.t('tooltipEdit'));
    this.editBtn.dataset.action = "edit";
    this.restartBtn = this.createButton("toolbar-btn toolbar-btn-restart toolbar-btn-icon", restartIcon, i18n.t('backToTop'), i18n.t('tooltipRestart'));
    this.restartBtn.dataset.action = "restart";
    this.playPauseBtn = this.createButton("toolbar-btn toolbar-btn-play", "", i18n.t('play'), i18n.t('tooltipPlayPause'));
    this.playPauseBtn.dataset.action = "toggle-play";
    this.updatePlayPauseButton('play');

    // Duration display (created early since updateSpeedDisplay references it)
    this.durationDisplay = document.createElement("span");
    this.durationDisplay.className = "toolbar-duration";
    this.durationDisplay.dataset.testid = "duration";

    // Speed control (shown for continuous mode)
    this.speedControl = document.createElement("div");
    this.speedControl.className = "speed-control";
    this.speedControl.setAttribute("role", "group");
    this.speedControl.setAttribute("aria-label", "Speed control");

    this.speedMinusBtn = document.createElement("button");
    this.speedMinusBtn.className = "speed-btn";
    this.speedMinusBtn.textContent = "−";
    this.speedMinusBtn.setAttribute("aria-label", i18n.t('decreaseSpeed'));
    this.speedMinusBtn.setAttribute("data-tooltip", i18n.t('tooltipDecreaseSpeed'));
    this.speedMinusBtn.dataset.action = "speed-down";
    this.speedMinusBtn.type = "button";

    this.speedValue = document.createElement("span");
    this.speedValue.className = "speed-value";
    this.speedValue.dataset.testid = "speed-value";
    this.speedValue.setAttribute("role", "status");
    this.speedValue.setAttribute("aria-live", "polite");
    this.speedValue.setAttribute("aria-atomic", "true");
    // ARIA value attributes for accessibility
    this.speedValue.setAttribute("aria-valuemin", CONFIG.SCROLL_SPEED.MIN.toString());
    this.speedValue.setAttribute("aria-valuemax", CONFIG.SCROLL_SPEED.MAX.toString());
    this.speedValue.setAttribute("aria-valuenow", this.state.scrollSpeed.toString());
    this.updateSpeedDisplay();

    this.speedPlusBtn = document.createElement("button");
    this.speedPlusBtn.className = "speed-btn";
    this.speedPlusBtn.textContent = "+";
    this.speedPlusBtn.setAttribute("aria-label", i18n.t('increaseSpeed'));
    this.speedPlusBtn.setAttribute("data-tooltip", i18n.t('tooltipIncreaseSpeed'));
    this.speedPlusBtn.dataset.action = "speed-up";
    this.speedPlusBtn.type = "button";

    this.speedControl.appendChild(this.speedMinusBtn);
    this.speedControl.appendChild(this.speedValue);
    this.speedControl.appendChild(this.speedPlusBtn);

    // Page indicator (shown for paging mode)
    this.pageIndicator = document.createElement("span");
    this.pageIndicator.className = "toolbar-page-indicator";
    this.pageIndicator.dataset.testid = "page-indicator";
    this.pageIndicator.style.display = "none";
    this.updatePageIndicator();

    // Scroll mode toggle button
    this.scrollModeBtn = this.createButton("toolbar-btn toolbar-btn-mode toolbar-btn-icon", this.getScrollModeIcon(), this.getScrollModeLabel(), this.getScrollModeTooltip());
    this.scrollModeBtn.dataset.action = "cycle-scroll-mode";

    // Remote control button
    this.remoteBtn = this.createButton("toolbar-btn toolbar-btn-remote toolbar-btn-icon", remoteIcon, i18n.t('openRemote'), i18n.t('tooltipRemote'));
    this.remoteBtn.dataset.action = "open-remote";

    this.fullscreenBtn = this.createButton("toolbar-btn toolbar-btn-fullscreen toolbar-btn-icon", fullscreenEnterIcon, i18n.t('toggleFullscreen'), i18n.t('tooltipFullscreen'));
    this.fullscreenBtn.dataset.action = "fullscreen";
    this.settingsBtn = this.createButton("toolbar-btn toolbar-btn-settings toolbar-btn-icon", settingsIcon, i18n.t('settings'), i18n.t('tooltipSettings'));
    this.settingsBtn.dataset.action = "settings";
    this.helpBtn = this.createButton("toolbar-btn toolbar-btn-help toolbar-btn-icon", helpIcon, i18n.t('helpKeyboardShortcuts'), i18n.t('tooltipHelp'));
    this.helpBtn.dataset.action = "help";

    // Append all elements
    this.element.appendChild(this.editBtn);
    this.element.appendChild(this.restartBtn);
    this.element.appendChild(this.playPauseBtn);
    this.element.appendChild(this.speedControl);
    this.element.appendChild(this.pageIndicator);
    this.element.appendChild(this.scrollModeBtn);
    this.element.appendChild(this.durationDisplay);
    this.element.appendChild(this.remoteBtn);
    this.element.appendChild(this.fullscreenBtn);
    this.element.appendChild(this.settingsBtn);
    this.element.appendChild(this.helpBtn);

    container.appendChild(this.element);

    // Update UI based on current scroll mode
    this.updateScrollModeUI();

    this.setupEventListeners();

    // Subscribe to locale changes
    this.i18nUnsubscribe = i18n.onChange(() => {
      this.updateLabels();
    });
  }

  private createButton(className: string, iconHtml: string, ariaLabel: string, tooltip?: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = className;
    btn.type = "button";
    btn.innerHTML = iconHtml;
    btn.setAttribute("aria-label", ariaLabel);
    if (tooltip) {
      btn.setAttribute("data-tooltip", tooltip);
    }
    return btn;
  }

  private updateLabels() {
    this.editBtn.setAttribute("aria-label", i18n.t('edit'));
    this.editBtn.setAttribute("data-tooltip", i18n.t('tooltipEdit'));
    this.restartBtn.setAttribute("aria-label", i18n.t('backToTop'));
    this.restartBtn.setAttribute("data-tooltip", i18n.t('tooltipRestart'));
    this.playPauseBtn.setAttribute("data-tooltip", i18n.t('tooltipPlayPause'));
    this.speedMinusBtn.setAttribute("aria-label", i18n.t('decreaseSpeed'));
    this.speedMinusBtn.setAttribute("data-tooltip", i18n.t('tooltipDecreaseSpeed'));
    this.speedPlusBtn.setAttribute("aria-label", i18n.t('increaseSpeed'));
    this.speedPlusBtn.setAttribute("data-tooltip", i18n.t('tooltipIncreaseSpeed'));
    this.fullscreenBtn.setAttribute("aria-label", i18n.t('toggleFullscreen'));
    this.fullscreenBtn.setAttribute("data-tooltip", i18n.t('tooltipFullscreen'));
    this.settingsBtn.setAttribute("aria-label", i18n.t('settings'));
    this.settingsBtn.setAttribute("data-tooltip", i18n.t('tooltipSettings'));
    this.helpBtn.setAttribute("aria-label", i18n.t('helpKeyboardShortcuts'));
    this.helpBtn.setAttribute("data-tooltip", i18n.t('tooltipHelp'));
    this.remoteBtn.setAttribute("aria-label", i18n.t('openRemote'));
    this.remoteBtn.setAttribute("data-tooltip", i18n.t('tooltipRemote'));
    this.scrollModeBtn.setAttribute("aria-label", this.getScrollModeLabel());
    this.scrollModeBtn.setAttribute("data-tooltip", this.getScrollModeTooltip());
    // Play/pause button text is managed by scrolling-toggled event
  }

  private getScrollModeIcon(): string {
    switch (this.state.scrollMode) {
      case 'paging': return pagesIcon;
      case 'voice': return micIcon;
      case 'rsvp': return rsvpIcon;
      default: return scrollIcon;
    }
  }

  private getScrollModeLabel(): string {
    switch (this.state.scrollMode) {
      case 'paging': return i18n.t('paging');
      case 'voice': return i18n.t('voice');
      case 'rsvp': return i18n.t('rsvp');
      default: return i18n.t('continuous');
    }
  }

  private getScrollModeTooltip(): string {
    return `${i18n.t('tooltipScrollMode')} (${this.getScrollModeLabel()})`;
  }

  private cycleScrollMode() {
    const modes: ScrollMode[] = ['continuous', 'paging', 'voice', 'rsvp'];
    const currentIndex = modes.indexOf(this.state.scrollMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.state.scrollMode = modes[nextIndex];
    this.state.saveSettings();
    this.updateScrollModeUI();
    document.dispatchEvent(new CustomEvent("scroll-mode-changed"));
  }

  private updateScrollModeUI() {
    // Update button icon and tooltip
    this.scrollModeBtn.innerHTML = this.getScrollModeIcon();
    this.scrollModeBtn.setAttribute("aria-label", this.getScrollModeLabel());
    this.scrollModeBtn.setAttribute("data-tooltip", this.getScrollModeTooltip());

    // Show/hide speed control vs page indicator based on mode
    if (this.speedControl && this.pageIndicator) {
      if (this.state.scrollMode === 'paging') {
        this.speedControl.style.display = 'none';
        this.pageIndicator.style.display = 'flex';
        this.updatePageIndicator();
      } else if (this.state.scrollMode === 'rsvp') {
        // In RSVP mode, hide both - RSVP has its own WPM display
        this.speedControl.style.display = 'none';
        this.pageIndicator.style.display = 'none';
      } else {
        this.speedControl.style.display = 'flex';
        this.pageIndicator.style.display = 'none';
      }
    }
  }

  private updatePageIndicator() {
    if (this.pageIndicator) {
      const totalPages = this.getTotalPages();
      const currentPage = this.state.currentPage + 1;
      this.pageIndicator.textContent = `${i18n.t('pageIndicator')} ${currentPage} / ${totalPages}`;
    }
  }

  private getTotalPages(): number {
    // Estimate total pages based on line count and viewport
    // This will be refined by TeleprompterDisplay which has access to actual measurements
    const lines = this.state.text.split('\n').length;
    const estimatedLinesPerPage = 10; // Rough estimate
    return Math.max(1, Math.ceil(lines / estimatedLinesPerPage));
  }

  updatePageInfo(currentPage: number, totalPages: number) {
    this.state.currentPage = currentPage;
    if (this.pageIndicator) {
      this.pageIndicator.textContent = `${i18n.t('pageIndicator')} ${currentPage + 1} / ${totalPages}`;
    }
  }

  private setupEventListeners() {
    // Edit button
    this.editBtn.addEventListener("click", () => {
      this.onEditClick();
    });

    // Restart button
    this.restartBtn.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("back-to-top"));
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
      this.state.saveSettings();
    });

    this.speedPlusBtn.addEventListener("click", () => {
      this.state.scrollSpeed = Math.min(CONFIG.SCROLL_SPEED.MAX, this.state.scrollSpeed + CONFIG.SCROLL_SPEED.STEP);
      this.state.scrollSpeed = Math.round(this.state.scrollSpeed * 10) / 10;
      this.updateSpeedDisplay();
      document.dispatchEvent(new CustomEvent("speed-changed"));
      this.state.saveSettings();
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

    // Remote button
    this.remoteBtn.addEventListener("click", () => {
      this.onRemoteClick();
    });

    // Scroll mode toggle button
    this.scrollModeBtn.addEventListener("click", () => {
      this.cycleScrollMode();
    });

    // Listen for scrolling state changes
    this.scrollingToggledHandler = (e: CustomEvent<ScrollingToggledDetail>) => {
      if (e.detail.isCountingDown) {
        this.updatePlayPauseButton('cancel');
        this.playPauseBtn.classList.remove("playing");
        this.playPauseBtn.classList.add("countdown");
      } else if (e.detail.isScrolling) {
        this.updatePlayPauseButton('pause');
        this.playPauseBtn.classList.add("playing");
        this.playPauseBtn.classList.remove("countdown");
        this.startAutoHide();
      } else {
        this.updatePlayPauseButton('play');
        this.playPauseBtn.classList.remove("playing", "countdown");
        this.stopAutoHide();
      }
    };
    document.addEventListener("scrolling-toggled", this.scrollingToggledHandler as EventListener);

    // Listen for fullscreen changes (standard + Safari)
    this.fullscreenChangeHandler = () => {
      this.updateFullscreenIcon();
    };
    document.addEventListener("fullscreenchange", this.fullscreenChangeHandler);
    document.addEventListener("webkitfullscreenchange", this.fullscreenChangeHandler);

    // Listen for resize to update auto-hide behavior
    this.resizeHandler = () => {
      this.updateAutoHideOnResize();
    };
    window.addEventListener("resize", this.resizeHandler);
  }

  private toggleFullscreen() {
    const appRoot = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void>;
    };

    const isFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement;

    if (!isFullscreen) {
      const requestFullscreen = appRoot.requestFullscreen || appRoot.webkitRequestFullscreen;
      if (requestFullscreen) {
        requestFullscreen.call(appRoot).catch((err: Error) => {
          alert(`${i18n.t('fullscreenError')}: ${err.message} (${err.name})`);
        });
      }
    } else {
      const exitFullscreen = doc.exitFullscreen || doc.webkitExitFullscreen;
      if (exitFullscreen) {
        exitFullscreen.call(doc);
      }
    }
  }

  private updateFullscreenIcon() {
    const doc = document as Document & { webkitFullscreenElement?: Element };
    const isFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement;
    this.fullscreenBtn.innerHTML = isFullscreen
      ? fullscreenExitIcon
      : fullscreenEnterIcon;
  }

  private updatePlayPauseButton(state: 'play' | 'pause' | 'cancel') {
    const icon = state === 'pause' ? pauseIcon : playIcon;
    const text = i18n.t(state);
    this.playPauseBtn.innerHTML = `<span class="btn-icon">${icon}</span><span class="btn-text">${text}</span>`;
    this.playPauseBtn.setAttribute("aria-label", text);
  }

  private updateSpeedDisplay() {
    // Show speed with WPM
    const wpm = calculateWPM(this.state.text, this.state.scrollSpeed, this.state.maxWordsPerLine);
    this.speedValue.textContent = `${this.state.scrollSpeed}x`;
    this.speedValue.setAttribute("title", `~${wpm} ${i18n.t('wpm')}`);
    // Update ARIA value for accessibility
    this.speedValue.setAttribute("aria-valuenow", this.state.scrollSpeed.toString());
    this.speedValue.setAttribute("aria-valuetext", `${this.state.scrollSpeed} ${i18n.t('linesPerSec')}, approximately ${wpm} ${i18n.t('wpm')}`);
    this.updateDurationDisplay();
  }

  private updateDurationDisplay() {
    const duration = calculateDuration(this.state.text, this.state.scrollSpeed, this.state.maxWordsPerLine);
    const durationStr = formatDuration(duration.minutes, duration.seconds);
    this.durationDisplay.textContent = durationStr;
    this.durationDisplay.setAttribute("title", i18n.t('estimatedDuration'));
  }

  updateSpeed(speed: number) {
    this.state.scrollSpeed = speed;
    this.updateSpeedDisplay();
  }

  updateDuration() {
    this.updateDurationDisplay();
  }

  private isPhoneLandscape(): boolean {
    return window.innerWidth <= 900 && window.innerHeight <= 500;
  }

  private startAutoHide() {
    // Only auto-hide in phone landscape mode
    if (this.isPhoneLandscape()) {
      this.isAutoHiding = true;
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
    this.isAutoHiding = false;
  }

  private updateAutoHideOnResize() {
    // If playing and we resize into phone landscape, start auto-hide
    // If we resize out of phone landscape, stop auto-hide
    if (this.state.isScrolling || this.playPauseBtn.classList.contains("playing")) {
      if (this.isPhoneLandscape() && !this.isAutoHiding) {
        this.startAutoHide();
      } else if (!this.isPhoneLandscape() && this.isAutoHiding) {
        this.stopAutoHide();
      }
    }
  }

  destroy() {
    if (this.scrollingToggledHandler) {
      document.removeEventListener("scrolling-toggled", this.scrollingToggledHandler as EventListener);
      this.scrollingToggledHandler = null;
    }
    if (this.fullscreenChangeHandler) {
      document.removeEventListener("fullscreenchange", this.fullscreenChangeHandler);
      document.removeEventListener("webkitfullscreenchange", this.fullscreenChangeHandler);
      this.fullscreenChangeHandler = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
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
