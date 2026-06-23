"use client";

import { useState, useEffect } from "react";
import { ROLE_LABELS_AR, type Role } from "@/lib/roles";

interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: number;
  department_id: number | null;
  department_name: string | null;
}
interface Dept {
  id: number;
  name: string;
  is_active: number;
}

const inputStyle = { background: "var(--color-paper)", borderColor: "var(--color-border)", color: "var(--color-ink)" };

export function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [deptId, setDeptId] = useState<number | "">("");

  async function load() {
    const [u, d] = await Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
    ]);
    setUsers(u.users || []);
    setDepts((d.departments || []).filter((x: Dept) => x.is_active));
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, email, password, role,
        department_id: role === "department" ? Number(deptId) || null : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "خطأ");
      return;
    }
    setName(""); setEmail(""); setPassword(""); setRole("viewer"); setDeptId("");
    setShowForm(false);
    load();
  }

  async function toggleActive(u: User) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !u.is_active }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    load();
  }

  const card = { background: "var(--color-paper-raised)", borderColor: "var(--color-border)" };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm((s) => !s)}
        className="rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        style={{ background: "var(--color-primary)" }}
      >
        {showForm ? "إخفاء النموذج" : "+ مستخدم جديد"}
      </button>

      {showForm && (
        <div className="space-y-3 rounded-xl border p-5" style={card}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" className="rounded-lg border px-3 py-2.5 text-sm outline-none" style={inputStyle} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" placeholder="البريد الإلكتروني" className="rounded-lg border px-3 py-2.5 text-sm outline-none" style={inputStyle} />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" dir="ltr" placeholder="كلمة المرور" className="rounded-lg border px-3 py-2.5 text-sm outline-none" style={inputStyle} />
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="rounded-lg border px-3 py-2.5 text-sm outline-none" style={inputStyle}>
              <option value="viewer">مشاهد عام</option>
              <option value="department">مستخدم إدارة</option>
              <option value="admin">مدير النظام</option>
            </select>
            {role === "department" && (
              <select value={deptId} onChange={(e) => setDeptId(Number(e.target.value) || "")} className="rounded-lg border px-3 py-2.5 text-sm outline-none sm:col-span-2" style={inputStyle}>
                <option value="">— اختر الإدارة —</option>
                {depts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>
          <button onClick={create} className="rounded-lg px-5 py-2.5 text-sm font-bold text-white" style={{ background: "var(--color-primary)" }}>
            إنشاء المستخدم
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "var(--color-rejected-bg)", color: "var(--color-rejected)" }}>
          {error}
        </div>
      )}

      <div className="rounded-xl border p-5" style={card}>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3" style={{ borderColor: "var(--color-border)", opacity: u.is_active ? 1 : 0.6 }}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>{u.name}</span>
                  <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
                    {ROLE_LABELS_AR[u.role]}
                  </span>
                  {!u.is_active && <span className="text-xs" style={{ color: "var(--color-pending)" }}>(معطّل)</span>}
                </div>
                <div className="mt-0.5 text-xs" style={{ color: "var(--color-pending)" }} dir="ltr">
                  {u.email}{u.department_name ? ` · ${u.department_name}` : ""}
                </div>
              </div>
              <button onClick={() => toggleActive(u)} className="rounded-md border px-2.5 py-1 text-xs" style={{ borderColor: "var(--color-border)", color: "var(--color-pending)" }}>
                {u.is_active ? "تعطيل" : "تفعيل"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
