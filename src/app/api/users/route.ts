import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.department_id, d.name AS department_name
       FROM users u LEFT JOIN departments d ON d.id = u.department_id
       ORDER BY u.created_at DESC`
    )
    .all();
  return NextResponse.json({ users: rows });
}

const createSchema = z.object({
  name: z.string().min(2, "الاسم قصير جداً"),
  email: z.string().email("بريد غير صحيح"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
  role: z.enum(["admin", "department", "viewer"]),
  department_id: z.number().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { name, email, password, role, department_id } = parsed.data;

  if (role === "department" && !department_id)
    return NextResponse.json({ error: "مستخدم الإدارة يجب ربطه بإدارة" }, { status: 400 });

  const db = getDb();
  const exists = db.prepare("SELECT 1 FROM users WHERE email=?").get(email.trim().toLowerCase());
  if (exists) return NextResponse.json({ error: "البريد مستخدم مسبقاً" }, { status: 409 });

  const r = db
    .prepare("INSERT INTO users (name, email, password_hash, role, department_id) VALUES (?,?,?,?,?)")
    .run(name.trim(), email.trim().toLowerCase(), hashPassword(password), role, role === "department" ? department_id : null);
  return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) });
}
