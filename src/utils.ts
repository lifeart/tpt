import { CONFIG } from "./config";
import { i18n, type Translations } from "./i18n";

// Helper function for formatting labels with values
export function formatLabel(key: keyof Translations, value: number | string, unitKey?: keyof Translations): string {
  const label = i18n.t(key);
  const unit = unitKey ? i18n.t(unitKey) : '';
  return `${label}: ${value}${unit}`;
}

// Split text into display lines, respecting maxWordsPerLine limit
// This is the single source of truth for line splitting logic
export function splitTextIntoLines(text: string, maxWordsPerLine: number): string[] {
  const inputLines = text.split("\n");
  const lines: string[] = [];

  inputLines.forEach(line => {
    if (maxWordsPerLine > 0 && line.trim() !== "") {
      const words = line.trim().split(/\s+/);
      if (words.length > maxWordsPerLine) {
        // Split into chunks based on max words per line
        for (let i = 0; i < words.length; i += maxWordsPerLine) {
          const chunk = words.slice(i, i + maxWordsPerLine).join(" ");
          lines.push(chunk);
        }
      } else {
        // Use trimmed and normalized line for consistency with wrapped lines
        lines.push(words.join(" "));
      }
    } else {
      lines.push(line);
    }
  });

  return lines;
}

// Calculate estimated duration based on text lines and scroll speed
export function calculateDuration(text: string, linesPerSecond: number, maxWordsPerLine: number): { minutes: number; seconds: number } {
  const totalLines = splitTextIntoLines(text, maxWordsPerLine).length;
  // Guard against zero/negative scroll speed to prevent Infinity/NaN
  const safeSpeed = Math.max(linesPerSecond, CONFIG.SCROLL_SPEED.MIN);
  const totalSeconds = totalLines / safeSpeed;
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: Math.round(totalSeconds % 60)
  };
}

export function formatDuration(minutes: number, seconds: number): string {
  if (minutes > 0) {
    return `${minutes}${i18n.t('minutes')} ${seconds}${i18n.t('seconds')}`;
  }
  return `${seconds}${i18n.t('seconds')}`;
}

// Export script as TXT file
export function exportScript(text: string, filename: string = 'script.txt') {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import script from TXT file
export function importScript(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.text,text/plain';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => {
          const error = reader.error;
          if (error) {
            // FileReader.error is always DOMException when present
            reject(new Error(`Failed to read file: ${error.name} - ${error.message}`));
          } else {
            reject(new Error('Failed to read file: Unknown error'));
          }
        };
        reader.readAsText(file);
      } else {
        reject(new Error('Import cancelled: No file selected'));
      }
    };
    // Handle cancel - onchange won't fire if no file selected
    // Use a focus listener to detect when dialog closes without selection
    const handleFocus = () => {
      window.removeEventListener('focus', handleFocus);
      // Small delay to allow onchange to fire first if file was selected
      setTimeout(() => {
        if (!input.files?.length) {
          reject(new Error('Import cancelled: File dialog closed'));
        }
      }, CONFIG.IMPORT_CANCEL_DETECTION_DELAY);
    };
    window.addEventListener('focus', handleFocus);
    input.click();
  });
}

// Calculate words per minute based on text and lines per second
export function calculateWPM(text: string, linesPerSecond: number, maxWordsPerLine: number): number {
  const lines = splitTextIntoLines(text, maxWordsPerLine);
  const totalWords = text.trim() ? text.trim().split(/\s+/).length : 0;
  const totalLines = lines.length || 1;
  const avgWordsPerLine = totalWords / totalLines;
  // WPM = (avgWordsPerLine) * (linesPerSecond) * 60
  return Math.round(avgWordsPerLine * linesPerSecond * 60);
}

// Detect if text is primarily RTL (Hebrew, Arabic, Persian, Urdu)
export function isRTL(text: string): boolean {
  // RTL Unicode ranges: Hebrew, Arabic, Persian, Urdu, etc.
  const rtlChars = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/g;
  const sample = text.slice(0, 200); // Sample first 200 chars
  const matches = sample.match(rtlChars) || [];
  // Consider RTL if more than threshold of sampled characters are RTL
  return matches.length > sample.length * CONFIG.RTL_DETECTION_THRESHOLD;
}

// Generate SRT subtitle file from text
export function generateSRT(text: string, linesPerSecond: number, maxWordsPerLine: number, linesPerSubtitle: number = 2): string {
  const lines = splitTextIntoLines(text, maxWordsPerLine);
  const srtEntries: string[] = [];
  let subtitleIndex = 1;
  let currentTime = 0;
  const secondsPerLine = 1 / linesPerSecond;

  for (let i = 0; i < lines.length; i += linesPerSubtitle) {
    const subtitleLines = lines.slice(i, i + linesPerSubtitle).filter(line => line.trim());
    if (subtitleLines.length === 0) {
      currentTime += secondsPerLine;
      continue;
    }

    const startTime = currentTime;
    const duration = subtitleLines.length * secondsPerLine;
    const endTime = startTime + duration;

    srtEntries.push(
      `${subtitleIndex}\n${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}\n${subtitleLines.join('\n')}\n`
    );

    subtitleIndex++;
    currentTime = endTime;
  }

  return srtEntries.join('\n');
}

// Format time for SRT: HH:MM:SS,mmm
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

// Export SRT file
export function exportSRT(text: string, linesPerSecond: number, maxWordsPerLine: number, filename: string = 'subtitles.srt') {
  const srtContent = generateSRT(text, linesPerSecond, maxWordsPerLine);
  const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Normalize hex color: handles short hex (#fff -> #ffffff) and validates format
// Returns null if invalid, otherwise returns 7-char hex string (#rrggbb)
export function normalizeHexColor(color: string): string | null {
  if (!color || typeof color !== 'string') return null;

  // Remove # if present
  let hex = color.replace('#', '').toLowerCase();

  // Validate hex characters
  if (!/^[0-9a-f]+$/.test(hex)) return null;

  // Handle short hex (#rgb -> #rrggbb)
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // Validate length
  if (hex.length !== 6) return null;

  return '#' + hex;
}

// Parse hex color to RGB components, handling short hex
// Returns { r, g, b } with values 0-255, or null if invalid
export function parseHexColor(color: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHexColor(color);
  if (!normalized) return null;

  const hex = normalized.slice(1); // Remove #
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

// Calculate relative luminance for WCAG contrast
export function getLuminance(hexColor: string): number {
  const rgb = parseHexColor(hexColor);
  if (!rgb) {
    // Fallback: assume black for invalid colors
    return 0;
  }

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  // Apply gamma correction
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// Calculate WCAG contrast ratio between two colors
export function getContrastRatio(fg: string, bg: string): number {
  const L1 = getLuminance(fg);
  const L2 = getLuminance(bg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}
