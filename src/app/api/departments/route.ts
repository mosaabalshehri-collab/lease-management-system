import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** قائمة الإدارات (متاحة للمستخدمين المسجّلين لاستخدامها في النماذج) */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT d.id, d.name, d.is_active,
              (SELECT COUNT(*) FROM contract_departments WHERE department_id=d.id) AS contract_count,
              (SELECT COUNT(*) FROM users WHERE department_id=d.id) AS user_count
       FROM departments d ORDER BY d.is_active DESC, d.name`
    )
    .all();
  return NextResponse.json({ departments: rows });
}

const createSchema = z.object({ name: z.string().min(2, "اسم الإدارة قصير جداً") });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const db = getDb();
  const r = db.prepare("INSERT INTO departments (name) VALUES (?)").run(parsed.data.name.trim());
  return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) });
}
