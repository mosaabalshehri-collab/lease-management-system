import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { contractDepartmentIds, contractVisibilityFilter } from "@/lib/queries";
import { canViewContract } from "@/lib/auth";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  const row = db
    .prepare("SELECT file_path, file_name FROM contracts WHERE id=? AND deleted_at IS NULL")
    .get(id) as { file_path: string | null; file_name: string | null } | undefined;
  if (!row?.file_path) return NextResponse.json({ error: "لا يوجد ملف" }, { status: 404 });

  // التحقق من صلاحية رؤية العقد
  if (!canViewContract(user, contractDepartmentIds(Number(id))))
    return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });

  const filePath = path.join(UPLOAD_DIR, row.file_path);
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(row.file_path).toLowerCase();
  const ct = ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": ct,
      "Content-Disposition": `inline; filename="${encodeURIComponent(row.file_name || "contract")}"`,
    },
  });
}
