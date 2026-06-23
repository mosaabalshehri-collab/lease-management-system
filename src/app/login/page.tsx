"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذّر تسجيل الدخول");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dotted-bg flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div
          className="rounded-2xl border p-8 shadow-sm"
          style={{ background: "var(--color-paper-raised)", borderColor: "var(--color-border)" }}
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo size={56} />
            <h1 className="mt-4 text-xl font-bold" style={{ color: "var(--color-ink)" }}>
              نظام إدارة عقود الإيجار
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--color-pending)" }}>
              سجّل دخولك للمتابعة
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                dir="ltr"
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                style={{ background: "var(--color-paper)", borderColor: "var(--color-border)", color: "var(--color-ink)" }}
                placeholder="admin@lease.sa"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                dir="ltr"
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                style={{ background: "var(--color-paper)", borderColor: "var(--color-border)", color: "var(--color-ink)" }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                className="rounded-lg px-3 py-2 text-sm"
                style={{ background: "var(--color-status-expired-bg)", color: "var(--color-status-expired)" }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-lg py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--color-primary)" }}
            >
              {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
            </button>
          </div>

          <div
            className="mt-6 rounded-lg border border-dashed px-3 py-3 text-xs leading-relaxed"
            style={{ borderColor: "var(--color-border)", color: "var(--color-pending)" }}
          >
            <div className="mb-1 font-bold">حسابات تجريبية:</div>
            <div dir="ltr" className="text-right">admin@lease.sa / Admin@123 — مدير</div>
            <div dir="ltr" className="text-right">finance@lease.sa / Dept@123 — إدارة</div>
            <div dir="ltr" className="text-right">viewer@lease.sa / Viewer@123 — مشاهد</div>
          </div>
        </div>
      </div>
    </div>
  );
}
