"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useApp } from "./Providers";
import { Icon } from "./Icon";
import {
  toISODate,
  formatGregorian,
  formatHijri,
  gregorianToHijri,
  hijriToISO,
  hijriMonthLength,
  weekdayOf,
  HIJRI_MONTHS_AR,
  GREGORIAN_MONTHS_AR,
  WEEKDAYS_AR,
} from "@/lib/dates";

type Cal = "gregorian" | "hijri";

interface ViewState {
  cal: Cal;
  y: number; // السنة في التقويم النشط
  m: number; // الشهر (1-12)
}

/** يحسب السنة/الشهر في تقويم معيّن من تاريخ ISO */
function viewFromISO(iso: string, cal: Cal): { y: number; m: number } {
  if (cal === "hijri") {
    const h = gregorianToHijri(iso);
    return { y: h.hy, m: h.hm };
  }
  const [y, m] = iso.split("-").map(Number);
  return { y, m };
}

function todayISO(): string {
  return toISODate(new Date());
}

interface DayCell {
  iso: string;
  primary: number; // رقم اليوم في التقويم النشط
  secondary: number; // رقم اليوم في التقويم الآخر
  inMonth: boolean;
}

/** يبني شبكة أيام الشهر المعروض (مع أيام التعبئة من الأسبوع) */
function buildGrid(view: ViewState): { cells: DayCell[]; label: string } {
  let firstISO: string;
  let daysInMonth: number;
  let label: string;

  if (view.cal === "gregorian") {
    const mm = String(view.m).padStart(2, "0");
    firstISO = `${view.y}-${mm}-01`;
    daysInMonth = new Date(Date.UTC(view.y, view.m, 0)).getUTCDate();
    label = `${GREGORIAN_MONTHS_AR[view.m - 1]} ${view.y}`;
  } else {
    firstISO = hijriToISO(view.y, view.m, 1);
    daysInMonth = hijriMonthLength(view.y, view.m);
    label = `${HIJRI_MONTHS_AR[view.m - 1]} ${view.y} هـ`;
  }

  const startWeekday = weekdayOf(firstISO); // 0=أحد
  const cells: DayCell[] = [];

  // خلايا فارغة قبل أول يوم
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ iso: "", primary: 0, secondary: 0, inMonth: false });
  }

  const baseDate = new Date(firstISO + "T12:00:00Z");
  for (let d = 0; d < daysInMonth; d++) {
    const iso = toISODate(new Date(baseDate.getTime() + d * 86_400_000));
    // الرقم في التقويم الآخر (للعرض الصغير أسفل اليوم)
    const secondary =
      view.cal === "gregorian"
        ? gregorianToHijri(iso).hd
        : Number(iso.split("-")[2]);
    cells.push({
      iso,
      primary: d + 1, // رقم اليوم في الشهر النشط = التسلسل
      secondary,
      inMonth: true,
    });
  }
  return { cells, label };
}

export function DatePicker({
  value,
  onChange,
  placeholder = "اختر التاريخ",
}: {
  value: string; // ISO ميلادي أو ""
  onChange: (iso: string) => void;
  placeholder?: string;
}) {
  const { calendar } = useApp();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ViewState>(() => {
    const base = value || todayISO();
    const v = viewFromISO(base, calendar);
    return { cal: calendar, y: v.y, m: v.m };
  });
  const ref = useRef<HTMLDivElement>(null);

  // أغلق عند النقر خارج المكوّن
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // عند الفتح، اضبط العرض على التاريخ المختار أو اليوم
  useEffect(() => {
    if (open) {
      const base = value || todayISO();
      const v = viewFromISO(base, view.cal);
      setView((prev) => ({ ...prev, y: v.y, m: v.m }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const { cells, label } = useMemo(() => buildGrid(view), [view]);

  const otherCal: Cal = view.cal === "gregorian" ? "hijri" : "gregorian";

  function setCalendar(cal: Cal) {
    const base = value || todayISO();
    const v = viewFromISO(base, cal);
    setView({ cal, y: v.y, m: v.m });
  }

  function navigate(dir: -1 | 1) {
    setView((prev) => {
      let { y, m } = prev;
      m += dir;
      if (m < 1) { m = 12; y -= 1; }
      else if (m > 12) { m = 1; y += 1; }
      return { ...prev, y, m };
    });
  }

  function pick(iso: string) {
    onChange(iso);
    setOpen(false);
  }

  const inputStyle = {
    background: "var(--color-paper)",
    borderColor: "var(--color-border)",
    color: "var(--color-ink)",
  };

  // نص الحقل: التاريخ في التقويم النشط + التقويم الآخر بخط صغير
  const primaryText = value
    ? calendar === "hijri" ? formatHijri(value) : formatGregorian(value)
    : "";
  const secondaryText = value
    ? calendar === "hijri" ? formatGregorian(value) : formatHijri(value)
    : "";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-right text-sm outline-none transition-colors"
        style={inputStyle}
      >
        <span className="flex flex-col">
          {value ? (
            <>
              <span className="tabular font-medium" style={{ color: "var(--color-ink)" }}>{primaryText}</span>
              <span className="tabular text-xs" style={{ color: "var(--color-pending)" }}>{secondaryText}</span>
            </>
          ) : (
            <span style={{ color: "var(--color-pending)" }}>{placeholder}</span>
          )}
        </span>
        <span style={{ color: "var(--color-pending)" }}><Icon name="calendar" size={18} /></span>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 w-[19rem] rounded-xl border p-3 shadow-lg"
          style={{ background: "var(--color-paper-raised)", borderColor: "var(--color-border)" }}
        >
          {/* مبدّل التقويم */}
          <div className="mb-3 flex rounded-lg border p-0.5" style={{ borderColor: "var(--color-border)" }}>
            {(["gregorian", "hijri"] as Cal[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCalendar(c)}
                className="flex-1 rounded-md py-1.5 text-xs font-bold transition-colors"
                style={
                  view.cal === c
                    ? { background: "var(--color-primary)", color: "#fff" }
                    : { color: "var(--color-pending)" }
                }
              >
                {c === "gregorian" ? "ميلادي" : "هجري"}
              </button>
            ))}
          </div>

          {/* التنقّل بين الأشهر */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-[var(--color-surface)]"
              style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}
              aria-label="الشهر السابق"
            >‹</button>
            <span className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>{label}</span>
            <button
              type="button"
              onClick={() => navigate(1)}
              className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-[var(--color-surface)]"
              style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}
              aria-label="الشهر التالي"
            >›</button>
          </div>

          {/* رؤوس أيام الأسبوع */}
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS_AR.map((w) => (
              <div key={w} className="py-1 text-[10px] font-medium" style={{ color: "var(--color-pending)" }}>
                {w}
              </div>
            ))}
            {cells.map((cell, i) => {
              if (!cell.inMonth) return <div key={i} />;
              const isSelected = cell.iso === value;
              const isToday = cell.iso === todayISO();
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(cell.iso)}
                  className="flex flex-col items-center rounded-md py-1 text-sm transition-colors hover:bg-[var(--color-surface)]"
                  style={
                    isSelected
                      ? { background: "var(--color-primary)", color: "#fff" }
                      : isToday
                      ? { background: "var(--color-primary-light)", color: "var(--color-primary)" }
                      : { color: "var(--color-ink)" }
                  }
                >
                  <span className="tabular font-medium leading-none">{cell.primary}</span>
                  <span
                    className="tabular text-[9px] leading-tight"
                    style={{ color: isSelected ? "rgba(255,255,255,0.7)" : "var(--color-pending)" }}
                  >
                    {cell.secondary}
                  </span>
                </button>
              );
            })}
          </div>

          {/* إجراءات */}
          <div className="mt-2 flex items-center justify-between border-t pt-2" style={{ borderColor: "var(--color-border)" }}>
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="text-xs font-medium"
              style={{ color: "var(--color-pending)" }}
            >
              مسح
            </button>
            <button
              type="button"
              onClick={() => pick(todayISO())}
              className="text-xs font-bold"
              style={{ color: "var(--color-primary)" }}
            >
              اليوم
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
