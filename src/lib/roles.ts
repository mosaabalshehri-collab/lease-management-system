/** أنواع الأدوار ومسمياتها - آمنة للاستخدام في مكوّنات العميل (لا تستورد next/headers) */
export type Role = "admin" | "department" | "viewer";

export const ROLE_LABELS_AR: Record<Role, string> = {
  admin: "مدير النظام",
  department: "مستخدم إدارة",
  viewer: "مشاهد عام",
};
