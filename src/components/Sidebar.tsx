"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Logo } from "./Logo";
import { Icon, type IconName } from "./Icon";
import type { Role } from "@/lib/roles";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "لوحة المعلومات", icon: "dashboard", roles: ["admin", "department", "viewer"] },
  { href: "/contracts?dir=leased_in", label: "عقود بصفتنا مستأجرين", icon: "leased-in", roles: ["admin", "department", "viewer"] },
  { href: "/contracts?dir=leased_out", label: "عقود بصفتنا مؤجرين", icon: "leased-out", roles: ["admin", "department", "viewer"] },
  { href: "/payments?type=payable", label: "مبالغ مطلوبة منّا", icon: "payable", roles: ["admin", "department", "viewer"] },
  { href: "/payments?type=receivable", label: "مبالغ نحصّلها", icon: "receivable", roles: ["admin", "department", "viewer"] },
  { href: "/reports/monthly", label: "التقرير الشهري", icon: "calendar", roles: ["admin", "department", "viewer"] },
  { href: "/approvals", label: "الموافقات", icon: "approvals", roles: ["department"] },
  { href: "/departments", label: "الإدارات", icon: "building", roles: ["admin"] },
  { href: "/users", label: "المستخدمون", icon: "users", roles: ["admin"] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const items = NAV.filter((i) => i.roles.includes(role));

  // عنصر التنقّل نشط إذا تطابق المسار، ولو كان فيه باراميتر استعلام لازم يتطابق أيضاً
  function isActive(href: string): boolean {
    const [base, query] = href.split("?");
    if (pathname !== base && !pathname.startsWith(base + "/")) return false;
    if (!query) return true;
    const params = new URLSearchParams(query);
    for (const [k, v] of params) {
      if (searchParams.get(k) !== v) return false;
    }
    return true;
  }

  return (
    <aside
      className="hidden w-64 shrink-0 flex-col border-l md:flex"
      style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo size={36} />
        <div className="leading-snug">
          <div className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>
            عقود الإيجار
          </div>
          <div className="text-xs" style={{ color: "var(--color-pending)" }}>
            نظام الإدارة
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
              style={
                active
                  ? { background: "var(--color-primary-light)", color: "var(--color-primary)" }
                  : { color: "var(--color-ink)" }
              }
            >
              <span className="flex h-5 w-5 items-center justify-center">
                <Icon name={item.icon} size={19} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
