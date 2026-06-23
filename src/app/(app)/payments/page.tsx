import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listPaymentsByFlow, paymentStatus } from "@/lib/queries";
import { Money, DateLabel, Badge, Card } from "@/components/ui";
import { PAYMENT_STATUS_LABELS_AR } from "@/lib/types";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const flow = type === "receivable" ? "receivable" : "payable";
  const user = (await getCurrentUser())!;
  const payments = listPaymentsByFlow(flow, user.role, user.department_id);

  const unpaid = payments.filter((p) => !p.paid_at);
  const totalUnpaid = unpaid.reduce((s, p) => s + p.amount, 0);
  const isPayable = flow === "payable";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>
          {isPayable ? "مبالغ مطلوبة منّا" : "مبالغ نحصّلها"}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-pending)" }}>
          {isPayable ? "دفعات عقود نستأجرها" : "دفعات عقود نؤجّرها"}
        </p>
      </div>

      <div className="flex gap-2">
        <FilterTab href="/payments?type=payable" label="مطلوبة منّا" active={isPayable} />
        <FilterTab href="/payments?type=receivable" label="نحصّلها" active={!isPayable} />
      </div>

      <div
        className="rounded-xl border p-5"
        style={{
          background: isPayable ? "var(--color-payable-bg)" : "var(--color-receivable-bg)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="text-sm font-medium" style={{ color: isPayable ? "var(--color-payable)" : "var(--color-receivable)" }}>
          إجمالي غير المسدَّد
        </div>
        <div className="mt-1 text-3xl font-bold" style={{ color: isPayable ? "var(--color-payable)" : "var(--color-receivable)" }}>
          <Money value={totalUnpaid} />
        </div>
        <div className="mt-1 text-xs" style={{ color: isPayable ? "var(--color-payable)" : "var(--color-receivable)" }}>
          {unpaid.length} دفعة مستحقة من أصل {payments.length}
        </div>
      </div>

      {payments.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sm" style={{ color: "var(--color-pending)" }}>
            لا توجد دفعات
          </p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--color-pending)" }}>
                  <th className="px-3 py-2 text-right font-medium">العقد</th>
                  <th className="px-3 py-2 text-right font-medium">الطرف</th>
                  <th className="px-3 py-2 text-right font-medium">الاستحقاق</th>
                  <th className="px-3 py-2 text-right font-medium">المبلغ</th>
                  <th className="px-3 py-2 text-right font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const st = paymentStatus(p.due_date, p.paid_at);
                  return (
                    <tr key={p.id} className="border-t" style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}>
                      <td className="px-3 py-2.5">
                        <Link href={`/contracts/${p.contract_id}`} className="font-medium hover:underline" style={{ color: "var(--color-primary)" }}>
                          {p.title}
                        </Link>
                        <span className="mr-1 text-xs" style={{ color: "var(--color-pending)" }}>#{p.seq}</span>
                      </td>
                      <td className="px-3 py-2.5">{p.counterparty_name}</td>
                      <td className="px-3 py-2.5"><DateLabel iso={p.due_date} /></td>
                      <td className="px-3 py-2.5"><Money value={p.amount} /></td>
                      <td className="px-3 py-2.5"><Badge tone={st}>{PAYMENT_STATUS_LABELS_AR[st]}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function FilterTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
      style={
        active
          ? { background: "var(--color-primary)", color: "#fff", borderColor: "var(--color-primary)" }
          : { color: "var(--color-ink)", borderColor: "var(--color-border)" }
      }
    >
      {label}
    </Link>
  );
}
