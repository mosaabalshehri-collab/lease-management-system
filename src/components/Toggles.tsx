"use client";

import { useApp } from "./Providers";
import { Icon } from "./Icon";

/** زر تبديل الوضع الداكن/الفاتح */
export function ThemeToggle() {
  const { theme, toggleTheme } = useApp();
  return (
    <button
      onClick={toggleTheme}
      aria-label="تبديل الوضع الداكن"
      className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-[var(--color-surface)]"
      style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
    </button>
  );
}

/** زر تبديل التقويم هجري/ميلادي */
export function CalendarToggle() {
  const { calendar, toggleCalendar } = useApp();
  return (
    <button
      onClick={toggleCalendar}
      aria-label="تبديل التقويم"
      className="flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-[var(--color-surface)]"
      style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}
    >
      <Icon name="calendar-toggle" size={16} />
      <span>{calendar === "hijri" ? "هجري" : "ميلادي"}</span>
    </button>
  );
}
