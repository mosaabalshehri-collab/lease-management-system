import { spawn } from "node:child_process";

const BASE = "http://localhost:3000";

function waitReady(timeoutMs = 25000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const r = await fetch(`${BASE}/login`);
        if (r.ok) return resolve(true);
      } catch {}
      if (Date.now() - start > timeoutMs) return reject(new Error("timeout"));
      setTimeout(tick, 500);
    };
    tick();
  });
}

async function login(email, password) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const cookie = r.headers.get("set-cookie") || "";
  return { ok: r.ok, cookie: cookie.split(";")[0] };
}

async function check(path, marker, cookie) {
  const r = await fetch(`${BASE}${path}`, { headers: { Cookie: cookie }, redirect: "manual" });
  const body = r.status < 400 ? await r.text() : "";
  const found = marker ? body.includes(marker) : true;
  console.log(`  ${path} → ${r.status} ${found ? "✓" : "✗ (marker missing)"}`);
  return found && r.status < 400;
}

const srv = spawn("npm", ["start"], {
  env: { ...process.env, NODE_OPTIONS: "--experimental-sqlite" },
  stdio: "ignore",
});

let failures = 0;
try {
  await waitReady();
  console.log("✓ server ready\n");

  console.log("=== مدير النظام ===");
  const admin = await login("admin@lease.sa", "Admin@123");
  console.log(`  login: ${admin.ok ? "✓" : "✗"}`);
  const adminPages = [
    ["/dashboard", "لوحة المعلومات"],
    ["/contracts", "جميع العقود"],
    ["/contracts?dir=leased_in", "عقود نستأجرها"],
    ["/contracts?dir=leased_out", "عقود نؤجّرها"],
    ["/contracts/1", "جدول الدفعات"],
    ["/contracts/new", "عقد جديد"],
    ["/payments?type=payable", "مبالغ مطلوبة"],
    ["/payments?type=receivable", "نحصّلها"],
    ["/reports/monthly?year=2026&month=1", "التقرير الشهري"],
    ["/departments", "الإدارات"],
    ["/users", "المستخدمون"],
    ["/notifications", "التنبيهات"],
  ];
  for (const [p, m] of adminPages) if (!(await check(p, m, admin.cookie))) failures++;

  console.log("\n=== مستخدم إدارة ===");
  const dept = await login("finance@lease.sa", "Dept@123");
  console.log(`  login: ${dept.ok ? "✓" : "✗"}`);
  for (const [p, m] of [["/dashboard", "لوحة المعلومات"], ["/approvals", "الموافقات"], ["/contracts/1", "جدول الدفعات"]])
    if (!(await check(p, m, dept.cookie))) failures++;

  console.log("\n=== مشاهد عام ===");
  const viewer = await login("viewer@lease.sa", "Viewer@123");
  console.log(`  login: ${viewer.ok ? "✓" : "✗"}`);
  for (const [p, m] of [["/dashboard", "لوحة المعلومات"], ["/contracts", "جميع العقود"]])
    if (!(await check(p, m, viewer.cookie))) failures++;

  // اختبار صلاحية: مشاهد يحاول صفحة المستخدمين (يجب إعادة توجيه)
  console.log("\n=== اختبار الصلاحيات ===");
  const r = await fetch(`${BASE}/users`, { headers: { Cookie: viewer.cookie }, redirect: "manual" });
  console.log(`  مشاهد → /users: ${r.status} ${r.status === 307 || r.status === 302 ? "✓ مُعاد توجيهه" : "✗ لم يُمنع"}`);
  if (r.status !== 307 && r.status !== 302) failures++;

  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
} catch (e) {
  console.error("خطأ:", e.message);
  failures = 99;
} finally {
  srv.kill("SIGKILL");
}
process.exit(failures === 0 ? 0 : 1);
