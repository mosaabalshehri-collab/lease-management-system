import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAlertCount } from "@/lib/queries";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const alertCount = getAlertCount(user.role, user.department_id);

  return (
    <div className="flex min-h-screen overflow-x-hidden" style={{ background: "var(--color-surface)" }}>
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar name={user.name} role={user.role} notificationCount={alertCount} />
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
