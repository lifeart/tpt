// Constants for configuration limits
export const CONFIG = {
  FONT_SIZE: { MIN: 16, MAX: 72, DEFAULT: 32 },
  SCROLL_SPEED: { MIN: 0.1, MAX: 8, DEFAULT: 1.5, STEP: 0.1 },
  LINE_SPACING: { MIN: 0.5, MAX: 3, DEFAULT: 1, STEP: 0.1 },
  LETTER_SPACING: { MIN: 0, MAX: 10, DEFAULT: 0 },
  MAX_WORDS_PER_LINE: { MIN: 0, MAX: 50, DEFAULT: 0 },
  ACTIVE_LINE_UPDATE_INTERVAL: 100, // ms
  END_THRESHOLD: 5, // pixels from end to trigger stop
  SPACER_HEIGHT: "50vh",
  STORAGE_KEY: "tpt/script",
  COUNTDOWN_SECONDS: 3, // 3-2-1 countdown before scrolling
  RAMP_DURATION: 1000, // ms for speed ramp up/down
} as const;
