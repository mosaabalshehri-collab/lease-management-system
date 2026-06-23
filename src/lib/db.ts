import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

/**
 * طبقة الوصول لقاعدة البيانات (SQLite عبر node:sqlite المدمج).
 *
 * نستخدم singleton عشان نفتح اتصال واحد فقط طوال عمر الخادم. المخطط
 * (schema) يُنشأ تلقائياً عند أول اتصال إذا ما كان موجوداً، فما نحتاج
 * خطوة migration منفصلة في هذه المرحلة.
 */

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "app.db");

let _db: DatabaseSync | null = null;

function initSchema(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- الإدارات: بيانات يديرها مدير النظام (مو مثبّتة في الكود)
    CREATE TABLE IF NOT EXISTS departments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- المستخدمون والأدوار: admin | department | viewer
    CREATE TABLE IF NOT EXISTS users (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL,
      email          TEXT NOT NULL UNIQUE,
      password_hash  TEXT NOT NULL,
      role           TEXT NOT NULL CHECK (role IN ('admin','department','viewer')),
      department_id  INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      is_active      INTEGER NOT NULL DEFAULT 1,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- العقود: الاتجاه leased_in (نستأجر/علينا) أو leased_out (نؤجّر/لنا)
    CREATE TABLE IF NOT EXISTS contracts (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      direction          TEXT NOT NULL CHECK (direction IN ('leased_in','leased_out')),
      title              TEXT NOT NULL,
      counterparty_name  TEXT NOT NULL,
      start_date         TEXT NOT NULL,   -- ISO YYYY-MM-DD (ميلادي)
      end_date           TEXT NOT NULL,   -- ISO YYYY-MM-DD
      total_amount       REAL NOT NULL,   -- بالريال السعودي
      reason             TEXT,            -- سبب الاستئجار/التأجير
      payment_frequency  TEXT NOT NULL CHECK (
        payment_frequency IN ('monthly','quarterly','four_monthly','semi_annual','annual')
      ),
      file_path          TEXT,            -- مسار ملف العقد المرفق
      file_name          TEXT,            -- الاسم الأصلي للملف
      created_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at         TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at         TEXT             -- حذف ناعم (soft delete)
    );

    -- جدول الدفعات: يُولَّد تلقائياً من تاريخ البداية + الدورية
    CREATE TABLE IF NOT EXISTS payments (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id  INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
      seq          INTEGER NOT NULL,      -- رقم الدفعة بالتسلسل
      due_date     TEXT NOT NULL,         -- ISO YYYY-MM-DD
      amount       REAL NOT NULL,
      paid_at      TEXT,                  -- إذا تم السداد
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- الإدارات المطلوب موافقتها على كل عقد (علاقة متعددة لمتعدد)
    CREATE TABLE IF NOT EXISTS contract_departments (
      contract_id   INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
      department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      PRIMARY KEY (contract_id, department_id)
    );

    -- قرارات الموافقة: كل إدارة تسجّل رأيها (approved | rejected)
    CREATE TABLE IF NOT EXISTS approvals (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id    INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
      department_id  INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
      decision       TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
      notes          TEXT,            -- ملاحظات الموافقة
      rejection_reason TEXT,          -- سبب الرفض (إجباري عند الرفض)
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (contract_id, department_id)
    );

    -- التنبيهات داخل النظام (انتهاء عقد / استحقاق دفعة)
    CREATE TABLE IF NOT EXISTS notifications (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      type         TEXT NOT NULL CHECK (type IN ('contract_expiry','payment_due')),
      contract_id  INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
      payment_id   INTEGER REFERENCES payments(id) ON DELETE CASCADE,
      message      TEXT NOT NULL,
      is_read      INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (type, contract_id, payment_id)
    );

    CREATE INDEX IF NOT EXISTS idx_contracts_direction ON contracts(direction);
    CREATE INDEX IF NOT EXISTS idx_contracts_deleted ON contracts(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);
    CREATE INDEX IF NOT EXISTS idx_payments_due ON payments(due_date);
    CREATE INDEX IF NOT EXISTS idx_approvals_contract ON approvals(contract_id);
  `);
}

export function getDb(): DatabaseSync {
  if (_db) return _db;
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  _db = new DatabaseSync(DB_PATH);
  initSchema(_db);
  return _db;
}
