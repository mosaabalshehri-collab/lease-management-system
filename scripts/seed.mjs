import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import path from "node:path";
import fs from "node:fs";

/**
 * بيانات أولية:
 * - مدير نظام للدخول الأول
 * - الإدارة المالية (إدارة افتراضية، يمكن تعديلها/حذفها لاحقاً)
 * - عقود تجريبية بالاتجاهين + جداول دفعات لعرض النظام
 *
 * يُشغّل عبر: npm run seed
 */

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "app.db");
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON;");

// إنشاء المخطط إن لم يكن موجوداً (نفس مخطط src/lib/db.ts)
db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('admin','department','viewer')),
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    direction TEXT NOT NULL CHECK (direction IN ('leased_in','leased_out')),
    title TEXT NOT NULL, counterparty_name TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL,
    total_amount REAL NOT NULL, reason TEXT,
    payment_frequency TEXT NOT NULL CHECK (payment_frequency IN ('monthly','quarterly','four_monthly','semi_annual','annual')),
    file_path TEXT, file_name TEXT, created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), deleted_at TEXT);
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL, due_date TEXT NOT NULL, amount REAL NOT NULL, paid_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS contract_departments (
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (contract_id, department_id));
  CREATE TABLE IF NOT EXISTS approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT, contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    decision TEXT NOT NULL CHECK (decision IN ('approved','rejected')), notes TEXT, rejection_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (contract_id, department_id));
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('contract_expiry','payment_due')),
    contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
    payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
    message TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (type, contract_id, payment_id));
`);

const FREQUENCY_MONTHS = { monthly: 1, quarterly: 3, four_monthly: 4, semi_annual: 6, annual: 12 };
function toISO(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function addMonths(iso, m) {
  const [y, mo, d] = iso.split("-").map(Number);
  const base = new Date(Date.UTC(y, mo - 1, d));
  const tmi = base.getUTCMonth() + m;
  const ty = base.getUTCFullYear() + Math.floor(tmi / 12);
  const nm = ((tmi % 12) + 12) % 12;
  const last = new Date(Date.UTC(ty, nm + 1, 0)).getUTCDate();
  return toISO(new Date(Date.UTC(ty, nm, Math.min(d, last))));
}
function monthsBetween(a, b) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am) + (bd - ad) / 30;
}
function genPayments(start, end, total, freq) {
  const step = FREQUENCY_MONTHS[freq];
  const count = Math.max(1, Math.ceil(monthsBetween(start, end) / step));
  const th = Math.round(total * 100);
  const base = Math.floor(th / count);
  const rem = th - base * count;
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ seq: i + 1, due: addMonths(start, i * step), amount: (base + (i === count - 1 ? rem : 0)) / 100 });
  }
  return out;
}

// تنظيف وإعادة التهيئة
db.exec(`
  DELETE FROM notifications; DELETE FROM approvals; DELETE FROM contract_departments;
  DELETE FROM payments; DELETE FROM contracts; DELETE FROM users; DELETE FROM departments;
  DELETE FROM sqlite_sequence;
`);

// الإدارة الافتراضية
const finDept = db.prepare("INSERT INTO departments (name) VALUES (?)").run("الإدارة المالية");
const finDeptId = Number(finDept.lastInsertRowid);

// المستخدمون
const adminHash = bcrypt.hashSync("Admin@123", 10);
const deptHash = bcrypt.hashSync("Dept@123", 10);
const viewerHash = bcrypt.hashSync("Viewer@123", 10);

db.prepare(
  "INSERT INTO users (name, email, password_hash, role, department_id) VALUES (?,?,?,?,?)"
).run("مدير النظام", "admin@lease.sa", adminHash, "admin", null);

const deptUser = db
  .prepare("INSERT INTO users (name, email, password_hash, role, department_id) VALUES (?,?,?,?,?)")
  .run("مستخدم الإدارة المالية", "finance@lease.sa", deptHash, "department", finDeptId);
const deptUserId = Number(deptUser.lastInsertRowid);

db.prepare(
  "INSERT INTO users (name, email, password_hash, role, department_id) VALUES (?,?,?,?,?)"
).run("مشاهد عام", "viewer@lease.sa", viewerHash, "viewer", null);

const adminId = Number(
  db.prepare("SELECT id FROM users WHERE email = ?").get("admin@lease.sa").id
);

// عقود تجريبية
const samples = [
  {
    direction: "leased_in", title: "إيجار مستودع رئيسي", counterparty: "شركة العقارات المتحدة",
    start: "2026-01-01", end: "2027-01-01", total: 360000, freq: "quarterly",
    reason: "تخزين البضائع والمعدات للعمليات اللوجستية",
  },
  {
    direction: "leased_in", title: "إيجار مكتب إداري", counterparty: "مؤسسة برج الأعمال",
    start: "2026-03-01", end: "2028-03-01", total: 240000, freq: "semi_annual",
    reason: "المقر الإداري للفرع الغربي",
  },
  {
    direction: "leased_out", title: "تأجير محل تجاري", counterparty: "مطعم النكهة الأصيلة",
    start: "2026-02-15", end: "2027-02-15", total: 180000, freq: "monthly",
    reason: "تأجير وحدة تجارية مملوكة للشركة",
  },
  {
    direction: "leased_out", title: "تأجير أرض", counterparty: "شركة المقاولات الحديثة",
    start: "2025-12-01", end: "2026-12-01", total: 120000, freq: "annual",
    reason: "تأجير قطعة أرض لمشروع إنشائي",
  },
];

for (const s of samples) {
  const c = db
    .prepare(
      `INSERT INTO contracts
       (direction, title, counterparty_name, start_date, end_date, total_amount, reason, payment_frequency, created_by)
       VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .run(s.direction, s.title, s.counterparty, s.start, s.end, s.total, s.reason, s.freq, adminId);
  const cid = Number(c.lastInsertRowid);

  // ربط الإدارة المالية كإدارة موافقة
  db.prepare("INSERT INTO contract_departments (contract_id, department_id) VALUES (?,?)").run(cid, finDeptId);

  // توليد الدفعات
  for (const p of genPayments(s.start, s.end, s.total, s.freq)) {
    db.prepare("INSERT INTO payments (contract_id, seq, due_date, amount) VALUES (?,?,?,?)").run(
      cid, p.seq, p.due, p.amount
    );
  }
}

// موافقة تجريبية من الإدارة المالية على أول عقد
const firstContract = db.prepare("SELECT id FROM contracts ORDER BY id LIMIT 1").get();
db.prepare(
  `INSERT INTO approvals (contract_id, department_id, user_id, decision, notes)
   VALUES (?,?,?,?,?)`
).run(firstContract.id, finDeptId, deptUserId, "approved", "تمت المراجعة والموافقة من الناحية المالية");

console.log("✅ تمت تهيئة البيانات الأولية");
console.log("الدخول: admin@lease.sa / Admin@123 (مدير)");
console.log("       finance@lease.sa / Dept@123 (إدارة)");
console.log("       viewer@lease.sa / Viewer@123 (مشاهد)");
db.close();
