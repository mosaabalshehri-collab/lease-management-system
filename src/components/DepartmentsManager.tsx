"use client";

import { useState, useEffect } from "react";

interface Dept {
  id: number;
  name: string;
  is_active: number;
  contract_count: number;
  user_count: number;
}

export function DepartmentsManager() {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/departments");
    const data = await res.json();
    setDepts(data.departments || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    setError("");
    if (newName.trim().length < 2) return;
    const res = await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setNewName("");
      load();
    } else {
      const d = await res.json();
      setError(d.error || "خطأ");
    }
  }

  async function saveEdit(id: number) {
    await fetch(`/api/departments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    setEditing(null);
    load();
  }

  async function toggleActive(d: Dept) {
    await fetch(`/api/departments/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !d.is_active }),
    });
    load();
  }

  async function del(id: number) {
    setError("");
    const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
    if (res.ok) {
      load();
    } else {
      const d = await res.json();
      setError(d.error || "تعذّر الحذف");
    }
  }

  const card = { background: "var(--color-paper-raised)", borderColor: "var(--color-border)" };

  return (
    <div className="space-y-4">
      {/* إضافة */}
      <div className="rounded-xl border p-5" style={card}>
        <label className="mb-2 block text-sm font-bold" style={{ color: "var(--color-ink)" }}>
          إضافة إدارة جديدة
        </label>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="اسم الإدارة"
            className="flex-1 rounded-lg border px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--color-paper)", borderColor: "var(--color-border)", color: "var(--color-ink)" }}
          />
          <button
            onClick={add}
            className="rounded-lg px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--color-primary)" }}
          >
            إضافة
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "var(--color-rejected-bg)", color: "var(--color-rejected)" }}>
          {error}
        </div>
      )}

      {/* القائمة */}
      <div className="rounded-xl border p-5" style={card}>
        {loading ? (
          <p className="py-6 text-center text-sm" style={{ color: "var(--color-pending)" }}>جارٍ التحميل...</p>
        ) : depts.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: "var(--color-pending)" }}>لا توجد إدارات</p>
        ) : (
          <div className="space-y-2">
            {depts.map((d) => (
              <div key={d.id} className="rounded-lg border p-3" style={{ borderColor: "var(--color-border)", opacity: d.is_active ? 1 : 0.6 }}>
                {editing === d.id ? (
                  <div className="flex gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{ background: "var(--color-paper)", borderColor: "var(--color-border)", color: "var(--color-ink)" }}
                    />
                    <button onClick={() => saveEdit(d.id)} className="rounded-lg px-3 py-2 text-sm font-bold text-white" style={{ background: "var(--color-primary)" }}>حفظ</button>
                    <button onClick={() => setEditing(null)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}>إلغاء</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>{d.name}</span>
                      {!d.is_active && <span className="mr-2 text-xs" style={{ color: "var(--color-pending)" }}>(معطّلة)</span>}
                      <div className="mt-0.5 text-xs" style={{ color: "var(--color-pending)" }}>
                        {d.contract_count} عقد · {d.user_count} مستخدم
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => { setEditing(d.id); setEditName(d.name); }} className="rounded-md border px-2.5 py-1 text-xs" style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}>تعديل</button>
                      <button onClick={() => toggleActive(d)} className="rounded-md border px-2.5 py-1 text-xs" style={{ borderColor: "var(--color-border)", color: "var(--color-pending)" }}>{d.is_active ? "تعطيل" : "تفعيل"}</button>
                      <button onClick={() => del(d.id)} className="rounded-md border px-2.5 py-1 text-xs" style={{ borderColor: "var(--color-rejected)", color: "var(--color-rejected)" }}>حذف</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
