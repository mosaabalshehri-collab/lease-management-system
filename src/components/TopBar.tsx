"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle, CalendarToggle } from "./Toggles";
import { Icon } from "./Icon";
import { ROLE_LABELS_AR, type Role } from "@/lib/roles";

interface TopBarProps {
  name: string;
  role: Role;
  notificationCount: number;
}

export function TopBar({ name, role, notificationCount }: TopBarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = name.trim().slice(0, 1);

  return (
    <header
      className="sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4 md:px-6"
      style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center gap-2">
        <CalendarToggle />
        <ThemeToggle />
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:opacity-80"
          style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}
          aria-label="التنبيهات"
        >
          <Icon name="bell" size={18} />
          {notificationCount > 0 && (
            <span
              className="absolute -top-1.5 -left-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
              style={{ background: "var(--color-status-expired)" }}
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-lg border px-2 py-1.5 transition-colors hover:opacity-80"
            style={{ borderColor: "var(--color-border)" }}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: "var(--color-primary)" }}
            >
              {initials}
            </span>
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-xs font-bold" style={{ color: "var(--color-ink)" }}>
                {name}
              </div>
              <div className="text-[11px]" style={{ color: "var(--color-pending)" }}>
                {ROLE_LABELS_AR[role]}
              </div>
            </div>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute left-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border shadow-lg"
                style={{ background: "var(--color-paper-raised)", borderColor: "var(--color-border)" }}
              >
                <div className="border-b px-4 py-2.5" style={{ borderColor: "var(--color-border)" }}>
                  <div className="text-xs font-bold" style={{ color: "var(--color-ink)" }}>{name}</div>
                  <div className="text-[11px]" style={{ color: "var(--color-pending)" }}>{ROLE_LABELS_AR[role]}</div>
                </div>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-sm font-medium transition-colors hover:bg-[var(--color-surface)]"
                  style={{ color: "var(--color-status-expired)" }}
                >
                  <Icon name="logout" size={16} />
                  تسجيل الخروج
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
