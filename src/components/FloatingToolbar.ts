import { CONFIG } from "../config";
import {
  editIcon,
  restartIcon,
  fullscreenEnterIcon,
  fullscreenExitIcon,
  settingsIcon,
  helpIcon,
} from "../icons";
import { i18n } from "../i18n";
import type { TeleprompterState } from "../state";
import type { ScrollingToggledDetail } from "../types";
import { calculateDuration, formatDuration } from "../utils";

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
    this.element = document.createElement("nav");
    this.element.className = "floating-toolbar";
    this.element.setAttribute("role", "toolbar");
    this.element.setAttribute("aria-label", "Main toolbar");

    // Create buttons
    this.editBtn = this.createButton("toolbar-btn toolbar-btn-edit toolbar-btn-icon", editIcon, i18n.t('edit'));
    this.restartBtn = this.createButton("toolbar-btn toolbar-btn-restart toolbar-btn-icon", restartIcon, i18n.t('backToTop'));
    this.playPauseBtn = this.createButton("toolbar-btn toolbar-btn-play", "", i18n.t('play'));
    this.playPauseBtn.textContent = i18n.t('play');

    // Speed control
    const speedControl = document.createElement("div");
    speedControl.className = "speed-control";
    speedControl.setAttribute("role", "group");
    speedControl.setAttribute("aria-label", "Speed control");

    this.speedMinusBtn = document.createElement("button");
    this.speedMinusBtn.className = "speed-btn";
    this.speedMinusBtn.textContent = "−";
    this.speedMinusBtn.setAttribute("aria-label", i18n.t('decreaseSpeed'));
    this.speedMinusBtn.type = "button";

    this.speedValue = document.createElement("span");
    this.speedValue.className = "speed-value";
    this.speedValue.textContent = `${this.state.scrollSpeed}x`;
    this.speedValue.setAttribute("aria-live", "polite");
    this.speedValue.setAttribute("aria-atomic", "true");

    this.speedPlusBtn = document.createElement("button");
    this.speedPlusBtn.className = "speed-btn";
    this.speedPlusBtn.textContent = "+";
    this.speedPlusBtn.setAttribute("aria-label", i18n.t('increaseSpeed'));
    this.speedPlusBtn.type = "button";

    speedControl.appendChild(this.speedMinusBtn);
    speedControl.appendChild(this.speedValue);
    speedControl.appendChild(this.speedPlusBtn);

    // Duration display
    this.durationDisplay = document.createElement("span");
    this.durationDisplay.className = "toolbar-duration";
    this.updateDurationDisplay();

    this.fullscreenBtn = this.createButton("toolbar-btn toolbar-btn-fullscreen toolbar-btn-icon", fullscreenEnterIcon, i18n.t('toggleFullscreen'));
    this.settingsBtn = this.createButton("toolbar-btn toolbar-btn-settings toolbar-btn-icon", settingsIcon, i18n.t('settings'));
    this.helpBtn = this.createButton("toolbar-btn toolbar-btn-help toolbar-btn-icon", helpIcon, i18n.t('helpKeyboardShortcuts'));

    // Append all elements
    this.element.appendChild(this.editBtn);
    this.element.appendChild(this.restartBtn);
    this.element.appendChild(this.playPauseBtn);
    this.element.appendChild(speedControl);
    this.element.appendChild(this.durationDisplay);
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
    btn.type = "button";
    btn.innerHTML = iconHtml;
    btn.setAttribute("aria-label", ariaLabel);
    return btn;
  }

  private updateLabels() {
    this.editBtn.setAttribute("aria-label", i18n.t('edit'));
    this.restartBtn.setAttribute("aria-label", i18n.t('backToTop'));
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

    // Listen for fullscreen changes (standard + Safari)
    this.fullscreenChangeHandler = () => {
      this.updateFullscreenIcon();
    };
    document.addEventListener("fullscreenchange", this.fullscreenChangeHandler);
    document.addEventListener("webkitfullscreenchange", this.fullscreenChangeHandler);
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

  private updateSpeedDisplay() {
    this.speedValue.textContent = `${this.state.scrollSpeed}x`;
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
      document.removeEventListener("webkitfullscreenchange", this.fullscreenChangeHandler);
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
