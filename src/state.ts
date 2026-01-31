import { CONFIG } from "./config";
import { i18n } from "./i18n";
import { loadSettings, saveSettings } from "./storage";
import type { ScrollMode, TextDirection } from "./types";

// Teleprompter state class
export class TeleprompterState {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  backgroundColor: string;
  lineSpacing: number;
  letterSpacing: number;
  scrollSpeed: number; // Now represents lines per second
  isFlipped: boolean;
  isFlippedVertical: boolean;
  isScrolling: boolean;
  activeLineIndex: number;
  scriptEnded: boolean;
  maxWordsPerLine: number; // New property to control line word limit
  readingGuideEnabled: boolean; // Reading guide/focus area
  cuePoints: Set<number>; // Cue point line indices
  // New properties for Phase 1 features
  scrollMode: ScrollMode; // continuous, paging, voice, or rsvp
  overlayOpacity: number; // 0.3-1.0 for transparency mode
  horizontalMargin: number; // 0-40% for side margins
  textDirection: TextDirection; // auto, ltr, rtl
  currentPage: number; // For paging mode
  rsvpSpeed: number; // Words per minute for RSVP mode

  constructor() {
    // Try to load saved script from localStorage (with error handling for Safari Private Browsing)
    let savedScript: string | null = null;
    try {
      savedScript = localStorage.getItem(CONFIG.STORAGE_KEY);
    } catch {
      // localStorage not available (private browsing, etc.)
    }
    const defaultText = i18n.t('defaultScript');

    // Set defaults first
    this.text = savedScript || `${defaultText}\n\n${defaultText}\n\n${defaultText}`;
    this.fontSize = CONFIG.FONT_SIZE.DEFAULT;
    this.fontFamily = CONFIG.DEFAULTS.FONT_FAMILY;
    this.fontColor = CONFIG.DEFAULTS.FONT_COLOR;
    this.backgroundColor = CONFIG.DEFAULTS.BACKGROUND_COLOR;
    this.lineSpacing = CONFIG.LINE_SPACING.DEFAULT;
    this.letterSpacing = CONFIG.LETTER_SPACING.DEFAULT;
    this.scrollSpeed = CONFIG.SCROLL_SPEED.DEFAULT;
    this.isFlipped = CONFIG.DEFAULTS.IS_FLIPPED;
    this.isFlippedVertical = CONFIG.DEFAULTS.IS_FLIPPED_VERTICAL;
    this.isScrolling = false;
    this.activeLineIndex = 0;
    this.scriptEnded = false;
    this.maxWordsPerLine = CONFIG.MAX_WORDS_PER_LINE.DEFAULT;
    this.readingGuideEnabled = CONFIG.DEFAULTS.READING_GUIDE_ENABLED;
    this.cuePoints = new Set();
    // New defaults
    this.scrollMode = CONFIG.DEFAULTS.SCROLL_MODE;
    this.overlayOpacity = CONFIG.OVERLAY_OPACITY.DEFAULT;
    this.horizontalMargin = CONFIG.HORIZONTAL_MARGIN.DEFAULT;
    this.textDirection = CONFIG.DEFAULTS.TEXT_DIRECTION;
    this.currentPage = 0;
    this.rsvpSpeed = CONFIG.RSVP_SPEED.DEFAULT;

    // Restore saved settings with range validation
    const saved = loadSettings();
    if (saved) {
      if (typeof saved.fontSize === 'number') {
        this.fontSize = Math.max(CONFIG.FONT_SIZE.MIN, Math.min(CONFIG.FONT_SIZE.MAX, saved.fontSize));
      }
      if (typeof saved.fontFamily === 'string') this.fontFamily = saved.fontFamily;
      if (typeof saved.fontColor === 'string') this.fontColor = saved.fontColor;
      if (typeof saved.backgroundColor === 'string') this.backgroundColor = saved.backgroundColor;
      if (typeof saved.lineSpacing === 'number') {
        this.lineSpacing = Math.max(CONFIG.LINE_SPACING.MIN, Math.min(CONFIG.LINE_SPACING.MAX, saved.lineSpacing));
      }
      if (typeof saved.letterSpacing === 'number') {
        this.letterSpacing = Math.max(CONFIG.LETTER_SPACING.MIN, Math.min(CONFIG.LETTER_SPACING.MAX, saved.letterSpacing));
      }
      if (typeof saved.scrollSpeed === 'number') {
        this.scrollSpeed = Math.max(CONFIG.SCROLL_SPEED.MIN, Math.min(CONFIG.SCROLL_SPEED.MAX, saved.scrollSpeed));
      }
      if (typeof saved.isFlipped === 'boolean') this.isFlipped = saved.isFlipped;
      if (typeof saved.isFlippedVertical === 'boolean') this.isFlippedVertical = saved.isFlippedVertical;
      if (typeof saved.maxWordsPerLine === 'number') {
        this.maxWordsPerLine = Math.max(CONFIG.MAX_WORDS_PER_LINE.MIN, Math.min(CONFIG.MAX_WORDS_PER_LINE.MAX, Math.floor(saved.maxWordsPerLine)));
      }
      if (typeof saved.readingGuideEnabled === 'boolean') this.readingGuideEnabled = saved.readingGuideEnabled;
      if (Array.isArray(saved.cuePoints)) this.cuePoints = new Set(saved.cuePoints);
      // Restore new settings
      if (saved.scrollMode === 'continuous' || saved.scrollMode === 'paging' || saved.scrollMode === 'voice' || saved.scrollMode === 'rsvp') {
        this.scrollMode = saved.scrollMode;
      }
      if (typeof saved.overlayOpacity === 'number') {
        this.overlayOpacity = Math.max(CONFIG.OVERLAY_OPACITY.MIN, Math.min(CONFIG.OVERLAY_OPACITY.MAX, saved.overlayOpacity));
      }
      if (typeof saved.horizontalMargin === 'number') {
        this.horizontalMargin = Math.max(CONFIG.HORIZONTAL_MARGIN.MIN, Math.min(CONFIG.HORIZONTAL_MARGIN.MAX, saved.horizontalMargin));
      }
      if (saved.textDirection === 'auto' || saved.textDirection === 'ltr' || saved.textDirection === 'rtl') {
        this.textDirection = saved.textDirection;
      }
      if (typeof saved.rsvpSpeed === 'number') {
        this.rsvpSpeed = Math.max(CONFIG.RSVP_SPEED.MIN, Math.min(CONFIG.RSVP_SPEED.MAX, saved.rsvpSpeed));
      }
    }
  }

  saveSettings(): void {
    saveSettings({
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontColor: this.fontColor,
      backgroundColor: this.backgroundColor,
      lineSpacing: this.lineSpacing,
      letterSpacing: this.letterSpacing,
      scrollSpeed: this.scrollSpeed,
      isFlipped: this.isFlipped,
      isFlippedVertical: this.isFlippedVertical,
      maxWordsPerLine: this.maxWordsPerLine,
      readingGuideEnabled: this.readingGuideEnabled,
      cuePoints: Array.from(this.cuePoints),
      scrollMode: this.scrollMode,
      overlayOpacity: this.overlayOpacity,
      horizontalMargin: this.horizontalMargin,
      textDirection: this.textDirection,
      rsvpSpeed: this.rsvpSpeed,
    });
  }
}
