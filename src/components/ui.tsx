"use client";

import { useApp } from "./Providers";
import { formatDate, formatSAR } from "@/lib/dates";

/** عرض تاريخ يتبع تفضيل التقويم العالمي (هجري/ميلادي) */
export function DateLabel({ iso }: { iso: string }) {
  const { calendar } = useApp();
  return <span className="tabular">{formatDate(iso, calendar)}</span>;
}

/** مبلغ بالريال السعودي */
export function Money({ value, className = "" }: { value: number; className?: string }) {
  return <span className={`tabular ${className}`}>{formatSAR(value)}</span>;
}

type BadgeTone =
  | "active" | "expiring" | "expired"
  | "paid" | "due_soon" | "overdue" | "scheduled"
  | "approved" | "rejected" | "pending"
  | "payable" | "receivable";

const TONE_VARS: Record<BadgeTone, { bg: string; fg: string }> = {
  active: { bg: "--color-status-active-bg", fg: "--color-status-active" },
  expiring: { bg: "--color-status-warning-bg", fg: "--color-status-warning" },
  expired: { bg: "--color-status-expired-bg", fg: "--color-status-expired" },
  paid: { bg: "--color-status-paid-bg", fg: "--color-status-paid" },
  due_soon: { bg: "--color-status-due-bg", fg: "--color-status-due" },
  overdue: { bg: "--color-status-overdue-bg", fg: "--color-status-overdue" },
  scheduled: { bg: "--color-pending-bg", fg: "--color-pending" },
  approved: { bg: "--color-approved-bg", fg: "--color-approved" },
  rejected: { bg: "--color-rejected-bg", fg: "--color-rejected" },
  pending: { bg: "--color-pending-bg", fg: "--color-pending" },
  payable: { bg: "--color-payable-bg", fg: "--color-payable" },
  receivable: { bg: "--color-receivable-bg", fg: "--color-receivable" },
};

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  const v = TONE_VARS[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ background: `var(${v.bg})`, color: `var(${v.fg})` }}
    >
      {children}
    </span>
  );
}

/** بطاقة بيضاء مرفوعة بحدود خفيفة */
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border p-5 ${className}`}
      style={{ background: "var(--color-paper-raised)", borderColor: "var(--color-border)" }}
    >
      {children}
    </div>
  );
}
