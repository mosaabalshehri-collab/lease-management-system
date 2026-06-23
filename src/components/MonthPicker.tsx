"use client";

import { useRouter } from "next/navigation";
import { gregorianMonthName } from "@/lib/dates";

/** اختيار الشهر والسنة للتقرير الشهري */
export function MonthPicker({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const years = [year - 1, year, year + 1];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  function go(y: number, m: number) {
    router.push(`/reports/monthly?year=${y}&month=${m}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={month}
        onChange={(e) => go(year, Number(e.target.value))}
        className="rounded-lg border px-3 py-2 text-sm outline-none"
        style={{ background: "var(--color-paper)", borderColor: "var(--color-border)", color: "var(--color-ink)" }}
      >
        {months.map((m) => (
          <option key={m} value={m}>{gregorianMonthName(m)}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => go(Number(e.target.value), month)}
        className="rounded-lg border px-3 py-2 text-sm outline-none tabular"
        style={{ background: "var(--color-paper)", borderColor: "var(--color-border)", color: "var(--color-ink)" }}
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
