import { TeleprompterState } from "./state";
import { TeleprompterDisplay } from "./components/TeleprompterDisplay";
import { FloatingToolbar } from "./components/FloatingToolbar";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { ScriptEditor } from "./components/ScriptEditor";
import { HelpModal } from "./components/HelpModal";
import { RemoteChannel, type RemoteState, type RemoteCommand } from "./remote-channel";
import { GamepadManager } from "./gamepad";
import { CONFIG } from "./config";
import { splitTextIntoLines } from "./utils";
import type { PageChangedDetail } from "./types";

// Main Teleprompter App (New UI with Floating Toolbar + Drawer)
export class TeleprompterApp {
  private appElement: HTMLDivElement;
  private mainContainer: HTMLElement | null = null;
  private state: TeleprompterState;
  private display: TeleprompterDisplay | null = null;
  private toolbar: FloatingToolbar | null = null;
  private drawer: SettingsDrawer | null = null;
  private editor: ScriptEditor | null = null;
  private helpModal: HelpModal | null = null;
  private remoteChannel: RemoteChannel | null = null;
  private gamepadManager: GamepadManager | null = null;
  private talentWindow: Window | null = null;
  private talentChannel: BroadcastChannel | null = null;
  private toggleScrollingHandler: (() => void) | null = null;
  private speedChangedHandler: (() => void) | null = null;
  private drawerOpenedHandler: (() => void) | null = null;
  private drawerClosedHandler: (() => void) | null = null;
  private pageChangedHandler: ((e: CustomEvent<PageChangedDetail>) => void) | null = null;
  private settingsChangedHandler: (() => void) | null = null;
  private scrollingToggledHandler: (() => void) | null = null;

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
    this.mainContainer = document.createElement("main");
    this.mainContainer.id = "main-content";
    this.mainContainer.className = "flex flex-col h-screen";
    this.mainContainer.dataset.teleprompterMain = "true";
    this.mainContainer.setAttribute("aria-label", "Teleprompter display");

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
      onRemoteClick: () => this.openRemoteControl(),
    });

    // Initialize settings drawer
    this.drawer = new SettingsDrawer(document.body, this.state, () => {
      if (this.display) {
        this.display.updateStyles();
      }
      // Update duration when settings change (e.g., maxWordsPerLine)
      if (this.toolbar) {
        this.toolbar.updateDuration();
      }
      // Auto-save settings to localStorage
      this.state.saveSettings();
    });

    // Initialize script editor
    this.editor = new ScriptEditor(document.body, this.state, () => {
      // Update toolbar duration when text changes
      if (this.toolbar) {
        this.toolbar.updateDuration();
      }
      // Reset scroll position to top when text changes
      // (back-to-top handler calls updateTelepromptText and updateStyles)
      document.dispatchEvent(new CustomEvent("back-to-top"));
    });

    // Initialize help modal
    this.helpModal = new HelpModal(document.body);

    // Initialize remote control channel
    this.initializeRemoteControl();

    // Initialize gamepad support
    this.initializeGamepad();

    // Initialize talent display channel
    this.initializeTalentChannel();
  }

  private initializeRemoteControl() {
    this.remoteChannel = new RemoteChannel(true); // true = main window

    // Handle commands from remote
    this.remoteChannel.onCommand((command: RemoteCommand) => {
      this.handleRemoteCommand(command);
    });

    // Start broadcasting state to remotes
    this.remoteChannel.startStateBroadcasting(() => this.getRemoteState());
  }

  // Shared speed adjustment method to avoid duplication
  private adjustSpeed(delta: number) {
    const newSpeed = this.state.scrollSpeed + delta;
    this.state.scrollSpeed = Math.round(
      Math.max(CONFIG.SCROLL_SPEED.MIN, Math.min(CONFIG.SCROLL_SPEED.MAX, newSpeed)) * 10
    ) / 10;
    document.dispatchEvent(new CustomEvent("speed-changed"));
    this.state.saveSettings();
  }

  private handleRemoteCommand(command: RemoteCommand) {
    switch (command.type) {
      case 'play':
        if (!this.state.isScrolling) {
          document.dispatchEvent(new CustomEvent("toggle-scrolling"));
        }
        break;
      case 'pause':
        if (this.state.isScrolling) {
          document.dispatchEvent(new CustomEvent("toggle-scrolling"));
        }
        break;
      case 'toggle':
        document.dispatchEvent(new CustomEvent("toggle-scrolling"));
        break;
      case 'speed-up':
        this.adjustSpeed(CONFIG.SCROLL_SPEED.STEP);
        break;
      case 'speed-down':
        this.adjustSpeed(-CONFIG.SCROLL_SPEED.STEP);
        break;
      case 'reset':
        document.dispatchEvent(new CustomEvent("back-to-top"));
        break;
      case 'jump-cue':
        const cuePointsArray = Array.from(this.state.cuePoints).sort((a, b) => a - b);
        if (command.cueIndex >= 0 && command.cueIndex < cuePointsArray.length) {
          const lineIndex = cuePointsArray[command.cueIndex];
          this.state.activeLineIndex = lineIndex;
          // The display will handle scrolling to this line
          if (this.display) {
            this.display.updateTelepromptText();
          }
        }
        break;
      case 'advance-page':
        if (this.state.scrollMode === 'paging') {
          document.dispatchEvent(new CustomEvent("advance-page", {
            detail: { direction: command.direction }
          }));
        }
        break;
    }
  }

  private getRemoteState(): RemoteState {
    const lines = splitTextIntoLines(this.state.text, this.state.maxWordsPerLine);
    const totalLines = lines.length || 1;
    const progress = (this.state.activeLineIndex / totalLines) * 100;

    return {
      isScrolling: this.state.isScrolling,
      speed: this.state.scrollSpeed,
      progress: Math.min(100, Math.max(0, progress)),
      currentLine: this.state.activeLineIndex,
      totalLines: totalLines,
      cuePoints: Array.from(this.state.cuePoints).sort((a, b) => a - b),
      scrollMode: this.state.scrollMode,
      currentPage: this.state.currentPage,
      totalPages: Math.max(1, Math.ceil(totalLines / 10)), // Rough estimate
    };
  }

  private initializeGamepad() {
    this.gamepadManager = new GamepadManager({
      onPlayPause: () => {
        document.dispatchEvent(new CustomEvent("toggle-scrolling"));
      },
      onReset: () => {
        document.dispatchEvent(new CustomEvent("back-to-top"));
      },
      onSpeedUp: () => {
        this.adjustSpeed(CONFIG.SCROLL_SPEED.STEP);
      },
      onSpeedDown: () => {
        this.adjustSpeed(-CONFIG.SCROLL_SPEED.STEP);
      },
      onNavigateUp: () => {
        if (!this.state.isScrolling) {
          this.state.activeLineIndex = Math.max(0, this.state.activeLineIndex - 1);
          if (this.display) {
            this.display.updateTelepromptText();
          }
        }
      },
      onNavigateDown: () => {
        if (!this.state.isScrolling) {
          const lines = splitTextIntoLines(this.state.text, this.state.maxWordsPerLine);
          this.state.activeLineIndex = Math.min(lines.length - 1, this.state.activeLineIndex + 1);
          if (this.display) {
            this.display.updateTelepromptText();
          }
        }
      },
      onPrevCue: () => {
        const cuePointsArray = Array.from(this.state.cuePoints).sort((a, b) => a - b);
        for (let i = cuePointsArray.length - 1; i >= 0; i--) {
          if (cuePointsArray[i] < this.state.activeLineIndex) {
            this.state.activeLineIndex = cuePointsArray[i];
            if (this.display) {
              this.display.updateTelepromptText();
            }
            break;
          }
        }
      },
      onNextCue: () => {
        const cuePointsArray = Array.from(this.state.cuePoints).sort((a, b) => a - b);
        for (let i = 0; i < cuePointsArray.length; i++) {
          if (cuePointsArray[i] > this.state.activeLineIndex) {
            this.state.activeLineIndex = cuePointsArray[i];
            if (this.display) {
              this.display.updateTelepromptText();
            }
            break;
          }
        }
      },
    });
  }

  private initializeTalentChannel() {
    if (typeof BroadcastChannel === 'undefined') return;

    this.talentChannel = new BroadcastChannel('tpt-talent');

    this.talentChannel.onmessage = (event) => {
      if (event.data.type === 'ready') {
        // Talent window is ready, send current state
        this.broadcastTalentState();
      }
    };

    // Listen for state changes to broadcast to talent window
    this.settingsChangedHandler = () => {
      this.broadcastTalentState();
    };
    document.addEventListener("settings-changed", this.settingsChangedHandler);

    this.scrollingToggledHandler = () => {
      this.broadcastTalentState();
    };
    document.addEventListener("scrolling-toggled", this.scrollingToggledHandler);
  }

  private broadcastTalentState() {
    if (!this.talentChannel) return;

    // Get current transform from display
    const textInner = this.mainContainer?.querySelector('.teleprompt-text-inner') as HTMLElement;
    const transform = textInner?.style.transform || '';
    const translateYMatch = transform.match(/translateY\((-?[\d.]+)px\)/);
    const translateY = translateYMatch ? parseFloat(translateYMatch[1]) : 0;

    this.talentChannel.postMessage({
      type: 'state',
      payload: {
        text: this.state.text,
        fontSize: this.state.fontSize,
        fontFamily: this.state.fontFamily,
        fontColor: this.state.fontColor,
        backgroundColor: this.state.backgroundColor,
        lineSpacing: this.state.lineSpacing,
        letterSpacing: this.state.letterSpacing,
        isFlipped: this.state.isFlipped,
        isFlippedVertical: this.state.isFlippedVertical,
        maxWordsPerLine: this.state.maxWordsPerLine,
        readingGuideEnabled: this.state.readingGuideEnabled,
        activeLineIndex: this.state.activeLineIndex,
        translateY: translateY,
        overlayOpacity: this.state.overlayOpacity,
        horizontalMargin: this.state.horizontalMargin,
        textDirection: this.state.textDirection,
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

    // Handle page changes from paging mode
    this.pageChangedHandler = (e: CustomEvent<PageChangedDetail>) => {
      if (this.toolbar) {
        this.toolbar.updatePageInfo(e.detail.currentPage, e.detail.totalPages);
      }
    };
    document.addEventListener("page-changed", this.pageChangedHandler as EventListener);
  }

  private openRemoteControl() {
    // Open remote control in a new tab
    const basePath = window.location.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
    const remoteUrl = `${window.location.origin}${basePath}/remote.html`;
    window.open(remoteUrl, 'tpt-remote', 'width=400,height=600');
  }

  openTalentDisplay() {
    // Open talent display in a new window
    const basePath = window.location.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
    const talentUrl = `${window.location.origin}${basePath}/talent.html`;
    this.talentWindow = window.open(talentUrl, 'tpt-talent', 'width=800,height=600');
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
    if (this.pageChangedHandler) {
      document.removeEventListener("page-changed", this.pageChangedHandler as EventListener);
      this.pageChangedHandler = null;
    }
    if (this.settingsChangedHandler) {
      document.removeEventListener("settings-changed", this.settingsChangedHandler);
      this.settingsChangedHandler = null;
    }
    if (this.scrollingToggledHandler) {
      document.removeEventListener("scrolling-toggled", this.scrollingToggledHandler);
      this.scrollingToggledHandler = null;
    }
    if (this.remoteChannel) {
      this.remoteChannel.destroy();
      this.remoteChannel = null;
    }
    if (this.gamepadManager) {
      this.gamepadManager.destroy();
      this.gamepadManager = null;
    }
    if (this.talentChannel) {
      this.talentChannel.close();
      this.talentChannel = null;
    }
    if (this.talentWindow && !this.talentWindow.closed) {
      this.talentWindow.close();
      this.talentWindow = null;
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
