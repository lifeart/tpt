// Custom event types for type safety
export interface ScrollingToggledDetail {
  isScrolling: boolean;
  isCountingDown: boolean;
}

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
  }
}
