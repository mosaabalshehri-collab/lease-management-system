import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().optional(),
  rejection_reason: z.string().optional(),
});

/** تسجيل موافقة/رفض إدارة على عقد. الرفض يتطلب سبباً ولا يغيّر حالة العقد. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "department" || user.department_id == null)
    return NextResponse.json({ error: "غير مصرّح - الموافقة لمستخدمي الإدارات فقط" }, { status: 403 });

  const { id } = await params;
  const contractId = Number(id);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const { decision, notes, rejection_reason } = parsed.data;
  if (decision === "rejected" && !rejection_reason?.trim())
    return NextResponse.json({ error: "سبب الرفض إجباري" }, { status: 400 });

  const db = getDb();
  // التحقق أن العقد مرتبط بإدارة المستخدم
  const linked = db
    .prepare("SELECT 1 FROM contract_departments WHERE contract_id=? AND department_id=?")
    .get(contractId, user.department_id);
  if (!linked)
    return NextResponse.json({ error: "هذا العقد غير مرتبط بإدارتك" }, { status: 403 });

  // upsert: كل إدارة لها قرار واحد على العقد (يُحدَّث إن غيّرت رأيها)
  db.prepare(
    `INSERT INTO approvals (contract_id, department_id, user_id, decision, notes, rejection_reason)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(contract_id, department_id) DO UPDATE SET
       user_id=excluded.user_id, decision=excluded.decision,
       notes=excluded.notes, rejection_reason=excluded.rejection_reason,
       created_at=datetime('now')`
  ).run(
    contractId, user.department_id, user.id, decision,
    notes?.trim() || null,
    decision === "rejected" ? rejection_reason!.trim() : null
  );

  return NextResponse.json({ ok: true });
}
