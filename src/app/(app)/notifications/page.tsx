import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getActiveAlerts } from "@/lib/queries";
import { Money, DateLabel, Badge, Card } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { DIRECTION_LABELS_AR } from "@/lib/types";

const KIND_LABEL: Record<string, string> = {
  contract_expiry: "اقتراب انتهاء عقد",
  payment_due: "دفعة مستحقة قريباً",
  payment_overdue: "دفعة متأخرة",
};
const KIND_ICON: Record<string, IconName> = {
  contract_expiry: "calendar",
  payment_due: "receivable",
  payment_overdue: "alert",
};

export default async function NotificationsPage() {
  const user = (await getCurrentUser())!;
  const alerts = getActiveAlerts(user.role, user.department_id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>التنبيهات</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-pending)" }}>
          عقود قاربت الانتهاء (خلال 30 يوم) ودفعات مستحقة (خلال 7 أيام) أو متأخرة
        </p>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sm" style={{ color: "var(--color-pending)" }}>
            لا توجد تنبيهات حالياً ✅
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <Link key={i} href={`/contracts/${a.contract_id}`}>
              <Card className="card-interactive">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span style={{ color: a.kind === "payment_overdue" ? "var(--color-status-overdue)" : "var(--color-pending)" }}><Icon name={KIND_ICON[a.kind]} size={20} /></span>
                    <div>
                      <div className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>{a.title}</div>
                      <div className="mt-0.5 text-xs" style={{ color: "var(--color-pending)" }}>
                        {KIND_LABEL[a.kind]} · <DateLabel iso={a.date} /> ·{" "}
                        <Badge tone={a.direction === "leased_in" ? "payable" : "receivable"}>
                          {DIRECTION_LABELS_AR[a.direction]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    {a.amount != null && <Money value={a.amount} className="block text-sm font-medium" />}
                    <Badge tone={a.daysLeft < 0 ? "overdue" : "due_soon"}>
                      {a.daysLeft < 0 ? `متأخر ${Math.abs(a.daysLeft)} يوم` : `خلال ${a.daysLeft} يوم`}
                    </Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
