"use client";

import { useSyncExternalStore } from "react";
import {
  getServerThemePreference,
  getThemePreference,
  setThemePreference,
  subscribeToTheme,
  type ThemePreference,
} from "@/lib/theme";

export function useTheme(): [ThemePreference, (preference: ThemePreference) => void] {
  const preference = useSyncExternalStore(subscribeToTheme, getThemePreference, getServerThemePreference);
  return [preference, setThemePreference];
}
