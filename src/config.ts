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
  // New config for Quick UX features
  OVERLAY_OPACITY: { MIN: 0.3, MAX: 1, DEFAULT: 1, STEP: 0.05 },
  HORIZONTAL_MARGIN: { MIN: 0, MAX: 40, DEFAULT: 10 },
  PAGING_TRANSITION_DURATION: 400, // ms for page transitions
  PAGING_OVERLAP: 0.1, // 10% overlap between pages
  // Smooth scroll animation settings
  SMOOTH_SCROLL_EASING: 0.15, // Lerp factor for smooth scrolling
  SMOOTH_SCROLL_SNAP_THRESHOLD: 0.5, // Distance threshold to snap to target
  // Reading guide settings
  READING_GUIDE_HEIGHT_MULTIPLIER: 1.5, // Multiplier for line height
  // RSVP settings
  RSVP_SPEED: { MIN: 150, MAX: 600, DEFAULT: 300, STEP: 25 }, // Words per minute
  RSVP_PUNCTUATION_DELAY_MAJOR: 2, // Multiplier for . ! ?
  RSVP_PUNCTUATION_DELAY_MINOR: 1.5, // Multiplier for , ; :
  // Default values for non-numeric settings
  DEFAULTS: {
    FONT_FAMILY: 'System',
    FONT_COLOR: '#FFFFFF',
    BACKGROUND_COLOR: '#000000',
    TEXT_DIRECTION: 'auto' as const,
    SCROLL_MODE: 'continuous' as const,
    IS_FLIPPED: false,
    IS_FLIPPED_VERTICAL: false,
    READING_GUIDE_ENABLED: false,
  },
  // Timing constants
  IMPORT_CANCEL_DETECTION_DELAY: 300, // ms delay for file import cancel detection
  RTL_DETECTION_THRESHOLD: 0.3, // 30% RTL chars to consider text RTL
  RECOGNIZED_TEXT_MAX_WORDS: 6, // Max words to show in voice recognition display
  WHEEL_THROTTLE_INTERVAL: 16, // ~60fps throttle for wheel events
} as const;
