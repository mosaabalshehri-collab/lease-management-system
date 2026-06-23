import type { PaymentFrequency } from "./dates";

/** الأنواع والمسميات المشتركة عبر الواجهة والـ API */

export type Direction = "leased_in" | "leased_out";

export const DIRECTION_LABELS_AR: Record<Direction, string> = {
  leased_in: "نستأجر",   // مبالغ علينا (Payable)
  leased_out: "نؤجّر",   // مبالغ لنا (Receivable)
};

export const DIRECTION_FULL_AR: Record<Direction, string> = {
  leased_in: "عقد مُستأجَر (نحن المستأجر)",
  leased_out: "عقد مُؤجَّر (نحن المؤجِّر)",
};

/** الطرف الآخر حسب الاتجاه */
export const COUNTERPARTY_LABEL_AR: Record<Direction, string> = {
  leased_in: "المؤجِّر (المالك)",
  leased_out: "المستأجر",
};

export type Decision = "approved" | "rejected";

export const DECISION_LABELS_AR: Record<Decision, string> = {
  approved: "موافَق",
  rejected: "مرفوض",
};

export type PaymentStatus = "paid" | "overdue" | "due_soon" | "scheduled";

export const PAYMENT_STATUS_LABELS_AR: Record<PaymentStatus, string> = {
  paid: "مسدَّدة",
  overdue: "متأخرة",
  due_soon: "قريبة الاستحقاق",
  scheduled: "مجدولة",
};

export type ContractStatus = "active" | "expiring" | "expired";

export const CONTRACT_STATUS_LABELS_AR: Record<ContractStatus, string> = {
  active: "ساري",
  expiring: "قارب الانتهاء",
  expired: "منتهي",
};

export interface Department {
  id: number;
  name: string;
  is_active: number;
  created_at: string;
}

export interface Contract {
  id: number;
  direction: Direction;
  title: string;
  counterparty_name: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  reason: string | null;
  payment_frequency: PaymentFrequency;
  file_path: string | null;
  file_name: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
