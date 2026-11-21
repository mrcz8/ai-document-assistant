export type ThemePreference = "light" | "dark" | "system";

export const THEME_PREFERENCES: ThemePreference[] = ["light", "dark", "system"];

const STORAGE_KEY = "docmind.theme";
const CHANGE_EVENT = "docmind:theme-change";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function isPreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && THEME_PREFERENCES.includes(value as ThemePreference);
}

export function getThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isPreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function getServerThemePreference(): ThemePreference {
  return "system";
}

export function applyTheme(preference: ThemePreference): void {
  const dark = preference === "dark" || (preference === "system" && window.matchMedia(DARK_QUERY).matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {}
  applyTheme(preference);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeToTheme(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  const handleSystemChange = () => {
    if (getThemePreference() === "system") applyTheme("system");
    onChange();
  };

  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", handleSystemChange);
  media.addEventListener("change", handleSystemChange);

  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", handleSystemChange);
    media.removeEventListener("change", handleSystemChange);
  };
}

export const themeBootScript = `(() => {
  let preference = "system";
  try {
    const stored = localStorage.getItem("${STORAGE_KEY}");
    if (stored === "light" || stored === "dark" || stored === "system") preference = stored;
  } catch {}
  const dark = preference === "dark" || (preference === "system" && matchMedia("${DARK_QUERY}").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
})();`;
