import { CONFIG } from "../config";
import { fontFamilyMap } from "../fonts";
import { i18n } from "../i18n";
import type { Locale } from "../i18n";
import type { TeleprompterState } from "../state";
import type { ScrollMode, TextDirection } from "../types";
import { formatLabel, getContrastRatio, normalizeHexColor } from "../utils";
import { THEME_PRESETS, getContrastLevel } from "../themes";
import { createFocusTrap, type FocusTrap } from "../focus-trap";

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
  private horizontalMarginInput: HTMLInputElement | null = null;
  private horizontalMarginLabel: HTMLLabelElement | null = null;
  private overlayOpacityInput: HTMLInputElement | null = null;
  private overlayOpacityLabel: HTMLLabelElement | null = null;
  private contrastIndicator: HTMLSpanElement | null = null;
  private tabButtons: HTMLButtonElement[] = [];
  private closeBtn: HTMLButtonElement | null = null;
  private resetBtn: HTMLButtonElement | null = null;
  private focusTrap: FocusTrap | null = null;

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

    // Create focus trap for drawer
    this.focusTrap = createFocusTrap(this.drawer);

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

    // Bottom buttons container
    const bottomContainer = document.createElement("div");
    bottomContainer.className = "drawer-bottom-buttons";
    bottomContainer.style.padding = "12px 16px 16px";
    bottomContainer.style.display = "flex";
    bottomContainer.style.gap = "12px";

    // Reset to defaults button
    this.resetBtn = document.createElement("button");
    this.resetBtn.className = "drawer-reset-btn";
    this.resetBtn.type = "button";
    this.resetBtn.textContent = i18n.t('resetToDefaults');
    this.resetBtn.addEventListener("click", () => this.resetToDefaults());
    bottomContainer.appendChild(this.resetBtn);

    // Close button
    this.closeBtn = document.createElement("button");
    this.closeBtn.className = "drawer-close-btn";
    this.closeBtn.type = "button";
    this.closeBtn.textContent = i18n.t('closeDrawer');
    this.closeBtn.addEventListener("click", () => this.close());
    bottomContainer.appendChild(this.closeBtn);

    this.drawer.appendChild(bottomContainer);
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
    // Orchestrator method - delegates to helper methods for each control group
    panel.appendChild(this.createFontSizeControl());
    panel.appendChild(this.createColorsControl());
    panel.appendChild(this.createFlipControlsGroup());
    panel.appendChild(this.createThemePresetsControl());
    panel.appendChild(this.createOverlayOpacityControl());
    panel.appendChild(this.createHorizontalMarginControl());
  }

  private createFontSizeControl(): HTMLDivElement {
    const group = this.createSettingsGroup();
    this.fontSizeLabel = document.createElement("label");
    this.fontSizeLabel.className = "settings-label";
    this.fontSizeLabel.textContent = formatLabel('fontSize', this.state.fontSize, 'px');

    const row = document.createElement("div");
    row.className = "settings-row";

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

    row.appendChild(this.fontSizeInput);
    group.appendChild(this.fontSizeLabel);
    group.appendChild(row);
    return group;
  }

  private createColorsControl(): HTMLDivElement {
    const group = this.createSettingsGroup();
    const label = document.createElement("label");
    label.className = "settings-label";
    label.textContent = `${i18n.t('fontColor')} / ${i18n.t('backgroundColor')}`;

    const row = document.createElement("div");
    row.className = "settings-color-row";

    // Font color
    const fontColorItem = this.createColorInput(
      "font-color-input",
      i18n.t('fontColor'),
      this.state.fontColor,
      (value) => {
        const validColor = normalizeHexColor(value);
        if (validColor) {
          this.state.fontColor = validColor;
          this.onStateChange();
          this.updateContrastIndicator();
        }
      }
    );

    // Background color
    const bgColorItem = this.createColorInput(
      "bg-color-input",
      i18n.t('backgroundColor'),
      this.state.backgroundColor,
      (value) => {
        const validColor = normalizeHexColor(value);
        if (validColor) {
          this.state.backgroundColor = validColor;
          this.onStateChange();
          this.updateContrastIndicator();
        }
      }
    );

    row.appendChild(fontColorItem);
    row.appendChild(bgColorItem);
    group.appendChild(label);
    group.appendChild(row);
    return group;
  }

  private createColorInput(
    id: string,
    labelText: string,
    initialValue: string,
    onChange: (value: string) => void
  ): HTMLDivElement {
    const item = document.createElement("div");
    item.className = "settings-color-item";

    const label = document.createElement("label");
    label.className = "sr-only";
    label.textContent = labelText;
    label.htmlFor = id;

    const input = document.createElement("input");
    input.type = "color";
    input.className = "settings-color-input";
    input.value = initialValue;
    input.id = id;
    input.setAttribute("aria-label", labelText);
    input.addEventListener("change", () => onChange(input.value));

    item.appendChild(label);
    item.appendChild(input);
    return item;
  }

  private createFlipControlsGroup(): HTMLDivElement {
    const group = document.createElement("div");
    group.className = "flip-controls-group";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", i18n.t('flipScreen'));

    // Horizontal flip
    group.appendChild(this.createToggleRow(
      "flip-horizontal",
      i18n.t('flipScreen'),
      i18n.t('tipFlipMode'),
      this.state.isFlipped,
      (checked) => { this.state.isFlipped = checked; this.onStateChange(); }
    ));

    // Vertical flip
    group.appendChild(this.createToggleRow(
      "flip-vertical",
      i18n.t('flipVertical'),
      i18n.t('tipFlipVertical'),
      this.state.isFlippedVertical,
      (checked) => { this.state.isFlippedVertical = checked; this.onStateChange(); }
    ));

    // Reading guide
    group.appendChild(this.createToggleRow(
      "reading-guide",
      i18n.t('readingGuide'),
      i18n.t('readingGuideDescription'),
      this.state.readingGuideEnabled,
      (checked) => { this.state.readingGuideEnabled = checked; this.onStateChange(); }
    ));

    return group;
  }

  private createToggleRow(
    idPrefix: string,
    title: string,
    subtitle: string,
    initialChecked: boolean,
    onChange: (checked: boolean) => void
  ): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "flip-control-row";

    const labelContainer = document.createElement("div");
    labelContainer.className = "flip-control-label";

    const titleId = `${idPrefix}-title`;
    const descId = `${idPrefix}-desc`;

    const titleEl = document.createElement("span");
    titleEl.className = "flip-control-title";
    titleEl.id = titleId;
    titleEl.textContent = title;

    const subtitleEl = document.createElement("span");
    subtitleEl.className = "flip-control-subtitle";
    subtitleEl.id = descId;
    subtitleEl.textContent = subtitle;

    labelContainer.appendChild(titleEl);
    labelContainer.appendChild(subtitleEl);

    const toggle = document.createElement("label");
    toggle.className = "toggle-switch";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = initialChecked;
    input.setAttribute("role", "switch");
    input.setAttribute("aria-checked", String(initialChecked));
    input.setAttribute("aria-labelledby", titleId);
    input.setAttribute("aria-describedby", descId);
    input.addEventListener("change", () => {
      input.setAttribute("aria-checked", String(input.checked));
      onChange(input.checked);
    });

    const slider = document.createElement("span");
    slider.className = "toggle-slider";
    slider.setAttribute("aria-hidden", "true");

    toggle.appendChild(input);
    toggle.appendChild(slider);

    row.appendChild(labelContainer);
    row.appendChild(toggle);
    return row;
  }

  private createThemePresetsControl(): HTMLDivElement {
    const group = this.createSettingsGroup();
    const label = document.createElement("label");
    label.className = "settings-label";
    label.textContent = i18n.t('themePresets');

    const select = document.createElement("select");
    select.className = "settings-select";

    // Add "Custom" option
    const customOption = document.createElement("option");
    customOption.value = "custom";
    customOption.textContent = "Custom";
    customOption.selected = true;
    select.appendChild(customOption);

    THEME_PRESETS.forEach((theme) => {
      const option = document.createElement("option");
      option.value = theme.id;
      option.textContent = theme.name;
      select.appendChild(option);
    });

    select.addEventListener("change", () => {
      const selectedTheme = THEME_PRESETS.find(t => t.id === select.value);
      if (selectedTheme) {
        this.state.fontColor = selectedTheme.fg;
        this.state.backgroundColor = selectedTheme.bg;
        this.onStateChange();
        this.updateContrastIndicator();
      }
    });

    const row = document.createElement("div");
    row.className = "settings-row";
    row.appendChild(select);

    // Contrast indicator
    this.contrastIndicator = document.createElement("span");
    this.contrastIndicator.className = "contrast-indicator";
    this.updateContrastIndicator();

    group.appendChild(label);
    group.appendChild(row);
    group.appendChild(this.contrastIndicator);
    return group;
  }

  private createOverlayOpacityControl(): HTMLDivElement {
    const group = this.createSettingsGroup();
    this.overlayOpacityLabel = document.createElement("label");
    this.overlayOpacityLabel.className = "settings-label";
    this.overlayOpacityLabel.textContent = `${i18n.t('overlayOpacity')}: ${Math.round(this.state.overlayOpacity * 100)}%`;

    this.overlayOpacityInput = document.createElement("input");
    this.overlayOpacityInput.type = "range";
    this.overlayOpacityInput.min = CONFIG.OVERLAY_OPACITY.MIN.toString();
    this.overlayOpacityInput.max = CONFIG.OVERLAY_OPACITY.MAX.toString();
    this.overlayOpacityInput.step = CONFIG.OVERLAY_OPACITY.STEP.toString();
    this.overlayOpacityInput.value = this.state.overlayOpacity.toString();
    this.overlayOpacityInput.addEventListener("input", () => {
      this.state.overlayOpacity = parseFloat(this.overlayOpacityInput!.value);
      this.overlayOpacityLabel!.textContent = `${i18n.t('overlayOpacity')}: ${Math.round(this.state.overlayOpacity * 100)}%`;
      this.onStateChange();
    });

    const row = document.createElement("div");
    row.className = "settings-row";
    row.appendChild(this.overlayOpacityInput);

    const hint = document.createElement("span");
    hint.className = "flip-control-subtitle";
    hint.style.padding = "0 16px 12px";
    hint.textContent = i18n.t('overlayModeDescription');

    group.appendChild(this.overlayOpacityLabel);
    group.appendChild(row);
    group.appendChild(hint);
    return group;
  }

  private createHorizontalMarginControl(): HTMLDivElement {
    const group = this.createSettingsGroup();
    this.horizontalMarginLabel = document.createElement("label");
    this.horizontalMarginLabel.className = "settings-label";
    this.horizontalMarginLabel.textContent = `${i18n.t('horizontalMargin')}: ${this.state.horizontalMargin}%`;

    this.horizontalMarginInput = document.createElement("input");
    this.horizontalMarginInput.type = "range";
    this.horizontalMarginInput.min = CONFIG.HORIZONTAL_MARGIN.MIN.toString();
    this.horizontalMarginInput.max = CONFIG.HORIZONTAL_MARGIN.MAX.toString();
    this.horizontalMarginInput.value = this.state.horizontalMargin.toString();
    this.horizontalMarginInput.addEventListener("input", () => {
      this.state.horizontalMargin = this.horizontalMarginInput!.valueAsNumber;
      this.horizontalMarginLabel!.textContent = `${i18n.t('horizontalMargin')}: ${this.state.horizontalMargin}%`;
      this.onStateChange();
    });

    const row = document.createElement("div");
    row.className = "settings-row";
    row.appendChild(this.horizontalMarginInput);

    group.appendChild(this.horizontalMarginLabel);
    group.appendChild(row);
    return group;
  }

  private updateContrastIndicator() {
    if (!this.contrastIndicator) return;
    const ratio = getContrastRatio(this.state.fontColor, this.state.backgroundColor);
    const level = getContrastLevel(ratio);
    this.contrastIndicator.textContent = `${i18n.t('contrastRatio')}: ${ratio.toFixed(1)}:1 (${level.level})`;
    this.contrastIndicator.style.color = level.passes ? 'var(--apple-toggle-on)' : 'var(--apple-system-orange)';
    this.contrastIndicator.style.padding = '8px 16px';
    this.contrastIndicator.style.display = 'block';
    this.contrastIndicator.style.fontSize = 'var(--font-xs)';
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
    // Scroll Mode
    const scrollModeGroup = this.createSettingsGroup();
    const scrollModeLabel = document.createElement("label");
    scrollModeLabel.className = "settings-label";
    scrollModeLabel.textContent = i18n.t('scrollMode');

    const scrollModeSelect = document.createElement("select");
    scrollModeSelect.className = "settings-select";

    const scrollModes: { value: ScrollMode; label: string }[] = [
      { value: 'continuous', label: i18n.t('continuous') },
      { value: 'paging', label: i18n.t('paging') },
      { value: 'voice', label: i18n.t('voice') },
    ];

    scrollModes.forEach(({ value, label }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      if (this.state.scrollMode === value) {
        option.selected = true;
      }
      scrollModeSelect.appendChild(option);
    });

    scrollModeSelect.addEventListener("change", () => {
      this.state.scrollMode = scrollModeSelect.value as ScrollMode;
      this.onStateChange();
      document.dispatchEvent(new CustomEvent("scroll-mode-changed"));
    });

    const scrollModeRow = document.createElement("div");
    scrollModeRow.className = "settings-row";
    scrollModeRow.appendChild(scrollModeSelect);

    scrollModeGroup.appendChild(scrollModeLabel);
    scrollModeGroup.appendChild(scrollModeRow);
    panel.appendChild(scrollModeGroup);

    // Text Direction
    const textDirGroup = this.createSettingsGroup();
    const textDirLabel = document.createElement("label");
    textDirLabel.className = "settings-label";
    textDirLabel.textContent = i18n.t('textDirection');

    const textDirSelect = document.createElement("select");
    textDirSelect.className = "settings-select";

    const textDirections: { value: TextDirection; label: string }[] = [
      { value: 'auto', label: i18n.t('autoDetect') },
      { value: 'ltr', label: i18n.t('leftToRight') },
      { value: 'rtl', label: i18n.t('rightToLeft') },
    ];

    textDirections.forEach(({ value, label }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      if (this.state.textDirection === value) {
        option.selected = true;
      }
      textDirSelect.appendChild(option);
    });

    textDirSelect.addEventListener("change", () => {
      this.state.textDirection = textDirSelect.value as TextDirection;
      this.onStateChange();
    });

    const textDirRow = document.createElement("div");
    textDirRow.className = "settings-row";
    textDirRow.appendChild(textDirSelect);

    textDirGroup.appendChild(textDirLabel);
    textDirGroup.appendChild(textDirRow);
    panel.appendChild(textDirGroup);

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

    // Update reset button
    if (this.resetBtn) {
      this.resetBtn.textContent = i18n.t('resetToDefaults');
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

  // Sync input values from state (called when settings change via keyboard shortcuts or reset)
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
    if (this.scrollSpeedInput) {
      this.scrollSpeedInput.value = this.state.scrollSpeed.toString();
    }
    if (this.scrollSpeedLabel) {
      this.scrollSpeedLabel.textContent = formatLabel('scrollSpeed', `${this.state.scrollSpeed} `, 'linesPerSec');
    }
    if (this.maxWordsPerLineInput) {
      this.maxWordsPerLineInput.value = this.state.maxWordsPerLine.toString();
    }
    if (this.maxWordsPerLineLabel) {
      this.maxWordsPerLineLabel.textContent = formatLabel('maxWordsPerLine', this.state.maxWordsPerLine);
    }
    if (this.horizontalMarginInput) {
      this.horizontalMarginInput.value = this.state.horizontalMargin.toString();
    }
    if (this.horizontalMarginLabel) {
      this.horizontalMarginLabel.textContent = `${i18n.t('horizontalMargin')}: ${this.state.horizontalMargin}%`;
    }
    if (this.overlayOpacityInput) {
      this.overlayOpacityInput.value = this.state.overlayOpacity.toString();
    }
    if (this.overlayOpacityLabel) {
      this.overlayOpacityLabel.textContent = `${i18n.t('overlayOpacity')}: ${Math.round(this.state.overlayOpacity * 100)}%`;
    }
  }

  open() {
    this.isOpen = true;
    this.backdrop.classList.add("open");
    this.drawer.classList.add("open");

    // Activate focus trap
    if (this.focusTrap) {
      this.focusTrap.activate();
    }

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

    // Deactivate focus trap (restores focus to previous element)
    if (this.focusTrap) {
      this.focusTrap.deactivate();
    }

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

  private resetToDefaults() {
    // Reset all settings to CONFIG defaults
    this.state.fontSize = CONFIG.FONT_SIZE.DEFAULT;
    this.state.fontFamily = 'System';
    this.state.fontColor = '#FFFFFF';
    this.state.backgroundColor = '#000000';
    this.state.lineSpacing = CONFIG.LINE_SPACING.DEFAULT;
    this.state.letterSpacing = CONFIG.LETTER_SPACING.DEFAULT;
    this.state.scrollSpeed = CONFIG.SCROLL_SPEED.DEFAULT;
    this.state.maxWordsPerLine = CONFIG.MAX_WORDS_PER_LINE.DEFAULT;
    this.state.isFlipped = false;
    this.state.isFlippedVertical = false;
    this.state.readingGuideEnabled = false;
    this.state.overlayOpacity = CONFIG.OVERLAY_OPACITY.DEFAULT;
    this.state.horizontalMargin = CONFIG.HORIZONTAL_MARGIN.DEFAULT;
    this.state.textDirection = 'auto';
    this.state.scrollMode = 'continuous';

    // Sync UI inputs to new values
    this.syncInputsFromState();
    this.updateContrastIndicator();

    // Notify changes and save
    this.onStateChange();
    this.state.saveSettings();
    document.dispatchEvent(new CustomEvent("settings-changed"));
    document.dispatchEvent(new CustomEvent("scroll-mode-changed"));
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
