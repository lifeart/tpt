// Event name constants to prevent typos
export const EVENTS = {
  SCROLLING_TOGGLED: 'scrolling-toggled',
  TOGGLE_SCROLLING: 'toggle-scrolling',
  BACK_TO_TOP: 'back-to-top',
  SPEED_CHANGED: 'speed-changed',
  SETTINGS_CHANGED: 'settings-changed',
  DRAWER_OPENED: 'drawer-opened',
  DRAWER_CLOSED: 'drawer-closed',
  SCROLL_MODE_CHANGED: 'scroll-mode-changed',
  PAGE_CHANGED: 'page-changed',
  ADVANCE_PAGE: 'advance-page',
  RSVP_SPEED_CHANGED: 'rsvp-speed-changed',
} as const;

// Custom event types for type safety
export interface ScrollingToggledDetail {
  isScrolling: boolean;
  isCountingDown: boolean;
}

// Scroll mode types
export type ScrollMode = 'continuous' | 'paging' | 'voice' | 'rsvp';

// Text direction for RTL support
export type TextDirection = 'auto' | 'ltr' | 'rtl';

export interface PersistedSettings {
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  backgroundColor: string;
  lineSpacing: number;
  letterSpacing: number;
  scrollSpeed: number;
  isFlipped: boolean;
  isFlippedVertical: boolean;
  maxWordsPerLine: number;
  readingGuideEnabled: boolean;
  cuePoints: number[];
  // New settings
  scrollMode: ScrollMode;
  overlayOpacity: number;
  horizontalMargin: number;
  textDirection: TextDirection;
  rsvpSpeed: number;
}

// Page change event detail
export interface PageChangedDetail {
  currentPage: number;
  totalPages: number;
}

// Safari-specific fullscreen API (vendor-prefixed)
export interface SafariDocument extends Document {
  webkitFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void>;
}

// Global event map declarations
declare global {
  interface DocumentEventMap {
    "scrolling-toggled": CustomEvent<ScrollingToggledDetail>;
    "toggle-scrolling": CustomEvent<void>;
    "back-to-top": CustomEvent<void>;
    "speed-changed": CustomEvent<void>;
    "settings-changed": CustomEvent<void>;
    "drawer-opened": CustomEvent<void>;
    "drawer-closed": CustomEvent<void>;
    "scroll-mode-changed": CustomEvent<void>;
    "page-changed": CustomEvent<PageChangedDetail>;
    "advance-page": CustomEvent<{ direction: 1 | -1 }>;
    "rsvp-speed-changed": CustomEvent<void>;
  }
}
