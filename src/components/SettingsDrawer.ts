import { CONFIG } from "../config";
import { fontFamilyMap } from "../fonts";
import { i18n } from "../i18n";
import type { Locale } from "../i18n";
import type { TeleprompterState } from "../state";
import { formatLabel } from "../utils";

// Settings Drawer Component
export class SettingsDrawer {
  private backdrop: HTMLDivElement;
  private drawer: HTMLDivElement;
  private state: TeleprompterState;
  private onStateChange: () => void;
  private isOpen: boolean = false;
  private activeTab: string = "display";
  private i18nUnsubscribe: (() => void) | null = null;
  private settingsChangedHandler: (() => void) | null = null;
  private escKeyHandler: ((e: KeyboardEvent) => void) | null = null;

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
    this.backdrop.setAttribute("aria-hidden", "true");
    this.backdrop.addEventListener("click", () => this.close());

    // Create drawer
    this.drawer = document.createElement("div");
    this.drawer.className = "settings-drawer";
    this.drawer.setAttribute("role", "dialog");
    this.drawer.setAttribute("aria-modal", "true");
    this.drawer.setAttribute("aria-label", i18n.t('settings'));

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
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Settings tabs");

    const tabNames = [
      { id: "display", label: i18n.t('display') },
      { id: "typography", label: i18n.t('typography') },
      { id: "general", label: i18n.t('general') },
    ];

    this.tabButtons = tabNames.map(({ id, label }) => {
      const btn = document.createElement("button");
      btn.className = `drawer-tab${id === this.activeTab ? " active" : ""}`;
      btn.type = "button";
      btn.textContent = label;
      btn.dataset.tab = id;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(id === this.activeTab));
      btn.setAttribute("aria-controls", `panel-${id}`);
      btn.id = `tab-${id}`;
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
    this.closeBtn.type = "button";
    this.closeBtn.textContent = i18n.t('closeDrawer');
    this.closeBtn.addEventListener("click", () => this.close());

    const closeContainer = document.createElement("div");
    closeContainer.style.padding = "12px 16px 16px";
    closeContainer.appendChild(this.closeBtn);
    this.drawer.appendChild(closeContainer);
  }

  private createPanel(id: string): HTMLDivElement {
    const panel = document.createElement("div");
    panel.className = `drawer-tab-panel${id === this.activeTab ? " active" : ""}`;
    panel.dataset.panel = id;
    panel.id = `panel-${id}`;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", `tab-${id}`);
    panel.tabIndex = 0;
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
    const fontColorLabel = document.createElement("label");
    fontColorLabel.className = "sr-only";
    fontColorLabel.textContent = i18n.t('fontColor');
    const fontColorInput = document.createElement("input");
    fontColorInput.type = "color";
    fontColorInput.className = "settings-color-input";
    fontColorInput.value = this.state.fontColor;
    fontColorInput.id = "font-color-input";
    fontColorLabel.htmlFor = "font-color-input";
    fontColorInput.setAttribute("aria-label", i18n.t('fontColor'));
    fontColorInput.addEventListener("change", () => {
      this.state.fontColor = fontColorInput.value;
      this.onStateChange();
    });
    fontColorItem.appendChild(fontColorLabel);
    fontColorItem.appendChild(fontColorInput);

    // Background color
    const bgColorItem = document.createElement("div");
    bgColorItem.className = "settings-color-item";
    const bgColorLabel = document.createElement("label");
    bgColorLabel.className = "sr-only";
    bgColorLabel.textContent = i18n.t('backgroundColor');
    const bgColorInput = document.createElement("input");
    bgColorInput.type = "color";
    bgColorInput.className = "settings-color-input";
    bgColorInput.value = this.state.backgroundColor;
    bgColorInput.id = "bg-color-input";
    bgColorLabel.htmlFor = "bg-color-input";
    bgColorInput.setAttribute("aria-label", i18n.t('backgroundColor'));
    bgColorInput.addEventListener("change", () => {
      this.state.backgroundColor = bgColorInput.value;
      this.onStateChange();
    });
    bgColorItem.appendChild(bgColorLabel);
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

    // Reading guide row
    const readingGuideRow = document.createElement("div");
    readingGuideRow.className = "flip-control-row";

    const readingGuideLabelContainer = document.createElement("div");
    readingGuideLabelContainer.className = "flip-control-label";

    const readingGuideTitleId = "reading-guide-title";
    const readingGuideDescId = "reading-guide-desc";

    const readingGuideTitle = document.createElement("span");
    readingGuideTitle.className = "flip-control-title";
    readingGuideTitle.id = readingGuideTitleId;
    readingGuideTitle.textContent = i18n.t('readingGuide');

    const readingGuideSubtitle = document.createElement("span");
    readingGuideSubtitle.className = "flip-control-subtitle";
    readingGuideSubtitle.id = readingGuideDescId;
    readingGuideSubtitle.textContent = i18n.t('readingGuideDescription');

    readingGuideLabelContainer.appendChild(readingGuideTitle);
    readingGuideLabelContainer.appendChild(readingGuideSubtitle);

    const readingGuideToggle = document.createElement("label");
    readingGuideToggle.className = "toggle-switch";
    const readingGuideInput = document.createElement("input");
    readingGuideInput.type = "checkbox";
    readingGuideInput.checked = this.state.readingGuideEnabled;
    readingGuideInput.setAttribute("role", "switch");
    readingGuideInput.setAttribute("aria-checked", String(this.state.readingGuideEnabled));
    readingGuideInput.setAttribute("aria-labelledby", readingGuideTitleId);
    readingGuideInput.setAttribute("aria-describedby", readingGuideDescId);
    readingGuideInput.addEventListener("change", () => {
      this.state.readingGuideEnabled = readingGuideInput.checked;
      readingGuideInput.setAttribute("aria-checked", String(readingGuideInput.checked));
      this.onStateChange();
    });
    const readingGuideSlider = document.createElement("span");
    readingGuideSlider.className = "toggle-slider";
    readingGuideSlider.setAttribute("aria-hidden", "true");
    readingGuideToggle.appendChild(readingGuideInput);
    readingGuideToggle.appendChild(readingGuideSlider);

    readingGuideRow.appendChild(readingGuideLabelContainer);
    readingGuideRow.appendChild(readingGuideToggle);
    flipGroup.appendChild(readingGuideRow);

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

    const fontOptions = Object.keys(fontFamilyMap);

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

    const fontFamilyRow = document.createElement("div");
    fontFamilyRow.className = "settings-row";
    fontFamilyRow.appendChild(fontFamilySelect);

    fontFamilyGroup.appendChild(fontFamilyLabel);
    fontFamilyGroup.appendChild(fontFamilyRow);
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

    const lineSpacingRow = document.createElement("div");
    lineSpacingRow.className = "settings-row";
    lineSpacingRow.appendChild(this.lineSpacingInput);

    lineSpacingGroup.appendChild(this.lineSpacingLabel);
    lineSpacingGroup.appendChild(lineSpacingRow);
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

    const letterSpacingRow = document.createElement("div");
    letterSpacingRow.className = "settings-row";
    letterSpacingRow.appendChild(this.letterSpacingInput);

    letterSpacingGroup.appendChild(this.letterSpacingLabel);
    letterSpacingGroup.appendChild(letterSpacingRow);
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
      // Clamp value between MIN and MAX
      this.state.maxWordsPerLine = Number.isNaN(value) || value < CONFIG.MAX_WORDS_PER_LINE.MIN ? CONFIG.MAX_WORDS_PER_LINE.MIN : Math.min(Math.floor(value), CONFIG.MAX_WORDS_PER_LINE.MAX);
      this.maxWordsPerLineLabel!.textContent = formatLabel('maxWordsPerLine', this.state.maxWordsPerLine);
      this.onStateChange();
    });

    const maxWordsRow = document.createElement("div");
    maxWordsRow.className = "settings-row";
    maxWordsRow.appendChild(this.maxWordsPerLineInput);

    maxWordsGroup.appendChild(this.maxWordsPerLineLabel);
    maxWordsGroup.appendChild(maxWordsRow);
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

    const scrollSpeedRow = document.createElement("div");
    scrollSpeedRow.className = "settings-row";
    scrollSpeedRow.appendChild(this.scrollSpeedInput);

    scrollSpeedGroup.appendChild(this.scrollSpeedLabel);
    scrollSpeedGroup.appendChild(scrollSpeedRow);
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

    const languageRow = document.createElement("div");
    languageRow.className = "settings-row";
    languageRow.appendChild(languageSelect);

    languageGroup.appendChild(languageLabel);
    languageGroup.appendChild(languageRow);
    panel.appendChild(languageGroup);

    // Back to Top button
    const backToTopGroup = this.createSettingsGroup();
    const backToTopBtn = document.createElement("button");
    backToTopBtn.className = "drawer-close-btn";
    backToTopBtn.type = "button";
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
      const isActive = btn.dataset.tab === tabId;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
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

    // Setup ESC key handler
    this.escKeyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    };
    document.addEventListener("keydown", this.escKeyHandler);

    // Notify that drawer is open (for teleprompter container resizing)
    document.dispatchEvent(new CustomEvent("drawer-opened"));
  }

  close() {
    this.isOpen = false;
    this.backdrop.classList.remove("open");
    this.drawer.classList.remove("open");

    // Remove ESC key handler
    if (this.escKeyHandler) {
      document.removeEventListener("keydown", this.escKeyHandler);
      this.escKeyHandler = null;
    }

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
    if (this.escKeyHandler) {
      document.removeEventListener("keydown", this.escKeyHandler);
      this.escKeyHandler = null;
    }
    if (this.backdrop && this.backdrop.parentNode) {
      this.backdrop.parentNode.removeChild(this.backdrop);
    }
    if (this.drawer && this.drawer.parentNode) {
      this.drawer.parentNode.removeChild(this.drawer);
    }
  }
}
