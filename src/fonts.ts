export const systemFontStack =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';

// Map display names to actual font families
export const fontFamilyMap: Record<string, string> = {
  System: systemFontStack,
  Arial: "Arial, sans-serif",
  "Times New Roman": '"Times New Roman", Times, serif',
  "Courier New": '"Courier New", Courier, monospace',
  Georgia: "Georgia, serif",
  Verdana: "Verdana, sans-serif",
  Roboto: "Roboto, sans-serif",
  "Open Sans": '"Open Sans", sans-serif',
  Lexend: '"Lexend", sans-serif',
  OpenDyslexic: '"OpenDyslexic", sans-serif',
};

export function getFontFamily(displayName: string): string {
  return fontFamilyMap[displayName] || displayName;
}
