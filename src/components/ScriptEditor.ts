import { CONFIG } from "../config";
import { closeIcon } from "../icons";
import { i18n } from "../i18n";
import type { TeleprompterState } from "../state";
import { calculateDuration, formatDuration, exportScript, importScript, exportSRT, splitTextIntoLines } from "../utils";
import { createFocusTrap, type FocusTrap } from "../focus-trap";

// Script Editor Component (Full-screen overlay)
export class ScriptEditor {
  private overlay: HTMLDivElement;
  private textarea: HTMLTextAreaElement;
  private charCount: HTMLDivElement;
  private state: TeleprompterState;
  private onSave: () => void;
  private isOpen: boolean = false;
  private escKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private i18nUnsubscribe: (() => void) | null = null;
  private closeBtn: HTMLButtonElement;
  private titleSpan: HTMLHeadingElement;
  private saveBtn: HTMLButtonElement;
  private importBtn: HTMLButtonElement;
  private exportBtn: HTMLButtonElement;
  private exportSRTBtn: HTMLButtonElement;
  private focusTrap: FocusTrap | null = null;

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
    this.overlay.dataset.testid = "script-editor";
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-modal", "true");
    this.overlay.setAttribute("aria-labelledby", "editor-title");

    // Header
    const header = document.createElement("header");
    header.className = "editor-header";

    this.closeBtn = document.createElement("button");
    this.closeBtn.className = "editor-close-btn";
    this.closeBtn.type = "button";
    this.closeBtn.dataset.action = "close-editor";
    this.closeBtn.setAttribute("aria-label", i18n.t('close'));
    this.closeBtn.innerHTML = closeIcon;
    const closeText = document.createElement("span");
    closeText.textContent = i18n.t('close');
    this.closeBtn.appendChild(closeText);
    this.closeBtn.addEventListener("click", () => this.close());

    this.titleSpan = document.createElement("h1");
    this.titleSpan.className = "editor-title";
    this.titleSpan.id = "editor-title";
    this.titleSpan.textContent = i18n.t('editScript');

    this.saveBtn = document.createElement("button");
    this.saveBtn.className = "editor-save-btn";
    this.saveBtn.type = "button";
    this.saveBtn.dataset.action = "save-close";
    this.saveBtn.textContent = i18n.t('saveAndClose');
    this.saveBtn.addEventListener("click", () => this.saveAndClose());

    header.appendChild(this.closeBtn);
    header.appendChild(this.titleSpan);
    header.appendChild(this.saveBtn);
    this.overlay.appendChild(header);

    // Textarea container
    const textareaContainer = document.createElement("div");
    textareaContainer.className = "editor-textarea-container";

    // Import/Export toolbar
    const editorToolbar = document.createElement("div");
    editorToolbar.className = "editor-toolbar";

    this.importBtn = document.createElement("button");
    this.importBtn.className = "editor-toolbar-btn";
    this.importBtn.type = "button";
    this.importBtn.dataset.action = "import";
    this.importBtn.textContent = i18n.t('importScript');
    this.importBtn.setAttribute("data-tooltip", i18n.t('tooltipImport'));
    this.importBtn.addEventListener("click", () => this.handleImport());

    this.exportBtn = document.createElement("button");
    this.exportBtn.className = "editor-toolbar-btn";
    this.exportBtn.type = "button";
    this.exportBtn.dataset.action = "export";
    this.exportBtn.textContent = i18n.t('exportScript');
    this.exportBtn.setAttribute("data-tooltip", i18n.t('tooltipExport'));
    this.exportBtn.addEventListener("click", () => this.handleExport());

    this.exportSRTBtn = document.createElement("button");
    this.exportSRTBtn.className = "editor-toolbar-btn";
    this.exportSRTBtn.type = "button";
    this.exportSRTBtn.dataset.action = "export-srt";
    this.exportSRTBtn.textContent = i18n.t('exportSRT');
    this.exportSRTBtn.setAttribute("data-tooltip", i18n.t('tooltipExportSRT'));
    this.exportSRTBtn.addEventListener("click", () => this.handleExportSRT());

    editorToolbar.appendChild(this.importBtn);
    editorToolbar.appendChild(this.exportBtn);
    editorToolbar.appendChild(this.exportSRTBtn);
    textareaContainer.appendChild(editorToolbar);

    this.textarea = document.createElement("textarea");
    this.textarea.className = "editor-textarea";
    this.textarea.dataset.testid = "script-textarea";
    this.textarea.value = this.state.text;
    this.textarea.placeholder = i18n.t('script');
    this.textarea.addEventListener("input", () => {
      this.updateCharCount();
    });

    this.charCount = document.createElement("div");
    this.charCount.className = "editor-char-count";
    this.charCount.dataset.testid = "char-count";
    this.updateCharCount();

    textareaContainer.appendChild(this.textarea);
    textareaContainer.appendChild(this.charCount);
    this.overlay.appendChild(textareaContainer);

    container.appendChild(this.overlay);

    // Create focus trap for editor
    this.focusTrap = createFocusTrap(this.overlay);

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
    this.importBtn.textContent = i18n.t('importScript');
    this.importBtn.setAttribute("data-tooltip", i18n.t('tooltipImport'));
    this.exportBtn.textContent = i18n.t('exportScript');
    this.exportBtn.setAttribute("data-tooltip", i18n.t('tooltipExport'));
    this.exportSRTBtn.textContent = i18n.t('exportSRT');
    this.exportSRTBtn.setAttribute("data-tooltip", i18n.t('tooltipExportSRT'));
    this.textarea.placeholder = i18n.t('script');
    this.updateCharCount();
  }

  private updateCharCount() {
    const text = this.textarea.value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.split("\n").length;
    const duration = calculateDuration(text, this.state.scrollSpeed, this.state.maxWordsPerLine);
    const durationStr = formatDuration(duration.minutes, duration.seconds);
    this.charCount.textContent = `${chars} ${i18n.t('chars')} · ${words} ${i18n.t('words')} · ${lines} ${i18n.t('lines')} · ${i18n.t('estimatedDuration')}: ${durationStr}`;
  }

  open() {
    this.isOpen = true;
    this.textarea.value = this.state.text;
    this.updateCharCount();
    this.overlay.classList.add("open");

    // Activate focus trap
    if (this.focusTrap) {
      this.focusTrap.activate();
    }

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

    // Deactivate focus trap (restores focus to previous element)
    if (this.focusTrap) {
      this.focusTrap.deactivate();
    }

    if (this.escKeyHandler) {
      document.removeEventListener("keydown", this.escKeyHandler);
      this.escKeyHandler = null;
    }
  }

  private save() {
    this.state.text = this.textarea.value;
    this.state.scriptEnded = false;

    // Clear cue points that are beyond the new DISPLAY line count
    // (cue points are stored as split line indices, not original line indices)
    const displayLineCount = splitTextIntoLines(this.state.text, this.state.maxWordsPerLine).length;
    const invalidCuePoints = Array.from(this.state.cuePoints).filter(index => index >= displayLineCount);
    invalidCuePoints.forEach(index => this.state.cuePoints.delete(index));

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
    // Set isOpen to false before close() to prevent double-save,
    // since close() calls save() only when isOpen is true
    this.isOpen = false;
    this.close();
  }

  private handleImport() {
    importScript().then((text) => {
      this.textarea.value = text;
      this.updateCharCount();
    }).catch((error) => {
      console.warn("Could not import script:", error);
    });
  }

  private handleExport() {
    exportScript(this.textarea.value, 'teleprompter-script.txt');
  }

  private handleExportSRT() {
    exportSRT(
      this.textarea.value,
      this.state.scrollSpeed,
      this.state.maxWordsPerLine,
      'teleprompter-subtitles.srt'
    );
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
