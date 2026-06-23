import { spawn } from "node:child_process";
const BASE = "http://localhost:3000";
function waitReady(t=25000){const s=Date.now();return new Promise((res,rej)=>{const tk=async()=>{try{const r=await fetch(`${BASE}/login`);if(r.ok)return res(1);}catch{}if(Date.now()-s>t)return rej(new Error("timeout"));setTimeout(tk,500);};tk();});}
async function login(e,p){const r=await fetch(`${BASE}/api/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,password:p})});return (r.headers.get("set-cookie")||"").split(";")[0];}

const srv = spawn("npm",["start"],{env:{...process.env,NODE_OPTIONS:"--experimental-sqlite"},stdio:"ignore"});
let fail=0;
try{
  await waitReady(); console.log("✓ server ready\n");
  const admin = await login("admin@lease.sa","Admin@123");

  // 1) إنشاء عقد جديد عبر FormData
  console.log("=== إنشاء عقد (نؤجّر، ربعي، سنة، 100000) ===");
  const fd = new FormData();
  fd.set("direction","leased_out"); fd.set("title","عقد اختبار تلقائي");
  fd.set("counterparty_name","مستأجر تجريبي"); fd.set("start_date","2026-01-01");
  fd.set("end_date","2027-01-01"); fd.set("total_amount","100000");
  fd.set("reason","اختبار"); fd.set("payment_frequency","quarterly");
  const cr = await fetch(`${BASE}/api/contracts`,{method:"POST",headers:{Cookie:admin},body:fd});
  const crd = await cr.json();
  console.log(`  إنشاء: ${cr.status} ${crd.ok?"✓":"✗"} (id=${crd.id})`);
  if(!crd.ok) fail++;

  // 2) تحقق من توليد الدفعات (يجب 4 دفعات)
  const detail = await fetch(`${BASE}/contracts/${crd.id}`,{headers:{Cookie:admin}});
  const html = (await detail.text()).replace(/<!--.*?-->/g,"");
  const payCount = (html.match(/جدول الدفعات \((\d+)\)/)||[])[1];
  console.log(`  توليد الدفعات: ${payCount} دفعة ${payCount==="4"?"✓":"✗"}`);
  if(payCount!=="4") fail++;

  // 3) مستخدم إدارة يحاول إنشاء عقد (يجب 403)
  const dept = await login("finance@lease.sa","Dept@123");
  const fd2=new FormData(); fd2.set("direction","leased_in"); fd2.set("title","x");
  fd2.set("counterparty_name","y"); fd2.set("start_date","2026-01-01"); fd2.set("end_date","2027-01-01");
  fd2.set("total_amount","1000"); fd2.set("payment_frequency","monthly");
  const dc = await fetch(`${BASE}/api/contracts`,{method:"POST",headers:{Cookie:dept},body:fd2});
  console.log(`  إدارة تنشئ عقد: ${dc.status} ${dc.status===403?"✓ مُنع":"✗"}`);
  if(dc.status!==403) fail++;

  // 4) رفض بدون سبب (يجب 400)
  const rej = await fetch(`${BASE}/api/contracts/1/approvals`,{method:"POST",headers:{Cookie:dept,"Content-Type":"application/json"},body:JSON.stringify({decision:"rejected"})});
  console.log(`  رفض بدون سبب: ${rej.status} ${rej.status===400?"✓ مُنع":"✗"}`);
  if(rej.status!==400) fail++;

  // 5) موافقة صحيحة من الإدارة
  const app = await fetch(`${BASE}/api/contracts/1/approvals`,{method:"POST",headers:{Cookie:dept,"Content-Type":"application/json"},body:JSON.stringify({decision:"approved",notes:"موافق"})});
  console.log(`  موافقة الإدارة: ${app.status} ${app.status===200?"✓":"✗"}`);
  if(app.status!==200) fail++;

  // 6) تسجيل سداد دفعة (admin)
  const pay = await fetch(`${BASE}/api/payments/1`,{method:"PATCH",headers:{Cookie:admin,"Content-Type":"application/json"},body:JSON.stringify({paid:true})});
  console.log(`  تسجيل سداد: ${pay.status} ${pay.status===200?"✓":"✗"}`);
  if(pay.status!==200) fail++;

  // 7) إضافة إدارة + حذف الإدارة المالية (مرتبطة، يجب 409)
  const delFin = await fetch(`${BASE}/api/departments/1`,{method:"DELETE",headers:{Cookie:admin}});
  console.log(`  حذف إدارة مرتبطة: ${delFin.status} ${delFin.status===409?"✓ مُنع (يُقترح التعطيل)":"✗"}`);
  if(delFin.status!==409) fail++;

  console.log(`\n${fail===0?"✅ كل اختبارات العمليات نجحت":`❌ ${fail} فشل`}`);
}catch(e){console.error("خطأ:",e.message);fail=99;}finally{srv.kill("SIGKILL");}
process.exit(fail===0?0:1);
