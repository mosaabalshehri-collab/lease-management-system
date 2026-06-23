import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser, canManageContracts } from "@/lib/auth";

const schema = z.object({ paid: z.boolean() });

/** تسجيل/إلغاء سداد دفعة (مدير النظام فقط) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!canManageContracts(user)) return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const db = getDb();
  db.prepare("UPDATE payments SET paid_at=? WHERE id=?").run(
    parsed.data.paid ? new Date().toISOString().slice(0, 10) : null,
    id
  );
  return NextResponse.json({ ok: true });
}
