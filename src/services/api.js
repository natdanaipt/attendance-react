// ── Constants ────────────────────────────────────
export const MONTHS_TH = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const EMP_KEY = "att_employees";
const DB_NAME = "attendance_db";
const DB_VER = 1;
const STORE = "records";

// ── IndexedDB helpers ─────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("empId", "empId", { unique: false });
        store.createIndex("date", "date", { unique: false });
        store.createIndex("empDate", ["empId", "date"], { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function getAllRecords() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function getRecordsByEmp(empId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const idx = tx.objectStore(STORE).index("empId");
    const req = idx.getAll(empId);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function getRecordsByEmpMonth(empId, monthKey) {
  // monthKey = "2026-05"
  const all = await getRecordsByEmp(empId);
  return all.filter((r) => r.date.startsWith(monthKey));
}

// เพิ่ม record เดียว
export async function addRecord(empId, date, time, type, name, dept) {
  const db = await openDB();
  const rec = {
    id: Date.now(),
    empId,
    date,
    time,
    type,
    name: name || empId,
    dept: dept || "-",
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).add(rec);
    req.onsuccess = () => resolve(rec);
    req.onerror = (e) => reject(e.target.error);
  });
}

// ลบ record
export async function deleteRecord(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

// import หลาย records พร้อมกัน (bulk)
// ลบของเก่าในวัน+คนนั้นก่อน แล้วใส่ใหม่
export async function bulkImport(rows) {
  const db = await openDB();

  // หา unique empId+date ที่จะ import
  const keys = [...new Set(rows.map((r) => `${r.empId}__${r.date}`))];

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const idx = store.index("empId");

    let pending = keys.length;
    if (pending === 0) {
      resolve();
      return;
    }

    // ลบของเก่าก่อน
    keys.forEach((key) => {
      const [empId, date] = key.split("__");
      const req = idx.getAll(empId);
      req.onsuccess = (e) => {
        const old = e.target.result.filter((r) => r.date === date);
        old.forEach((r) => store.delete(r.id));
        pending--;
        if (pending === 0) {
          // ใส่ใหม่ทั้งหมด
          rows.forEach((r) => store.put(r));
        }
      };
    });

    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

// ── Employees (ยังใช้ localStorage เพราะข้อมูลน้อย) ──
export function getEmployees() {
  const raw = localStorage.getItem(EMP_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveEmployees(emps) {
  localStorage.setItem(EMP_KEY, JSON.stringify(emps));
}

function seedEmployees() {
  return [
    { id: "EMP001", name: "สมชาย ใจดี", dept: "บัญชี" },
    { id: "EMP002", name: "สุดา รักงาน", dept: "HR" },
    { id: "EMP003", name: "ประสิทธิ์ มีสุข", dept: "IT" },
    { id: "EMP004", name: "วิไล สวยงาม", dept: "การตลาด" },
    { id: "EMP005", name: "นพดล เก่งงาน", dept: "ขาย" },
    { id: "EMP006", name: "มานี ขยันดี", dept: "คลังสินค้า" },
  ];
}

export function initEmployees() {
  const existing = getEmployees();
  if (existing) return existing;
  const seeded = seedEmployees();
  saveEmployees(seeded);
  return seeded;
}

// ── Utilities ─────────────────────────────────────
export function getStatus(time) {
  const [h, m] = time.split(":").map(Number);
  const t = h * 60 + m;
  if (t <= 8 * 60) return { label: "ตรงเวลา", kind: "ok" };
  if (t <= 8 * 60 + 30) return { label: "มาสาย", kind: "late" };
  return { label: "สายมาก", kind: "late" };
}

export function countWorkDays(year, month) {
  const now = new Date();
  const last = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= last; d++) {
    const dt = new Date(year, month, d);
    if (dt > now) break;
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (dt.getDay() !== 0 && dt.getDay() !== 6 && !isHoliday(ds)) count++;
  }
  return count;
}

export function exportCSV(records, empId, year, month) {
  const data = records
    .filter((r) => r.empId === empId)
    .slice()
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    );

  const rows = [["วันที่", "เวลา", "ประเภท", "สถานะ"]];
  data.forEach((r) => {
    const s = r.type === "in" ? getStatus(r.time).label : "ออกงาน";
    rows.push([r.date, r.time, r.type === "in" ? "เข้างาน" : "ออกงาน", s]);
  });

  const csv = "\uFEFF" + rows.map((r) => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = `attendance_${empId}_${year}-${String(month + 1).padStart(2, "0")}.csv`;
  a.click();
}
// ── Google Sheets ─────────────────────────────────
// ── Backend API ───────────────────────────────────
const API_URL = "https://attendance-api-j7q6.onrender.com";

// ดึง records จาก PostgreSQL
export async function fetchRecordsFromSheets() {
  const res = await fetch(`${API_URL}/api/records`);
  const rows = await res.json();

  const records = [];
  for (const row of rows) {
    const empId = String(row.emp_id);
    const date = row.date?.slice(0, 10);

    if (row.check_in) {
      records.push({
        id: `${empId}_${date}_in`,
        empId,
        date,
        time: row.check_in?.slice(0, 5),
        type: "in",
      });
    }
    if (row.check_out && row.check_out !== row.check_in) {
      records.push({
        id: `${empId}_${date}_out`,
        empId,
        date,
        time: row.check_out?.slice(0, 5),
        type: "out",
      });
    }
  }
  return records;
}

// ดึง employees จาก PostgreSQL
export async function fetchEmployeesFromSheets() {
  const res = await fetch(`${API_URL}/api/employees`);
  const rows = await res.json();

  return rows.map((row) => ({
    id: String(row.id),
    name: row.name || row.id,
    dept: row.dept || "-",
    pos: row.pos || "-",
    gender: row.gender || "-",
  }));
}
// ── วันหยุดราชการไทย 2569 ─────────────────────────
// ── วันหยุดราชการไทย 2569 ─────────────────────────
export const HOLIDAYS_2569 = {
  "2026-01-01": "วันขึ้นปีใหม่",
  "2026-01-02": "วันหยุดพิเศษ",
  "2026-03-03": "วันมาฆบูชา",
  "2026-04-06": "วันจักรี",
  "2026-04-13": "วันสงกรานต์",
  "2026-04-14": "วันสงกรานต์",
  "2026-04-15": "วันสงกรานต์",
  "2026-05-04": "วันฉัตรมงคล",
  "2026-05-13": "วันพืชมงคล",
  "2026-06-01": "ชดเชยวันวิสาขบูชา",
  "2026-06-03": "วันเฉลิมพระชนมพรรษา ร.10",
  "2026-07-28": "วันเฉลิมพระชนมพรรษา ร.10",
  "2026-07-29": "วันอาสาฬหบูชา",
  "2026-07-30": "วันเข้าพรรษา",
  "2026-08-12": "วันแม่แห่งชาติ",
  "2026-10-13": "วันนวมินทรมหาราช",
  "2026-10-23": "วันปิยมหาราช",
  "2026-12-07": "ชดเชยวันพ่อแห่งชาติ",
  "2026-12-10": "วันรัฐธรรมนูญ",
  "2026-12-31": "วันสิ้นปี",
};

export function isHoliday(dateStr) {
  return dateStr in HOLIDAYS_2569;
}

export function getHolidayName(dateStr) {
  return HOLIDAYS_2569[dateStr] || null;
}
