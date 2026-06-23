import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardSummary, getActiveAlerts } from "@/lib/queries";
import { Card, Money, DateLabel, Badge } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { DIRECTION_LABELS_AR } from "@/lib/types";

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;
  const s = getDashboardSummary(user.role, user.department_id);
  const alerts = getActiveAlerts(user.role, user.department_id).slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>
          لوحة المعلومات
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-pending)" }}>
          نظرة عامة على العقود والمبالغ المستحقة
        </p>
      </div>

      {/* الإجماليان الرئيسيان */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div
          className="rounded-xl border p-5"
          style={{ background: "var(--color-receivable-bg)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--color-receivable)" }}>
              <Icon name="receivable" size={18} /> إجمالي ما نحصّله
            </span>
            <Badge tone="receivable">نؤجّر · {s.countLeasedOut}</Badge>
          </div>
          <div className="mt-3 text-3xl font-bold" style={{ color: "var(--color-receivable)" }}>
            <Money value={s.totalReceivable} />
          </div>
          <div className="mt-2 text-xs" style={{ color: "var(--color-receivable)" }}>
            غير محصّل: <Money value={s.receivableOutstanding} />
          </div>
        </div>

        <div
          className="rounded-xl border p-5"
          style={{ background: "var(--color-payable-bg)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--color-payable)" }}>
              <Icon name="payable" size={18} /> إجمالي ما ندفعه
            </span>
            <Badge tone="payable">نستأجر · {s.countLeasedIn}</Badge>
          </div>
          <div className="mt-3 text-3xl font-bold" style={{ color: "var(--color-payable)" }}>
            <Money value={s.totalPayable} />
          </div>
          <div className="mt-2 text-xs" style={{ color: "var(--color-payable)" }}>
            غير مدفوع: <Money value={s.payableOutstanding} />
          </div>
        </div>
      </div>

      {/* مؤشرات سريعة */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="عقود بصفتنا مستأجرين" value={s.countLeasedIn} icon="leased-in" />
        <StatCard label="عقود بصفتنا مؤجرين" value={s.countLeasedOut} icon="leased-out" />
        <StatCard label="عقود قاربت الانتهاء" value={s.expiringCount} icon="clock" tone="warning" />
        <StatCard label="دفعات متأخرة" value={s.overduePayments} icon="alert" tone="danger" />
      </div>

      {/* التنبيهات */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold" style={{ color: "var(--color-ink)" }}>
            <Icon name="bell" size={18} /> التنبيهات النشطة
          </h2>
          <Link href="/notifications" className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
            عرض الكل
          </Link>
        </div>
        {alerts.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: "var(--color-pending)" }}>
            لا توجد تنبيهات حالياً ✅
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <Link
                key={i}
                href={`/contracts/${a.contract_id}`}
                className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:opacity-80"
                style={{ borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ color: "var(--color-pending)" }}><Icon name={a.kind === "contract_expiry" ? "calendar" : "receivable"} size={18} /></span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                      {a.title}
                    </div>
                    <div className="text-xs" style={{ color: "var(--color-pending)" }}>
                      {a.kind === "contract_expiry"
                        ? "ينتهي العقد"
                        : a.kind === "payment_overdue"
                        ? "دفعة متأخرة"
                        : "دفعة مستحقة قريباً"}{" "}
                      · <DateLabel iso={a.date} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.amount != null && <Money value={a.amount} className="text-sm font-medium" />}
                  <Badge tone={a.daysLeft < 0 ? "overdue" : "due_soon"}>
                    {a.daysLeft < 0 ? `متأخر ${Math.abs(a.daysLeft)} يوم` : `خلال ${a.daysLeft} يوم`}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: IconName;
  tone?: "warning" | "danger";
}) {
  const color =
    tone === "warning"
      ? "var(--color-status-warning)"
      : tone === "danger"
      ? "var(--color-status-expired)"
      : "var(--color-ink)";
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "var(--color-paper-raised)", borderColor: "var(--color-border)" }}
    >
      <div className="mb-2" style={{ color }}><Icon name={icon} size={22} /></div>
      <div className="text-2xl font-bold tabular" style={{ color }}>
        {value}
      </div>
      <div className="text-xs" style={{ color: "var(--color-pending)" }}>
        {label}
      </div>
    </div>
  );
}
