import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({ is_active: z.boolean() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  const { id } = await params;
  if (Number(id) === user.id) return NextResponse.json({ error: "لا يمكنك تعطيل حسابك" }, { status: 400 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const db = getDb();
  db.prepare("UPDATE users SET is_active=? WHERE id=?").run(parsed.data.is_active ? 1 : 0, id);
  return NextResponse.json({ ok: true });
}
