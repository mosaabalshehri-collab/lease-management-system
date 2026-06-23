import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DepartmentsManager } from "@/components/DepartmentsManager";

export default async function DepartmentsPage() {
  const user = (await getCurrentUser())!;
  if (user.role !== "admin") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>الإدارات</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-pending)" }}>
          إدارة الأقسام المعنية بالموافقة على العقود
        </p>
      </div>
      <DepartmentsManager />
    </div>
  );
}
