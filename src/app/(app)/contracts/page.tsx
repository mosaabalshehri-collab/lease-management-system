import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listContracts } from "@/lib/queries";
import { contractStatus } from "@/lib/queries";
import { Money, DateLabel, Badge, Card } from "@/components/ui";
import {
  DIRECTION_LABELS_AR,
  COUNTERPARTY_LABEL_AR,
  CONTRACT_STATUS_LABELS_AR,
  type Direction,
} from "@/lib/types";
import { FREQUENCY_LABELS_AR } from "@/lib/dates";
import type { PaymentFrequency } from "@/lib/dates";

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ dir?: string }>;
}) {
  const { dir } = await searchParams;
  const user = (await getCurrentUser())!;
  const direction = dir === "leased_in" || dir === "leased_out" ? (dir as Direction) : undefined;
  const contracts = listContracts(user.role, user.department_id, direction);

  const title = direction ? `عقود ${DIRECTION_LABELS_AR[direction]}` : "جميع العقود";
  const isAdmin = user.role === "admin";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>
            {title}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-pending)" }}>
            {contracts.length} عقد
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/contracts/new"
            className="rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--color-primary)" }}
          >
            + عقد جديد
          </Link>
        )}
      </div>

      {/* فلاتر الاتجاه */}
      <div className="flex gap-2">
        <FilterTab href="/contracts" label="الكل" active={!direction} />
        <FilterTab href="/contracts?dir=leased_in" label="نستأجرها" active={direction === "leased_in"} />
        <FilterTab href="/contracts?dir=leased_out" label="نؤجّرها" active={direction === "leased_out"} />
      </div>

      {contracts.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sm" style={{ color: "var(--color-pending)" }}>
            لا توجد عقود
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {contracts.map((c) => {
            const status = contractStatus(c.end_date);
            return (
              <Link key={c.id} href={`/contracts/${c.id}`}>
                <Card className="card-interactive">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge tone={c.direction === "leased_in" ? "payable" : "receivable"}>
                          {DIRECTION_LABELS_AR[c.direction]}
                        </Badge>
                        <Badge tone={status}>{CONTRACT_STATUS_LABELS_AR[status]}</Badge>
                      </div>
                      <h3 className="mt-2 text-base font-bold" style={{ color: "var(--color-ink)" }}>
                        {c.title}
                      </h3>
                      <p className="mt-0.5 text-sm" style={{ color: "var(--color-pending)" }}>
                        {COUNTERPARTY_LABEL_AR[c.direction]}: {c.counterparty_name}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--color-pending)" }}>
                        <span>
                          <DateLabel iso={c.start_date} /> ← <DateLabel iso={c.end_date} />
                        </span>
                        <span>الدورية: {FREQUENCY_LABELS_AR[c.payment_frequency as PaymentFrequency]}</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-bold" style={{ color: "var(--color-ink)" }}>
                        <Money value={c.total_amount} />
                      </div>
                      <div className="mt-1 text-xs" style={{ color: "var(--color-pending)" }}>
                        متبقٍ: <Money value={c.outstanding} />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
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
