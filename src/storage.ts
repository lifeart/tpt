import type { PersistedSettings } from "./types";

// Settings persistence with tpt/ prefix
export const SETTINGS_STORAGE_KEY = "tpt/settings";

export function loadSettings(): Partial<PersistedSettings> | null {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as Partial<PersistedSettings>;
    }
  } catch (e) {
    console.warn("Could not load settings from localStorage:", e);
  }
  return null;
}

export function saveSettings(settings: PersistedSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("Could not save settings to localStorage:", e);
  }
}
