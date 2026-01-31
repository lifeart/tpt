// Custom event types for type safety
export interface ScrollingToggledDetail {
  isScrolling: boolean;
  isCountingDown: boolean;
}

// Scroll mode types
export type ScrollMode = 'continuous' | 'paging' | 'voice';

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
  }
}
