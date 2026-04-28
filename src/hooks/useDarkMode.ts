import { useState, useEffect } from "react";

const STORAGE_KEY = "aqs_theme";

export type ThemeMode = "system" | "light" | "dark";

/**
 * Manages the dark-mode theme preference (system | light | dark).
 * Keeps the `dark` class on <html> in sync so Tailwind's dark variant works.
 */
export function useDarkMode() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark" || saved === "system") {
        return saved as ThemeMode;
      }
      
      // Migrate old boolean and clean up
      const old = localStorage.getItem("aqs_dark_mode");
      if (old !== null) {
        const migrated: ThemeMode = old === "true" ? "dark" : "light";
        localStorage.setItem(STORAGE_KEY, migrated);
        localStorage.removeItem("aqs_dark_mode");
        return migrated;
      }
    } catch {
      /* storage may be unavailable */
    }
    return "system";
  });

  const [isDark, setIsDark] = useState(() => {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateIsDark = () => {
      if (theme === "dark") {
        setIsDark(true);
      } else if (theme === "light") {
        setIsDark(false);
      } else {
        setIsDark(mediaQuery.matches);
      }
    };

    updateIsDark();

    const listener = () => {
      if (theme === "system") {
        setIsDark(mediaQuery.matches);
      }
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      /* storage may be unavailable */
    }
  };

  return { theme, setTheme, isDark };
}
