import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getMonthlyReport } from "@/lib/queries";
import { Money, DateLabel, Badge, Card } from "@/components/ui";
import { DIRECTION_LABELS_AR } from "@/lib/types";
import { gregorianMonthName } from "@/lib/dates";
import { MonthPicker } from "@/components/MonthPicker";

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.year) || now.getUTCFullYear();
  const month = Number(sp.month) || now.getUTCMonth() + 1;

  const user = (await getCurrentUser())!;
  const { rows, totalPayable, totalReceivable } = getMonthlyReport(
    year,
    month,
    user.role,
    user.department_id
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>
          التقرير الشهري
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-pending)" }}>
          المبالغ المستحقة خلال {gregorianMonthName(month)} {year}
        </p>
      </div>

      <MonthPicker year={year} month={month} />

      {/* الإجماليان */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border p-5" style={{ background: "var(--color-payable-bg)", borderColor: "var(--color-border)" }}>
          <div className="text-sm font-medium" style={{ color: "var(--color-payable)" }}>💸 مطلوب منّا هذا الشهر</div>
          <div className="mt-1 text-2xl font-bold" style={{ color: "var(--color-payable)" }}>
            <Money value={totalPayable} />
          </div>
        </div>
        <div className="rounded-xl border p-5" style={{ background: "var(--color-receivable-bg)", borderColor: "var(--color-border)" }}>
          <div className="text-sm font-medium" style={{ color: "var(--color-receivable)" }}>💰 نحصّله هذا الشهر</div>
          <div className="mt-1 text-2xl font-bold" style={{ color: "var(--color-receivable)" }}>
            <Money value={totalReceivable} />
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sm" style={{ color: "var(--color-pending)" }}>
            لا توجد دفعات مستحقة في هذا الشهر
          </p>
        </Card>
      ) : (
        <Card>
          <h2 className="mb-4 text-lg font-bold" style={{ color: "var(--color-ink)" }}>
            العقود المستحقة ({rows.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--color-pending)" }}>
                  <th className="px-3 py-2 text-right font-medium">العقد</th>
                  <th className="px-3 py-2 text-right font-medium">الاتجاه</th>
                  <th className="px-3 py-2 text-right font-medium">الاستحقاق</th>
                  <th className="px-3 py-2 text-right font-medium">المبلغ</th>
                  <th className="px-3 py-2 text-right font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}>
                    <td className="px-3 py-2.5">
                      <Link href={`/contracts/${r.contract_id}`} className="font-medium hover:underline" style={{ color: "var(--color-primary)" }}>
                        {r.title}
                      </Link>
                      <div className="text-xs" style={{ color: "var(--color-pending)" }}>{r.counterparty_name}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={r.direction === "leased_in" ? "payable" : "receivable"}>
                        {DIRECTION_LABELS_AR[r.direction]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5"><DateLabel iso={r.due_date} /></td>
                    <td className="px-3 py-2.5"><Money value={r.amount} /></td>
                    <td className="px-3 py-2.5">
                      <Badge tone={r.paid_at ? "paid" : "due_soon"}>{r.paid_at ? "مسدَّدة" : "غير مسدَّدة"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
