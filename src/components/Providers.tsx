"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

/**
 * موفّرات الحالة على مستوى التطبيق:
 * - الثيم (داكن/فاتح) مع الحفظ في localStorage
 * - تفضيل التقويم (هجري/ميلادي) للعرض، مع الحفظ
 */

type Theme = "light" | "dark";
type Calendar = "gregorian" | "hijri";

interface AppCtx {
  theme: Theme;
  toggleTheme: () => void;
  calendar: Calendar;
  toggleCalendar: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [calendar, setCalendar] = useState<Calendar>("gregorian");

  useEffect(() => {
    const t = (localStorage.getItem("theme") as Theme) ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(t);
    const c = (localStorage.getItem("calendar") as Calendar) || "gregorian";
    setCalendar(c);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }, []);

  const toggleCalendar = useCallback(() => {
    setCalendar((prev) => {
      const next = prev === "hijri" ? "gregorian" : "hijri";
      localStorage.setItem("calendar", next);
      return next;
    });
  }, []);

  return (
    <Ctx.Provider value={{ theme, toggleTheme, calendar, toggleCalendar }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within Providers");
  return ctx;
}
