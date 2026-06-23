"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** زر تبديل سداد دفعة (مدير النظام) */
export function PayToggle({ paymentId, paid }: { paymentId: number; paid: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await fetch(`/api/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !paid }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50"
      style={
        paid
          ? { borderColor: "var(--color-border)", color: "var(--color-pending)" }
          : { borderColor: "var(--color-primary)", color: "var(--color-primary)" }
      }
    >
      {loading ? "..." : paid ? "إلغاء السداد" : "تسجيل السداد"}
    </button>
  );
}

/** نموذج موافقة/رفض الإدارة على العقد */
export function ApprovalForm({ contractId }: { contractId: number }) {
  const router = useRouter();
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    if (decision === "rejected" && !rejectionReason.trim()) {
      setError("سبب الرفض إجباري");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/contracts/${contractId}/approvals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, notes, rejection_reason: rejectionReason }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "تعذّر تسجيل القرار");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => setDecision("approved")}
          className="flex-1 rounded-lg border-2 py-2.5 text-sm font-bold transition-colors"
          style={
            decision === "approved"
              ? { borderColor: "var(--color-approved)", background: "var(--color-approved-bg)", color: "var(--color-approved)" }
              : { borderColor: "var(--color-border)", color: "var(--color-ink)" }
          }
        >
          ✓ موافقة
        </button>
        <button
          onClick={() => setDecision("rejected")}
          className="flex-1 rounded-lg border-2 py-2.5 text-sm font-bold transition-colors"
          style={
            decision === "rejected"
              ? { borderColor: "var(--color-rejected)", background: "var(--color-rejected-bg)", color: "var(--color-rejected)" }
              : { borderColor: "var(--color-border)", color: "var(--color-ink)" }
          }
        >
          ✕ رفض
        </button>
      </div>

      {decision === "approved" && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="ملاحظات (اختياري)"
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
          style={{ background: "var(--color-paper)", borderColor: "var(--color-border)", color: "var(--color-ink)" }}
        />
      )}

      {decision === "rejected" && (
        <textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          rows={2}
          placeholder="سبب الرفض (إجباري)"
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
          style={{ background: "var(--color-paper)", borderColor: "var(--color-rejected)", color: "var(--color-ink)" }}
        />
      )}

      {error && (
        <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "var(--color-rejected-bg)", color: "var(--color-rejected)" }}>
          {error}
        </div>
      )}

      {decision && (
        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-lg py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--color-primary)" }}
        >
          {loading ? "جارٍ الحفظ..." : "تسجيل القرار"}
        </button>
      )}
    </div>
  );
}

/** زر حذف العقد (حذف ناعم - مدير النظام) */
export function DeleteContractButton({ contractId }: { contractId: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function del() {
    setLoading(true);
    await fetch(`/api/contracts/${contractId}`, { method: "DELETE" });
    router.push("/contracts");
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
        style={{ borderColor: "var(--color-rejected)", color: "var(--color-rejected)" }}
      >
        حذف العقد
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm" style={{ color: "var(--color-rejected)" }}>متأكد؟</span>
      <button
        onClick={del}
        disabled={loading}
        className="rounded-lg px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
        style={{ background: "var(--color-rejected)" }}
      >
        {loading ? "..." : "نعم، احذف"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="rounded-lg border px-3 py-2 text-sm"
        style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}
      >
        إلغاء
      </button>
    </div>
  );
}
