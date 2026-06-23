import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { getCurrentUser, canManageContracts } from "@/lib/auth";
import { generatePaymentSchedule, type PaymentFrequency } from "@/lib/dates";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const VALID_FREQ: PaymentFrequency[] = ["monthly", "quarterly", "four_monthly", "semi_annual", "annual"];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!canManageContracts(user)) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  }

  const form = await req.formData();
  const direction = String(form.get("direction") || "");
  const title = String(form.get("title") || "").trim();
  const counterparty = String(form.get("counterparty_name") || "").trim();
  const startDate = String(form.get("start_date") || "");
  const endDate = String(form.get("end_date") || "");
  const totalAmount = Number(form.get("total_amount"));
  const reason = String(form.get("reason") || "").trim();
  const frequency = String(form.get("payment_frequency") || "") as PaymentFrequency;
  const deptIds = form.getAll("department_ids").map((v) => Number(v)).filter((n) => !isNaN(n));
  const file = form.get("file") as File | null;

  // التحقق
  if (direction !== "leased_in" && direction !== "leased_out")
    return NextResponse.json({ error: "اتجاه العقد غير صحيح" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "عنوان العقد مطلوب" }, { status: 400 });
  if (!counterparty) return NextResponse.json({ error: "اسم الطرف الآخر مطلوب" }, { status: 400 });
  if (!startDate || !endDate)
    return NextResponse.json({ error: "تواريخ العقد مطلوبة" }, { status: 400 });
  if (endDate <= startDate)
    return NextResponse.json({ error: "تاريخ النهاية يجب أن يكون بعد البداية" }, { status: 400 });
  if (!totalAmount || totalAmount <= 0)
    return NextResponse.json({ error: "قيمة العقد يجب أن تكون أكبر من صفر" }, { status: 400 });
  if (!VALID_FREQ.includes(frequency))
    return NextResponse.json({ error: "دورية السداد غير صحيحة" }, { status: 400 });

  // حفظ الملف إن وُجد
  let filePath: string | null = null;
  let fileName: string | null = null;
  if (file && file.size > 0) {
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: "نوع الملف غير مدعوم (PDF أو صورة فقط)" }, { status: 400 });
    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: "حجم الملف يتجاوز 10 ميجابايت" }, { status: 400 });
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const ext = path.extname(file.name) || "";
    const stored = `${randomUUID()}${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(UPLOAD_DIR, stored), buf);
    filePath = stored;
    fileName = file.name;
  }

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO contracts
       (direction, title, counterparty_name, start_date, end_date, total_amount, reason, payment_frequency, file_path, file_name, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(direction, title, counterparty, startDate, endDate, totalAmount, reason || null, frequency, filePath, fileName, user!.id);
  const contractId = Number(result.lastInsertRowid);

  // توليد جدول الدفعات تلقائياً
  const schedule = generatePaymentSchedule(startDate, endDate, totalAmount, frequency);
  const insertPayment = db.prepare(
    "INSERT INTO payments (contract_id, seq, due_date, amount) VALUES (?,?,?,?)"
  );
  for (const p of schedule) insertPayment.run(contractId, p.seq, p.due_date, p.amount);

  // ربط الإدارات الموافِقة
  const insertDept = db.prepare(
    "INSERT OR IGNORE INTO contract_departments (contract_id, department_id) VALUES (?,?)"
  );
  for (const did of deptIds) insertDept.run(contractId, did);

  return NextResponse.json({ ok: true, id: contractId });
}
