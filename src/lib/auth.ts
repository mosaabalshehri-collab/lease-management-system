import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getDb } from "./db";
import type { Role } from "./roles";
export type { Role } from "./roles";
export { ROLE_LABELS_AR } from "./roles";

/**
 * المصادقة والصلاحيات.
 *
 * - كلمات المرور مُجزّأة بـ bcrypt.
 * - الجلسة عبر JWT مخزّن في كوكي httpOnly.
 * - ثلاثة أدوار: admin | department | viewer.
 */

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production-lease-mgmt";
const COOKIE_NAME = "lease_session";
const SESSION_DAYS = 7;

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  department_id: number | null;
}

interface JwtPayload {
  uid: number;
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function signToken(userId: number): string {
  return jwt.sign({ uid: userId } satisfies JwtPayload, JWT_SECRET, {
    expiresIn: `${SESSION_DAYS}d`,
  });
}

/** ينشئ جلسة (يضبط الكوكي) */
export async function createSession(userId: number) {
  const token = signToken(userId);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/** يقرأ المستخدم الحالي من الجلسة، أو null إذا غير مسجّل/معطّل */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { uid } = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const db = getDb();
    const row = db
      .prepare(
        `SELECT id, name, email, role, department_id, is_active
         FROM users WHERE id = ?`
      )
      .get(uid) as
      | (SessionUser & { is_active: number })
      | undefined;
    if (!row || row.is_active !== 1) return null;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      department_id: row.department_id,
    };
  } catch {
    return null;
  }
}

/** يصادق بالبريد وكلمة المرور، يرجّع المستخدم أو null */
export function authenticate(email: string, password: string): SessionUser | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, name, email, role, department_id, password_hash, is_active
       FROM users WHERE email = ?`
    )
    .get(email.trim().toLowerCase()) as
    | (SessionUser & { password_hash: string; is_active: number })
    | undefined;
  if (!row || row.is_active !== 1) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department_id: row.department_id,
  };
}

/* ============ حُرّاس الصلاحيات ============ */

export function canManageContracts(user: SessionUser | null): boolean {
  return user?.role === "admin";
}

export function canApprove(user: SessionUser | null): boolean {
  return user?.role === "department";
}

/** هل يحق للمستخدم رؤية هذا العقد؟ المدير والمشاهد يشوفون الكل،
    ومستخدم الإدارة يشوف العقود المرتبطة بإدارته فقط */
export function canViewContract(
  user: SessionUser | null,
  contractDepartmentIds: number[]
): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "viewer") return true;
  if (user.role === "department" && user.department_id != null) {
    return contractDepartmentIds.includes(user.department_id);
  }
  return false;
}
