"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * A generic hook that syncs React state with localStorage.
 * SSR-safe: returns defaultValue during server render, hydrates from
 * localStorage on mount.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount (client only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored));
      }
    } catch {
      // If JSON parse fails, keep defaultValue
    }
    setHydrated(true);
  }, [key]);

  // Persist to localStorage whenever value changes (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable — fail silently
    }
  }, [key, value, hydrated]);

  const setStoredValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue(newValue);
    },
    []
  );

  return [value, setStoredValue];
}
