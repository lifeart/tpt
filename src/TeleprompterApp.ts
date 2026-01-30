import { TeleprompterState } from "./state";
import { TeleprompterDisplay } from "./components/TeleprompterDisplay";
import { FloatingToolbar } from "./components/FloatingToolbar";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { ScriptEditor } from "./components/ScriptEditor";
import { HelpModal } from "./components/HelpModal";

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
    this.mainContainer = document.createElement("main");
    this.mainContainer.className = "flex flex-col h-screen";
    this.mainContainer.dataset.teleprompterMain = "true";
    this.mainContainer.setAttribute("role", "main");

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
      // Update duration when settings change (e.g., maxWordsPerLine)
      if (this.toolbar) {
        this.toolbar.updateDuration();
      }
      // Auto-save settings to localStorage
      this.state.saveSettings();
    });

    // Initialize script editor
    this.editor = new ScriptEditor(document.body, this.state, () => {
      if (this.display) {
        this.display.updateTelepromptText();
        this.display.updateStyles();
      }
      // Update toolbar duration when text changes
      if (this.toolbar) {
        this.toolbar.updateDuration();
      }
      // Reset scroll position to top when text changes
      document.dispatchEvent(new CustomEvent("back-to-top"));
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
