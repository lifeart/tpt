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
        lines.push(line);
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
  const totalSeconds = totalLines / linesPerSecond;
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
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      } else {
        reject(new Error('No file selected'));
      }
    };
    // Handle cancel - onchange won't fire if no file selected
    // Use a focus listener to detect when dialog closes without selection
    const handleFocus = () => {
      window.removeEventListener('focus', handleFocus);
      // Small delay to allow onchange to fire first if file was selected
      setTimeout(() => {
        if (!input.files?.length) {
          reject(new Error('File selection cancelled'));
        }
      }, 300);
    };
    window.addEventListener('focus', handleFocus);
    input.click();
  });
}
