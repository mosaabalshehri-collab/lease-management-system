import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  is_active: z.boolean().optional(),
});

/** تعديل إدارة (الاسم أو التفعيل/التعطيل) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const db = getDb();
  if (parsed.data.name !== undefined)
    db.prepare("UPDATE departments SET name=? WHERE id=?").run(parsed.data.name.trim(), id);
  if (parsed.data.is_active !== undefined)
    db.prepare("UPDATE departments SET is_active=? WHERE id=?").run(parsed.data.is_active ? 1 : 0, id);
  return NextResponse.json({ ok: true });
}

/** حذف إدارة - يُمنع إذا كانت مرتبطة بعقود أو مستخدمين (يُقترح التعطيل بدلاً منه) */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  const { id } = await params;
  const db = getDb();
  const links = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM contract_departments WHERE department_id=?) AS c,
              (SELECT COUNT(*) FROM users WHERE department_id=?) AS u`
    )
    .get(id, id) as { c: number; u: number };
  if (links.c > 0 || links.u > 0) {
    return NextResponse.json(
      {
        error: `لا يمكن الحذف: الإدارة مرتبطة بـ ${links.c} عقد و${links.u} مستخدم. يمكنك تعطيلها بدلاً من الحذف.`,
        canDeactivate: true,
      },
      { status: 409 }
    );
  }
  db.prepare("DELETE FROM departments WHERE id=?").run(id);
  return NextResponse.json({ ok: true });
}
