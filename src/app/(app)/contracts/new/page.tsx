"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  generatePaymentSchedule,
  FREQUENCY_LABELS_AR,
  formatSAR,
  formatDate,
  type PaymentFrequency,
} from "@/lib/dates";
import { DIRECTION_FULL_AR, COUNTERPARTY_LABEL_AR, type Direction } from "@/lib/types";
import { useApp } from "@/components/Providers";
import { Icon } from "@/components/Icon";
import { DatePicker } from "@/components/DatePicker";

interface Dept {
  id: number;
  name: string;
  is_active: number;
}

const FREQS: PaymentFrequency[] = ["monthly", "quarterly", "four_monthly", "semi_annual", "annual"];

const inputStyle = {
  background: "var(--color-paper)",
  borderColor: "var(--color-border)",
  color: "var(--color-ink)",
};

export default function NewContractPage() {
  const router = useRouter();
  const { calendar } = useApp();
  const [depts, setDepts] = useState<Dept[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [direction, setDirection] = useState<Direction>("leased_in");
  const [title, setTitle] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [reason, setReason] = useState("");
  const [frequency, setFrequency] = useState<PaymentFrequency>("monthly");
  const [selectedDepts, setSelectedDepts] = useState<number[]>([]);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => setDepts((d.departments || []).filter((x: Dept) => x.is_active)))
      .catch(() => {});
  }, []);

  // معاينة جدول الدفعات (نفس منطق الخادم)
  const schedule = useMemo(() => {
    const amt = Number(totalAmount);
    if (!startDate || !endDate || !amt || amt <= 0 || endDate <= startDate) return [];
    return generatePaymentSchedule(startDate, endDate, amt, frequency);
  }, [startDate, endDate, totalAmount, frequency]);

  function toggleDept(id: number) {
    setSelectedDepts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("direction", direction);
      fd.set("title", title);
      fd.set("counterparty_name", counterparty);
      fd.set("start_date", startDate);
      fd.set("end_date", endDate);
      fd.set("total_amount", totalAmount);
      fd.set("reason", reason);
      fd.set("payment_frequency", frequency);
      selectedDepts.forEach((id) => fd.append("department_ids", String(id)));
      if (file) fd.set("file", file);

      const res = await fetch("/api/contracts", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذّر إنشاء العقد");
        return;
      }
      router.push(`/contracts/${data.id}`);
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }

  const card = {
    background: "var(--color-paper-raised)",
    borderColor: "var(--color-border)",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>
          عقد جديد
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-pending)" }}>
          سجّل بيانات العقد وسيُولّد جدول الدفعات تلقائياً
        </p>
      </div>

      {/* اتجاه العقد */}
      <div className="rounded-xl border p-5" style={card}>
        <label className="mb-3 block text-sm font-bold" style={{ color: "var(--color-ink)" }}>
          اتجاه العقد
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(["leased_in", "leased_out"] as Direction[]).map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className="rounded-lg border-2 p-4 text-right transition-colors"
              style={
                direction === d
                  ? {
                      borderColor: d === "leased_in" ? "var(--color-payable)" : "var(--color-receivable)",
                      background: d === "leased_in" ? "var(--color-payable-bg)" : "var(--color-receivable-bg)",
                    }
                  : { borderColor: "var(--color-border)" }
              }
            >
              <div style={{ color: d === "leased_in" ? "var(--color-payable)" : "var(--color-receivable)" }}>
                <Icon name={d === "leased_in" ? "leased-in" : "leased-out"} size={26} />
              </div>
              <div className="mt-1 text-sm font-bold" style={{ color: "var(--color-ink)" }}>
                {d === "leased_in" ? "نستأجر" : "نؤجّر"}
              </div>
              <div className="text-xs" style={{ color: "var(--color-pending)" }}>
                {d === "leased_in" ? "مبالغ علينا" : "مبالغ لنا"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* البيانات الأساسية */}
      <div className="space-y-4 rounded-xl border p-5" style={card}>
        <Field label="عنوان العقد">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={inputStyle} placeholder="مثال: إيجار مستودع رئيسي" />
        </Field>

        <Field label={COUNTERPARTY_LABEL_AR[direction]}>
          <input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={inputStyle} placeholder="اسم الطرف الآخر" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="تاريخ بداية العقد">
            <DatePicker value={startDate} onChange={setStartDate} placeholder="اختر تاريخ البداية" />
          </Field>
          <Field label="تاريخ نهاية العقد">
            <DatePicker value={endDate} onChange={setEndDate} placeholder="اختر تاريخ النهاية" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="القيمة الإجمالية (ريال)">
            <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} dir="ltr" className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={inputStyle} placeholder="0.00" />
          </Field>
          <Field label="دورية السداد">
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as PaymentFrequency)} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={inputStyle}>
              {FREQS.map((f) => (
                <option key={f} value={f}>{FREQUENCY_LABELS_AR[f]}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="سبب الاستئجار / التأجير">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={inputStyle} placeholder="لماذا تم استئجار/تأجير هذا المكان؟" />
        </Field>

        <Field label="ملف العقد الأصلي (PDF أو صورة)">
          <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full rounded-lg border px-3 py-2 text-sm outline-none file:ml-3 file:rounded file:border-0 file:bg-[var(--color-primary-light)] file:px-3 file:py-1 file:text-[var(--color-primary)]" style={inputStyle} />
        </Field>
      </div>

      {/* الإدارات الموافِقة */}
      <div className="rounded-xl border p-5" style={card}>
        <label className="mb-3 block text-sm font-bold" style={{ color: "var(--color-ink)" }}>
          الإدارات المطلوب موافقتها
        </label>
        {depts.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-pending)" }}>
            لا توجد إدارات. أضف إدارات من صفحة الإدارات أولاً.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {depts.map((d) => (
              <button
                key={d.id}
                onClick={() => toggleDept(d.id)}
                className="rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                style={
                  selectedDepts.includes(d.id)
                    ? { background: "var(--color-primary)", color: "#fff", borderColor: "var(--color-primary)" }
                    : { color: "var(--color-ink)", borderColor: "var(--color-border)" }
                }
              >
                {selectedDepts.includes(d.id) ? "✓ " : ""}{d.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* معاينة جدول الدفعات */}
      {schedule.length > 0 && (
        <div className="rounded-xl border p-5" style={card}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>
              معاينة جدول الدفعات
            </h3>
            <span className="text-xs" style={{ color: "var(--color-pending)" }}>
              {schedule.length} دفعة
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border" style={{ borderColor: "var(--color-border)" }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: "var(--color-surface)" }}>
                <tr style={{ color: "var(--color-pending)" }}>
                  <th className="px-3 py-2 text-right font-medium">#</th>
                  <th className="px-3 py-2 text-right font-medium">تاريخ الاستحقاق</th>
                  <th className="px-3 py-2 text-left font-medium">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((p) => (
                  <tr key={p.seq} className="border-t" style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}>
                    <td className="px-3 py-2 tabular">{p.seq}</td>
                    <td className="px-3 py-2 tabular">{formatDate(p.due_date, calendar)}</td>
                    <td className="px-3 py-2 text-left tabular">{formatSAR(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "var(--color-status-expired-bg)", color: "var(--color-status-expired)" }}>
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-lg px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--color-primary)" }}
        >
          {loading ? "جارٍ الحفظ..." : "حفظ العقد"}
        </button>
        <button
          onClick={() => router.back()}
          className="rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors"
          style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-ink)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
