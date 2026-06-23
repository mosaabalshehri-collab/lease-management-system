import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listDepartmentContracts } from "@/lib/queries";
import { Badge, Card } from "@/components/ui";
import { DIRECTION_LABELS_AR, COUNTERPARTY_LABEL_AR, DECISION_LABELS_AR } from "@/lib/types";

export default async function ApprovalsPage() {
  const user = (await getCurrentUser())!;
  if (user.role !== "department" || user.department_id == null) redirect("/dashboard");

  const contracts = listDepartmentContracts(user.department_id);
  const pending = contracts.filter((c) => c.decision === null);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>الموافقات</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-pending)" }}>
          العقود المعروضة على إدارتك ({pending.length} بانتظار قرارك)
        </p>
      </div>

      {contracts.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sm" style={{ color: "var(--color-pending)" }}>
            لا توجد عقود مرتبطة بإدارتك
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {contracts.map((c) => (
            <Link key={c.contract_id} href={`/contracts/${c.contract_id}`}>
              <Card className="card-interactive">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone={c.direction === "leased_in" ? "payable" : "receivable"}>
                        {DIRECTION_LABELS_AR[c.direction]}
                      </Badge>
                    </div>
                    <div className="mt-2 text-sm font-bold" style={{ color: "var(--color-ink)" }}>{c.title}</div>
                    <div className="mt-0.5 text-xs" style={{ color: "var(--color-pending)" }}>
                      {COUNTERPARTY_LABEL_AR[c.direction]}: {c.counterparty_name}
                    </div>
                  </div>
                  {c.decision ? (
                    <Badge tone={c.decision === "approved" ? "approved" : "rejected"}>
                      {DECISION_LABELS_AR[c.decision]}
                    </Badge>
                  ) : (
                    <Badge tone="pending">بانتظار القرار</Badge>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
