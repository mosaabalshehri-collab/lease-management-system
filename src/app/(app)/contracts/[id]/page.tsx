import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, canViewContract } from "@/lib/auth";
import { getContractDetail, contractStatus, paymentStatus } from "@/lib/queries";
import { Money, DateLabel, Badge, Card } from "@/components/ui";
import { PayToggle, ApprovalForm, DeleteContractButton } from "@/components/ContractActions";
import { Icon } from "@/components/Icon";
import {
  DIRECTION_LABELS_AR,
  DIRECTION_FULL_AR,
  COUNTERPARTY_LABEL_AR,
  CONTRACT_STATUS_LABELS_AR,
  PAYMENT_STATUS_LABELS_AR,
  DECISION_LABELS_AR,
} from "@/lib/types";
import { FREQUENCY_LABELS_AR } from "@/lib/dates";
import type { PaymentFrequency } from "@/lib/dates";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const contract = getContractDetail(Number(id));
  if (!contract) notFound();

  const deptIds = contract.departments.map((d) => d.id);
  if (!canViewContract(user, deptIds)) redirect("/dashboard");

  const isAdmin = user.role === "admin";
  const status = contractStatus(contract.end_date);
  const paidTotal = contract.payments.filter((p) => p.paid_at).reduce((s, p) => s + p.amount, 0);
  const outstanding = contract.total_amount - paidTotal;

  // هل يحق للمستخدم (مستخدم إدارة) الموافقة على هذا العقد؟
  const canUserApprove =
    user.role === "department" &&
    user.department_id != null &&
    deptIds.includes(user.department_id);
  const myApproval = contract.approvals.find((a) => a.department_id === user.department_id);

  const flowTone = contract.direction === "leased_in" ? "payable" : "receivable";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-pending)" }}>
        <Link href="/contracts" className="hover:underline">العقود</Link>
        <span>/</span>
        <span style={{ color: "var(--color-ink)" }}>{contract.title}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone={flowTone}>{DIRECTION_LABELS_AR[contract.direction]}</Badge>
            <Badge tone={status}>{CONTRACT_STATUS_LABELS_AR[status]}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold" style={{ color: "var(--color-ink)" }}>
            {contract.title}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-pending)" }}>
            {DIRECTION_FULL_AR[contract.direction]}
          </p>
        </div>
        {isAdmin && <DeleteContractButton contractId={contract.id} />}
      </div>

      {/* البيانات الأساسية */}
      <Card>
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Info label={COUNTERPARTY_LABEL_AR[contract.direction]} value={contract.counterparty_name} />
          <Info label="القيمة الإجمالية" value={<Money value={contract.total_amount} />} />
          <Info label="تاريخ البداية" value={<DateLabel iso={contract.start_date} />} />
          <Info label="تاريخ النهاية" value={<DateLabel iso={contract.end_date} />} />
          <Info label="دورية السداد" value={FREQUENCY_LABELS_AR[contract.payment_frequency as PaymentFrequency]} />
          <Info label="المسجِّل" value={contract.created_by_name || "—"} />
          {contract.reason && (
            <div className="sm:col-span-2">
              <Info label="سبب الاستئجار/التأجير" value={contract.reason} />
            </div>
          )}
        </div>

        {/* ملف العقد */}
        {contract.file_path && (
          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
            <a
              href={`/api/contracts/${contract.id}/file`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{ borderColor: "var(--color-border)", color: "var(--color-primary)" }}
            >
              <Icon name="file" size={16} /> {contract.file_name || "ملف العقد"}
            </a>
          </div>
        )}
      </Card>

      {/* ملخص السداد */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryBox label="الإجمالي" value={<Money value={contract.total_amount} />} />
        <SummaryBox label="المسدَّد" value={<Money value={paidTotal} />} tone="var(--color-status-paid)" />
        <SummaryBox label="المتبقي" value={<Money value={outstanding} />} tone="var(--color-status-warning)" />
      </div>

      {/* جدول الدفعات */}
      <Card>
        <h2 className="mb-4 text-lg font-bold" style={{ color: "var(--color-ink)" }}>
          جدول الدفعات ({contract.payments.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "var(--color-pending)" }}>
                <th className="px-3 py-2 text-right font-medium">#</th>
                <th className="px-3 py-2 text-right font-medium">تاريخ الاستحقاق</th>
                <th className="px-3 py-2 text-right font-medium">المبلغ</th>
                <th className="px-3 py-2 text-right font-medium">الحالة</th>
                {isAdmin && <th className="px-3 py-2 text-left font-medium">إجراء</th>}
              </tr>
            </thead>
            <tbody>
              {contract.payments.map((p) => {
                const st = paymentStatus(p.due_date, p.paid_at);
                return (
                  <tr key={p.id} className="border-t" style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}>
                    <td className="px-3 py-2.5 tabular">{p.seq}</td>
                    <td className="px-3 py-2.5"><DateLabel iso={p.due_date} /></td>
                    <td className="px-3 py-2.5"><Money value={p.amount} /></td>
                    <td className="px-3 py-2.5">
                      <Badge tone={st}>{PAYMENT_STATUS_LABELS_AR[st]}</Badge>
                    </td>
                    {isAdmin && (
                      <td className="px-3 py-2.5 text-left">
                        <PayToggle paymentId={p.id} paid={!!p.paid_at} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* الموافقات */}
      <Card>
        <h2 className="mb-4 text-lg font-bold" style={{ color: "var(--color-ink)" }}>
          موافقات الإدارات
        </h2>

        {/* قائمة الإدارات المطلوبة وحالة كل واحدة */}
        <div className="space-y-2">
          {contract.departments.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-pending)" }}>
              لم تُربط إدارات بهذا العقد
            </p>
          ) : (
            contract.departments.map((d) => {
              const ap = contract.approvals.find((a) => a.department_id === d.id);
              return (
                <div
                  key={d.id}
                  className="rounded-lg border p-3"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                      🏢 {d.name}
                    </span>
                    {ap ? (
                      <Badge tone={ap.decision === "approved" ? "approved" : "rejected"}>
                        {DECISION_LABELS_AR[ap.decision]}
                      </Badge>
                    ) : (
                      <Badge tone="pending">بانتظار القرار</Badge>
                    )}
                  </div>
                  {ap?.notes && (
                    <p className="mt-2 text-xs" style={{ color: "var(--color-pending)" }}>
                      ملاحظة: {ap.notes}
                    </p>
                  )}
                  {ap?.rejection_reason && (
                    <p className="mt-2 rounded px-2 py-1.5 text-xs" style={{ background: "var(--color-rejected-bg)", color: "var(--color-rejected)" }}>
                      سبب الرفض: {ap.rejection_reason}
                    </p>
                  )}
                  {ap && (
                    <p className="mt-1 text-xs" style={{ color: "var(--color-pending)" }}>
                      {ap.user_name} · <DateLabel iso={ap.created_at.slice(0, 10)} />
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* نموذج موافقة المستخدم الحالي */}
        {canUserApprove && (
          <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--color-border)" }}>
            <h3 className="mb-3 text-sm font-bold" style={{ color: "var(--color-ink)" }}>
              {myApproval ? "تعديل قرارك" : "سجّل قرار إدارتك"}
            </h3>
            <ApprovalForm contractId={contract.id} />
          </div>
        )}
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs" style={{ color: "var(--color-pending)" }}>{label}</div>
      <div className="mt-0.5 text-sm font-medium" style={{ color: "var(--color-ink)" }}>{value}</div>
    </div>
  );
}

function SummaryBox({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div
      className="rounded-xl border p-4 text-center"
      style={{ background: "var(--color-paper-raised)", borderColor: "var(--color-border)" }}
    >
      <div className="text-xs" style={{ color: "var(--color-pending)" }}>{label}</div>
      <div className="mt-1 text-base font-bold" style={{ color: tone || "var(--color-ink)" }}>{value}</div>
    </div>
  );
}
