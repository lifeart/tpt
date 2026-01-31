import { i18n, type Translations } from "../i18n";
import { createFocusTrap, type FocusTrap } from "../focus-trap";

// Help Modal Component (moved from TeleprompterControls)
export class HelpModal {
  private overlay: HTMLDivElement;
  private isVisible: boolean = false;
  private escKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private questionKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private i18nUnsubscribe: (() => void) | null = null;
  private focusTrap: FocusTrap | null = null;

  constructor(container: HTMLElement) {
    this.overlay = document.createElement("div");
    this.overlay.className = "help-modal-overlay";
    this.overlay.dataset.testid = "help-modal";
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-modal", "true");
    this.overlay.setAttribute("aria-labelledby", "help-modal-title");

    this.overlay.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("help-modal-close") || target === this.overlay) {
        this.hide();
      }
    });

    this.renderContent();
    container.appendChild(this.overlay);

    // Create focus trap for modal
    this.focusTrap = createFocusTrap(this.overlay);

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
    closeBtn.dataset.action = "close-help";
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
      { desc: i18n.t('shortcutToggleCuePoint'), keys: ['M'] },
      { desc: i18n.t('shortcutJumpToCuePoint'), keys: ['Shift', '↑', '↓'] },
      { desc: i18n.t('shortcutShowHelp'), keys: ['?'] },
      { desc: i18n.t('shortcutCloseDialog'), keys: ['Esc'] },
      { desc: i18n.t('doubleClickToEdit'), keys: ['Double-click'] },
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

    // Activate focus trap
    if (this.focusTrap) {
      this.focusTrap.activate();
    }

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

    // Deactivate focus trap (restores focus to previous element)
    if (this.focusTrap) {
      this.focusTrap.deactivate();
    }

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
