// Voice-Follow Scrolling Engine
// Uses Web Speech API for speech recognition with fuzzy word matching

// Constants for voice recognition
const VOICE_CONFIG = {
  SEARCH_WINDOW_SIZE: 50, // Words to search forward from last match
  MAX_FUZZY_DISTANCE: 2, // Max Levenshtein distance for fuzzy matching
  MAX_RESTART_ATTEMPTS: 5, // Max consecutive restart attempts before giving up
  INITIAL_RESTART_DELAY: 500, // Initial delay before restart (ms)
  MAX_RESTART_DELAY: 5000, // Max backoff delay (ms)
} as const;

export interface VoiceScrollCallbacks {
  onScrollTo: (lineIndex: number) => void;
  onRecognizedText: (text: string) => void;
  onConfidenceChange: (confidence: number) => void;
  onMicLevelChange: (level: number) => void;
  onError: (error: string) => void;
  onStatusChange: (isListening: boolean) => void;
}

interface WordPosition {
  word: string;
  lineIndex: number;
  wordIndex: number;
}

// Check if Web Speech API is supported
export function isVoiceSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Normalize word for comparison
function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Type declarations for Web Speech API
interface SpeechRecognitionType extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventType) => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEventType {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export class VoiceScrollEngine {
  private callbacks: VoiceScrollCallbacks;
  private recognition: SpeechRecognitionType | null = null;
  private wordIndex: Map<string, WordPosition[]> = new Map();
  private lastMatchedLine: number = 0;
  private isListening: boolean = false;
  private language: string = 'en-US';
  // Restart backoff state
  private restartAttempts: number = 0;
  private restartTimeoutId: number | null = null;

  constructor(callbacks: VoiceScrollCallbacks) {
    this.callbacks = callbacks;
  }

  private resetRestartCounter() {
    this.restartAttempts = 0;
  }

  private getRestartDelay(): number {
    // Exponential backoff: 500ms, 1000ms, 2000ms, 4000ms, 5000ms (capped)
    const delay = VOICE_CONFIG.INITIAL_RESTART_DELAY * Math.pow(2, this.restartAttempts);
    return Math.min(delay, VOICE_CONFIG.MAX_RESTART_DELAY);
  }

  // Build word index from script text
  updateScript(text: string, maxWordsPerLine: number = 0) {
    this.wordIndex.clear();

    // Split into lines (respecting maxWordsPerLine)
    const inputLines = text.split('\n');
    const lines: string[] = [];

    inputLines.forEach(line => {
      if (maxWordsPerLine > 0 && line.trim() !== '') {
        const words = line.trim().split(/\s+/);
        for (let i = 0; i < words.length; i += maxWordsPerLine) {
          lines.push(words.slice(i, i + maxWordsPerLine).join(' '));
        }
      } else {
        lines.push(line);
      }
    });

    // Build index
    lines.forEach((line, lineIndex) => {
      const words = line.trim().split(/\s+/);
      words.forEach((word, wordIndex) => {
        const normalized = normalizeWord(word);
        if (normalized.length > 0) {
          if (!this.wordIndex.has(normalized)) {
            this.wordIndex.set(normalized, []);
          }
          this.wordIndex.get(normalized)!.push({
            word,
            lineIndex,
            wordIndex,
          });
        }
      });
    });
  }

  // Set recognition language
  setLanguage(lang: string) {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  // Start voice recognition
  start() {
    if (!isVoiceSupported()) {
      this.callbacks.onError('Voice recognition not supported in this browser');
      return false;
    }

    if (this.isListening) {
      return true;
    }

    // Create recognition instance
    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionType;
      webkitSpeechRecognition?: new () => SpeechRecognitionType;
    };
    const SpeechRecognitionImpl = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechRecognitionImpl) {
      this.callbacks.onError('Voice recognition not supported');
      return false;
    }

    this.recognition = new SpeechRecognitionImpl();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.language;
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.resetRestartCounter(); // Reset on successful start
      this.callbacks.onStatusChange(true);
    };

    this.recognition.onend = () => {
      // Auto-restart if still supposed to be listening
      if (this.isListening) {
        // Check if we've exceeded max restart attempts
        if (this.restartAttempts >= VOICE_CONFIG.MAX_RESTART_ATTEMPTS) {
          this.callbacks.onError('Voice recognition stopped after multiple failures. Please restart manually.');
          this.isListening = false;
          this.callbacks.onStatusChange(false);
          return;
        }

        // Calculate backoff delay
        const delay = this.getRestartDelay();
        this.restartAttempts++;

        // Schedule restart with backoff
        this.restartTimeoutId = window.setTimeout(() => {
          if (this.isListening && this.recognition) {
            try {
              this.recognition.start();
            } catch (e) {
              // Failed to restart, will try again on next onend
            }
          }
        }, delay);
      } else {
        this.callbacks.onStatusChange(false);
      }
    };

    this.recognition.onerror = (event: { error: string }) => {
      if (event.error === 'not-allowed') {
        this.callbacks.onError('Microphone permission denied');
        this.isListening = false;
      } else if (event.error === 'no-speech') {
        // This is normal, just means silence
      } else {
        this.callbacks.onError(`Speech recognition error: ${event.error}`);
      }
    };

    this.recognition.onresult = (event: SpeechRecognitionEventType) => {
      this.processResults(event);
    };

    // Start recognition
    try {
      this.recognition.start();
      return true;
    } catch (e) {
      this.callbacks.onError('Failed to start voice recognition');
      return false;
    }
  }

  // Stop voice recognition
  stop() {
    this.isListening = false;
    // Clear any pending restart timeout
    if (this.restartTimeoutId !== null) {
      clearTimeout(this.restartTimeoutId);
      this.restartTimeoutId = null;
    }
    this.resetRestartCounter();
    if (this.recognition) {
      this.recognition.stop();
    }
    this.callbacks.onStatusChange(false);
  }

  // Process recognition results
  private processResults(event: SpeechRecognitionEventType) {
    const result = event.results[event.resultIndex];

    if (result.isFinal) {
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;

      this.callbacks.onRecognizedText(transcript);
      this.callbacks.onConfidenceChange(confidence);

      // Find matching position in script
      const matchedLine = this.findBestMatch(transcript);
      if (matchedLine !== null && matchedLine !== this.lastMatchedLine) {
        this.lastMatchedLine = matchedLine;
        this.callbacks.onScrollTo(matchedLine);
      }
    } else {
      // Interim result - show preview
      const transcript = result[0].transcript;
      this.callbacks.onRecognizedText(transcript);
    }
  }

  // Find best matching position in script
  private findBestMatch(transcript: string): number | null {
    const words = transcript.trim().split(/\s+/).map(normalizeWord).filter(w => w.length > 0);
    if (words.length === 0) return null;

    let bestLineIndex: number | null = null;
    let bestScore = Infinity;

    // Search forward from last matched position
    const startSearch = Math.max(0, this.lastMatchedLine);
    const endSearch = startSearch + VOICE_CONFIG.SEARCH_WINDOW_SIZE;

    // Get all word positions within search window
    for (const word of words) {
      const positions = this.wordIndex.get(word) || [];

      for (const pos of positions) {
        // Check if within search window
        if (pos.lineIndex < startSearch || pos.lineIndex > endSearch) {
          continue;
        }

        // Prefer matches closer to current position
        const distanceFromCurrent = Math.abs(pos.lineIndex - this.lastMatchedLine);
        const score = distanceFromCurrent;

        if (score < bestScore) {
          bestScore = score;
          bestLineIndex = pos.lineIndex;
        }
      }

      // Also try fuzzy matching for words not found exactly
      if (positions.length === 0) {
        for (const [indexedWord, indexedPositions] of this.wordIndex.entries()) {
          const distance = levenshtein(word, indexedWord);
          // Allow up to MAX_FUZZY_DISTANCE character differences for words > 4 chars
          if (distance <= Math.min(VOICE_CONFIG.MAX_FUZZY_DISTANCE, Math.floor(word.length / 2))) {
            for (const pos of indexedPositions) {
              if (pos.lineIndex < startSearch || pos.lineIndex > endSearch) {
                continue;
              }

              const distanceFromCurrent = Math.abs(pos.lineIndex - this.lastMatchedLine);
              const score = distanceFromCurrent + distance; // Penalize fuzzy matches

              if (score < bestScore) {
                bestScore = score;
                bestLineIndex = pos.lineIndex;
              }
            }
          }
        }
      }
    }

    return bestLineIndex;
  }

  // Reset to beginning of script
  reset() {
    this.lastMatchedLine = 0;
  }

  // Check if currently listening
  isActive(): boolean {
    return this.isListening;
  }

  destroy() {
    this.stop();
    this.recognition = null;
    this.wordIndex.clear();
    this.restartAttempts = 0;
  }
}
