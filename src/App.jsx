import { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import RecordPage from "./pages/RecordPage";
import HistoryPage from "./pages/HistoryPage";
import ReportPage from "./pages/ReportPage";
import EmployeesPage from "./pages/EmployeesPage";
import ImportPage from "./pages/ImportPage";
import {
  initEmployees,
  saveEmployees,
  addRecord,
  deleteRecord,
  bulkImport,
  getRecordsByEmp,
  getAllRecords,
  fetchRecordsFromSheets, // ← เพิ่ม
  fetchEmployeesFromSheets, // ← เพิ่ม
} from "./services/api";
import "./App.css";

// เมนูพนักงานทั่วไป
const NAV_USER = [
  { key: "dashboard", label: "📅 ปฏิทิน" },
  { key: "history", label: "📋 ประวัติของฉัน" },
];

// เมนู Admin (รหัส ADMIN หรือ 0000)
const NAV_ADMIN = [
  { key: "dashboard", label: "📅 ปฏิทิน" },
  { key: "record", label: "⏱ บันทึกเวลา" },
  { key: "history", label: "📋 ประวัติของฉัน" },
  { key: "report", label: "📈 รายงาน" },
  { key: "employees", label: "👥 พนักงาน" },
  { key: "import", label: "⬆ นำเข้า ZKTime" },
];

// รหัส Admin พิเศษ (ไม่ต้องมีในรายชื่อพนักงาน)
const ADMIN_IDS = ["ADMIN", "admin", "0000"];

export default function App() {
  const [employees, setEmployees] = useState(() => initEmployees());
  const [currentEmp, setCurrentEmp] = useState(null); // null = ยังไม่ได้ login
  const [page, setPage] = useState("dashboard");
  const [toast, setToast] = useState({ msg: "", show: false, error: false });
  const [myRecords, setMyRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const [calYear] = useState(now.getFullYear());
  const [calMonth] = useState(now.getMonth());

  const isAdmin = currentEmp?.id === "__admin__";
  const NAV = isAdmin ? NAV_ADMIN : NAV_USER;

  // เพิ่ม useEffect โหลด employees จาก Sheets ตอนเปิดเว็บ
  useEffect(() => {
    async function loadEmps() {
      try {
        const sheetEmps = await fetchEmployeesFromSheets();
        if (sheetEmps.length > 0) {
          saveEmployees(sheetEmps);
          setEmployees(sheetEmps);
        }
      } catch (err) {
        console.error("โหลด employees ไม่ได้:", err);
      }
    }
    loadEmps();
  }, []); // ← [] = รันครั้งเดียวตอนเปิดเว็บ

  useEffect(() => {
    async function loadEmps() {
      try {
        const sheetEmps = await fetchEmployeesFromSheets();
        if (sheetEmps.length > 0) {
          saveEmployees(sheetEmps);
          setEmployees(sheetEmps);
        }
      } catch (err) {
        console.error("โหลด employees ไม่ได้:", err);
      }
    }
    loadEmps();
  }, []);

  // ── Auto refresh ทุก 5 นาที ──────────────────────
  useEffect(() => {
    if (!currentEmp) return;

    async function refresh() {
      try {
        const allRows = await fetchRecordsFromSheets();
        const myRows = allRows.filter(
          (r) => String(r.empId) === String(currentEmp.id),
        );
        if (myRows.length > 0) await bulkImport(myRows);
        const fresh = await getRecordsByEmp(String(currentEmp.id));
        setMyRecords(fresh);
      } catch (err) {
        console.error("refresh ไม่ได้:", err);
      }
    }

    // รันทันทีตอน login
    refresh();

    // รันซ้ำทุก 5 นาที
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(interval); // cleanup ตอน logout
  }, [currentEmp]);

  // โหลด records เมื่อ login
  useEffect(() => {
    if (!currentEmp) return;
    getRecordsByEmp(currentEmp.id).then(setMyRecords);
  }, [currentEmp]);
  // โหลดข้อมูลจาก Google Sheets เมื่อ login
  useEffect(() => {
    if (!currentEmp) return;

    async function loadFromSheets() {
      try {
        // โหลด employees จาก Sheets (ถ้ายังไม่มีในระบบ)
        const sheetEmps = await fetchEmployeesFromSheets();
        if (sheetEmps.length > 0) {
          saveEmployees(sheetEmps);
          setEmployees(sheetEmps);
        }

        // โหลด records ของคนที่ login แล้ว import เข้า IndexedDB
        const allRows = await fetchRecordsFromSheets();
        const myRows = allRows.filter(
          (r) => String(r.empId) === String(currentEmp.id),
        );
        if (myRows.length > 0) {
          await bulkImport(myRows);
        }

        // โหลด records ของตัวเองมาแสดง
        const fresh = await getRecordsByEmp(String(currentEmp.id));
        setMyRecords(fresh);
      } catch (err) {
        console.error("โหลดจาก Sheets ไม่ได้:", err);
        // fallback ใช้ IndexedDB แทน
        const local = await getRecordsByEmp(String(currentEmp.id));
        setMyRecords(local);
      }
    }

    loadFromSheets();
  }, [currentEmp]);

  // โหลด all records หน้า report/employees (admin only)
  useEffect(() => {
    if (page === "report" || page === "employees") {
      getAllRecords().then(setAllRecords);
    }
  }, [page]);
  // ── SSO Callback ──────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;

    // ลบ code ออกจาก URL
    window.history.replaceState({}, "", "/");

    async function handleSSO() {
      try {
        const res = await fetch(
          "https://attendance-api-j7q6.onrender.com/api/sso/callback",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          },
        );
        const data = await res.json();
        if (data.employee) handleLogin(data.employee);
        else alert("ไม่พบพนักงานในระบบ");
      } catch (err) {
        alert("SSO ไม่สำเร็จ");
      }
    }

    handleSSO();
  }, []);

  function showToast(msg, isError = false) {
    setToast({ msg, show: true, error: isError });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  }

  // ── Login ──────────────────────────────────────
  function handleLogin(emp) {
    setCurrentEmp(emp);
    setPage("dashboard");
  }

  function handleLogout() {
    setCurrentEmp(null);
    setMyRecords([]);
    setAllRecords([]);
    setPage("dashboard");
  }

  // ── Record actions ─────────────────────────────
  async function handleAddRecord(empId, date, time, type) {
    const emp = employees.find((e) => e.id === empId);
    const rec = await addRecord(empId, date, time, type, emp?.name, emp?.dept);
    setMyRecords((prev) => [...prev, rec]);
  }

  async function handleDeleteRecord(id) {
    if (!window.confirm("ลบรายการนี้?")) return;
    await deleteRecord(id);
    setMyRecords((prev) => prev.filter((r) => r.id !== id));
    setAllRecords((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleImport(newRows) {
    setLoading(true);
    const newEmps = [];
    newRows.forEach((r) => {
      const exists =
        employees.find((e) => e.id === r.empId) ||
        newEmps.find((e) => e.id === r.empId);
      if (!exists)
        newEmps.push({ id: r.empId, name: r.empId, dept: "-", pos: "-" });
    });
    if (newEmps.length > 0) {
      const updatedEmps = [...employees, ...newEmps];
      setEmployees(updatedEmps);
      saveEmployees(updatedEmps);
    }
    await bulkImport(newRows);
    const fresh = await getRecordsByEmp(currentEmp.id);
    setMyRecords(fresh);
    setLoading(false);
    showToast(
      `นำเข้าสำเร็จ ${newRows.length} รายการ${newEmps.length > 0 ? ` · เพิ่มพนักงาน ${newEmps.length} คน` : ""}`,
    );
  }

  // ── Employee actions ───────────────────────────
  function handleAddEmp(emp) {
    const updated = [...employees, emp];
    setEmployees(updated);
    saveEmployees(updated);
  }
  function handleDeleteEmp(id) {
    const updated = employees.filter((e) => e.id !== id);
    setEmployees(updated);
    saveEmployees(updated);
  }

  // ── Render page ────────────────────────────────
  function renderPage() {
    switch (page) {
      case "dashboard":
        return (
          <Dashboard
            records={myRecords}
            curEmpId={currentEmp.id}
            currentEmp={currentEmp}
            employees={employees} // ← เพิ่ม
            isAdmin={isAdmin}
          />
        );
      case "record":
        return (
          <RecordPage
            employees={employees}
            curEmpId={currentEmp.id}
            onAdd={handleAddRecord}
            showToast={showToast}
          />
        );
      case "history":
        return (
          <HistoryPage
            records={myRecords}
            employees={employees}
            curEmpId={currentEmp.id}
            calYear={calYear}
            calMonth={calMonth}
            onDelete={handleDeleteRecord}
            isAdmin={isAdmin}
          />
        );
      case "report":
        return (
          <ReportPage
            records={allRecords}
            employees={employees}
            isAdmin={isAdmin}
          />
        );
      case "employees":
        return (
          <EmployeesPage
            employees={employees}
            records={allRecords}
            onAddEmp={handleAddEmp}
            onDeleteEmp={handleDeleteEmp}
          />
        );
      case "import":
        return (
          <ImportPage
            employees={employees}
            onImport={handleImport}
            loading={loading}
          />
        );
      default:
        return null;
    }
  }

  // ── ยังไม่ได้ login → แสดง LoginPage ──────────
  if (!currentEmp) {
    return <LoginPage employees={employees} onLogin={handleLogin} />;
  }

  return (
    <>
      {/* Header */}
      <header className="app-header">
        <div className="app-brand">
          <span>🌿</span>
          <span className="app-brand-text">บันทึกเวลาเข้า-ออกงาน</span>
        </div>
        <div className="app-user">
          <span className="app-user-name">
            {isAdmin ? "👑 Admin" : currentEmp.name || currentEmp.id}
          </span>
          <span className="app-user-dept">
            {!isAdmin && currentEmp.dept ? `· ${currentEmp.dept}` : ""}
          </span>
          <button className="logout-btn" onClick={handleLogout}>
            ออกจากระบบ
          </button>
        </div>
      </header>

      {/* Nav tabs */}
      <nav className="app-nav">
        {NAV.map((n) => (
          <button
            key={n.key}
            className={`nav-tab${page === n.key ? " active" : ""}`}
            onClick={() => setPage(n.key)}
          >
            {n.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main>
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem",
              color: "#8a9b89",
              fontSize: 14,
            }}
          >
            ⏳ กำลังนำเข้าข้อมูล...
          </div>
        ) : (
          renderPage()
        )}
      </main>

      {/* Toast */}
      <div
        className={`toast${toast.show ? " show" : ""}${toast.error ? " error" : ""}`}
      >
        {toast.msg}
      </div>
    </>
  );
}
