import { getDb } from "./db";
import { todayISO, daysBetween } from "./dates";
import type {
  ContractStatus,
  PaymentStatus,
  Direction,
  Contract,
  Decision,
} from "./types";

/** نوافذ التنبيه المتفق عليها */
export const EXPIRY_ALERT_DAYS = 30; // قبل انتهاء العقد
export const PAYMENT_ALERT_DAYS = 7; // قبل استحقاق الدفعة

/** حالة العقد محسوبة من تاريخ النهاية */
export function contractStatus(endDate: string): ContractStatus {
  const days = daysBetween(todayISO(), endDate);
  if (days < 0) return "expired";
  if (days <= EXPIRY_ALERT_DAYS) return "expiring";
  return "active";
}

/** حالة الدفعة محسوبة من تاريخ الاستحقاق وحالة السداد */
export function paymentStatus(dueDate: string, paidAt: string | null): PaymentStatus {
  if (paidAt) return "paid";
  const days = daysBetween(todayISO(), dueDate);
  if (days < 0) return "overdue";
  if (days <= PAYMENT_ALERT_DAYS) return "due_soon";
  return "scheduled";
}

/** معرّفات الإدارات المرتبطة بعقد */
export function contractDepartmentIds(contractId: number): number[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT department_id FROM contract_departments WHERE contract_id = ?`)
    .all(contractId) as { department_id: number }[];
  return rows.map((r) => r.department_id);
}

/** شرط رؤية العقود حسب دور المستخدم (يُدمج في WHERE) */
export function contractVisibilityFilter(
  role: string,
  departmentId: number | null
): { clause: string; params: (number | string)[] } {
  // المدير والمشاهد يشوفون كل العقود غير المحذوفة
  if (role === "admin" || role === "viewer") {
    return { clause: `c.deleted_at IS NULL`, params: [] };
  }
  // مستخدم الإدارة: فقط العقود المرتبطة بإدارته
  if (role === "department" && departmentId != null) {
    return {
      clause: `c.deleted_at IS NULL AND c.id IN (
        SELECT contract_id FROM contract_departments WHERE department_id = ?
      )`,
      params: [departmentId],
    };
  }
  return { clause: `1 = 0`, params: [] }; // لا شيء
}

export interface DashboardSummary {
  totalPayable: number;        // إجمالي ما ندفعه (leased_in)
  totalReceivable: number;     // إجمالي ما نحصّله (leased_out)
  payableOutstanding: number;  // مدفوعات غير مسدَّدة
  receivableOutstanding: number;
  countLeasedIn: number;
  countLeasedOut: number;
  expiringCount: number;
  overduePayments: number;
}

/** تجميعات لوحة المعلومات (مع مراعاة صلاحية الرؤية) */
export function getDashboardSummary(
  role: string,
  departmentId: number | null
): DashboardSummary {
  const db = getDb();
  const { clause, params } = contractVisibilityFilter(role, departmentId);

  const totals = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN c.direction='leased_in' THEN c.total_amount END),0) AS totalPayable,
         COALESCE(SUM(CASE WHEN c.direction='leased_out' THEN c.total_amount END),0) AS totalReceivable,
         COALESCE(SUM(CASE WHEN c.direction='leased_in' THEN 1 ELSE 0 END),0) AS countLeasedIn,
         COALESCE(SUM(CASE WHEN c.direction='leased_out' THEN 1 ELSE 0 END),0) AS countLeasedOut
       FROM contracts c WHERE ${clause}`
    )
    .get(...params) as {
    totalPayable: number;
    totalReceivable: number;
    countLeasedIn: number;
    countLeasedOut: number;
  };

  const outstanding = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN c.direction='leased_in' THEN p.amount END),0) AS payableOut,
         COALESCE(SUM(CASE WHEN c.direction='leased_out' THEN p.amount END),0) AS receivableOut
       FROM payments p JOIN contracts c ON c.id = p.contract_id
       WHERE p.paid_at IS NULL AND ${clause}`
    )
    .get(...params) as { payableOut: number; receivableOut: number };

  const today = todayISO();
  const expiring = db
    .prepare(
      `SELECT COUNT(*) AS n FROM contracts c
       WHERE ${clause} AND c.end_date >= ? AND c.end_date <= date(?, '+${EXPIRY_ALERT_DAYS} days')`
    )
    .get(...params, today, today) as { n: number };

  const overdue = db
    .prepare(
      `SELECT COUNT(*) AS n FROM payments p JOIN contracts c ON c.id = p.contract_id
       WHERE ${clause} AND p.paid_at IS NULL AND p.due_date < ?`
    )
    .get(...params, today) as { n: number };

  return {
    totalPayable: totals.totalPayable,
    totalReceivable: totals.totalReceivable,
    payableOutstanding: outstanding.payableOut,
    receivableOutstanding: outstanding.receivableOut,
    countLeasedIn: totals.countLeasedIn,
    countLeasedOut: totals.countLeasedOut,
    expiringCount: expiring.n,
    overduePayments: overdue.n,
  };
}

export interface AlertItem {
  kind: "contract_expiry" | "payment_due" | "payment_overdue";
  contract_id: number;
  title: string;
  direction: Direction;
  date: string;
  amount?: number;
  daysLeft: number;
}

/** التنبيهات النشطة: عقود قاربت الانتهاء (≤30 يوم) ودفعات مستحقة قريباً (≤7 أيام) أو متأخرة */
export function getActiveAlerts(role: string, departmentId: number | null): AlertItem[] {
  const db = getDb();
  const { clause, params } = contractVisibilityFilter(role, departmentId);
  const today = todayISO();
  const alerts: AlertItem[] = [];

  const expiring = db
    .prepare(
      `SELECT c.id, c.title, c.direction, c.end_date FROM contracts c
       WHERE ${clause} AND c.end_date >= ? AND c.end_date <= date(?, '+${EXPIRY_ALERT_DAYS} days')
       ORDER BY c.end_date`
    )
    .all(...params, today, today) as { id: number; title: string; direction: Direction; end_date: string }[];
  for (const c of expiring) {
    alerts.push({
      kind: "contract_expiry", contract_id: c.id, title: c.title,
      direction: c.direction, date: c.end_date, daysLeft: daysBetween(today, c.end_date),
    });
  }

  const payments = db
    .prepare(
      `SELECT c.id AS contract_id, c.title, c.direction, p.due_date, p.amount FROM payments p
       JOIN contracts c ON c.id = p.contract_id
       WHERE ${clause} AND p.paid_at IS NULL
         AND p.due_date <= date(?, '+${PAYMENT_ALERT_DAYS} days')
       ORDER BY p.due_date`
    )
    .all(...params, today) as {
    contract_id: number; title: string; direction: Direction; due_date: string; amount: number;
  }[];
  for (const p of payments) {
    const d = daysBetween(today, p.due_date);
    alerts.push({
      kind: d < 0 ? "payment_overdue" : "payment_due", contract_id: p.contract_id,
      title: p.title, direction: p.direction, date: p.due_date, amount: p.amount, daysLeft: d,
    });
  }

  return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
}

export function getAlertCount(role: string, departmentId: number | null): number {
  return getActiveAlerts(role, departmentId).length;
}

export interface ContractListItem {
  id: number;
  direction: Direction;
  title: string;
  counterparty_name: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  payment_frequency: string;
  paid_amount: number;
  outstanding: number;
  next_due: string | null;
}

/** قائمة العقود مع المبالغ المسددة/المتبقية وأقرب استحقاق (حسب الصلاحية والاتجاه) */
export function listContracts(
  role: string,
  departmentId: number | null,
  direction?: Direction
): ContractListItem[] {
  const db = getDb();
  const { clause, params } = contractVisibilityFilter(role, departmentId);
  const dirClause = direction ? ` AND c.direction = ?` : "";
  const dirParams = direction ? [direction] : [];

  const rows = db
    .prepare(
      `SELECT c.id, c.direction, c.title, c.counterparty_name, c.start_date, c.end_date,
              c.total_amount, c.payment_frequency,
              COALESCE((SELECT SUM(amount) FROM payments WHERE contract_id=c.id AND paid_at IS NOT NULL),0) AS paid_amount,
              COALESCE((SELECT SUM(amount) FROM payments WHERE contract_id=c.id AND paid_at IS NULL),0) AS outstanding,
              (SELECT MIN(due_date) FROM payments WHERE contract_id=c.id AND paid_at IS NULL) AS next_due
       FROM contracts c
       WHERE ${clause}${dirClause}
       ORDER BY c.created_at DESC`
    )
    .all(...params, ...dirParams) as ContractListItem[];
  return rows;
}

export interface PaymentRow {
  id: number;
  contract_id: number;
  seq: number;
  due_date: string;
  amount: number;
  paid_at: string | null;
}

/** كل الدفعات حسب نوع التدفق (payable=نستأجر، receivable=نؤجّر) */
export function listPaymentsByFlow(
  flow: "payable" | "receivable",
  role: string,
  departmentId: number | null
): (PaymentRow & { title: string; counterparty_name: string; direction: Direction })[] {
  const db = getDb();
  const { clause, params } = contractVisibilityFilter(role, departmentId);
  const direction = flow === "payable" ? "leased_in" : "leased_out";
  return db
    .prepare(
      `SELECT p.id, p.contract_id, p.seq, p.due_date, p.amount, p.paid_at,
              c.title, c.counterparty_name, c.direction
       FROM payments p JOIN contracts c ON c.id = p.contract_id
       WHERE ${clause} AND c.direction = ?
       ORDER BY p.due_date`
    )
    .all(...params, direction) as (PaymentRow & {
    title: string;
    counterparty_name: string;
    direction: Direction;
  })[];
}

export interface MonthlyReportRow {
  contract_id: number;
  title: string;
  counterparty_name: string;
  direction: Direction;
  due_date: string;
  amount: number;
  paid_at: string | null;
}

/** تقرير شهري: كل الدفعات المستحقة في شهر/سنة معيّنين */
export function getMonthlyReport(
  year: number,
  month: number,
  role: string,
  departmentId: number | null
): { rows: MonthlyReportRow[]; totalPayable: number; totalReceivable: number } {
  const db = getDb();
  const { clause, params } = contractVisibilityFilter(role, departmentId);
  const mm = String(month).padStart(2, "0");
  const prefix = `${year}-${mm}`;

  const rows = db
    .prepare(
      `SELECT c.id AS contract_id, c.title, c.counterparty_name, c.direction,
              p.due_date, p.amount, p.paid_at
       FROM payments p JOIN contracts c ON c.id = p.contract_id
       WHERE ${clause} AND substr(p.due_date,1,7) = ?
       ORDER BY p.due_date, c.title`
    )
    .all(...params, prefix) as MonthlyReportRow[];

  let totalPayable = 0;
  let totalReceivable = 0;
  for (const r of rows) {
    if (r.direction === "leased_in") totalPayable += r.amount;
    else totalReceivable += r.amount;
  }
  return { rows, totalPayable, totalReceivable };
}

export interface ApprovalRow {
  id: number;
  department_id: number;
  department_name: string;
  user_name: string | null;
  decision: Decision;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface ContractDetail extends Contract {
  payments: PaymentRow[];
  approvals: ApprovalRow[];
  departments: { id: number; name: string }[];
  created_by_name: string | null;
}

/** تفاصيل عقد كاملة: البيانات + الدفعات + الموافقات + الإدارات */
export function getContractDetail(contractId: number): ContractDetail | null {
  const db = getDb();
  const c = db
    .prepare(
      `SELECT c.*, u.name AS created_by_name
       FROM contracts c LEFT JOIN users u ON u.id = c.created_by
       WHERE c.id = ? AND c.deleted_at IS NULL`
    )
    .get(contractId) as (Contract & { created_by_name: string | null }) | undefined;
  if (!c) return null;

  const payments = db
    .prepare("SELECT id, contract_id, seq, due_date, amount, paid_at FROM payments WHERE contract_id=? ORDER BY seq")
    .all(contractId) as PaymentRow[];

  const approvals = db
    .prepare(
      `SELECT a.id, a.department_id, d.name AS department_name, u.name AS user_name,
              a.decision, a.notes, a.rejection_reason, a.created_at
       FROM approvals a
       JOIN departments d ON d.id = a.department_id
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.contract_id = ? ORDER BY a.created_at`
    )
    .all(contractId) as ApprovalRow[];

  const departments = db
    .prepare(
      `SELECT d.id, d.name FROM contract_departments cd
       JOIN departments d ON d.id = cd.department_id
       WHERE cd.contract_id = ?`
    )
    .all(contractId) as { id: number; name: string }[];

  return { ...c, created_by_name: c.created_by_name, payments, approvals, departments };
}

export interface PendingApprovalItem {
  contract_id: number;
  title: string;
  direction: Direction;
  counterparty_name: string;
  decision: Decision | null;
}

/** العقود المرتبطة بإدارة المستخدم وحالة قرارها */
export function listDepartmentContracts(departmentId: number): PendingApprovalItem[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT c.id AS contract_id, c.title, c.direction, c.counterparty_name,
              a.decision
       FROM contract_departments cd
       JOIN contracts c ON c.id = cd.contract_id AND c.deleted_at IS NULL
       LEFT JOIN approvals a ON a.contract_id = c.id AND a.department_id = cd.department_id
       WHERE cd.department_id = ?
       ORDER BY (a.decision IS NOT NULL), c.created_at DESC`
    )
    .all(departmentId) as PendingApprovalItem[];
}
