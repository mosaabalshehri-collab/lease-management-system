import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser, canManageContracts } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!canManageContracts(user)) return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  const { id } = await params;
  const db = getDb();
  db.prepare("UPDATE contracts SET deleted_at=datetime('now') WHERE id=?").run(id);
  return NextResponse.json({ ok: true });
}
