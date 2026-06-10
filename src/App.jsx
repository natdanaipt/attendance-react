import { useState, useEffect, useRef } from "react";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import RecordPage from "./pages/RecordPage";
import HistoryPage from "./pages/HistoryPage";
import ReportPage from "./pages/ReportPage";
import EmployeesPage from "./pages/EmployeesPage";
import ImportPage from "./pages/ImportPage";
import AdminDashboard from "./pages/AdminDashboard";
import {
  initEmployees,
  saveEmployees,
  addRecord,
  deleteRecord,
  bulkImport,
  getRecordsByEmp,
  getAllRecords,
  fetchRecordsFromSheets,
  fetchEmployeesFromSheets,
} from "./services/api";
import "./App.css";

const NAV_USER = [
  { key: "dashboard", label: "📅 ปฏิทิน" },
  { key: "history", label: "📋 ประวัติของฉัน" },
];

const NAV_ADMIN = [
  { key: "dashboard", label: "📅 ปฏิทิน" },
  { key: "history", label: "📋 ประวัติของฉัน" },
  {
    key: "report_group",
    label: "📈 รายงาน",
    sub: [
      { key: "report_dashboard", label: "📊 Dashboard" },
      { key: "report_monthly", label: "📋 สรุปรายเดือน" },
    ],
  },
  { key: "employees", label: "👥 พนักงาน" },
];

export default function App() {
  const [employees, setEmployees] = useState(() => initEmployees());
  const [currentEmp, setCurrentEmp] = useState(() => {
    const saved = sessionStorage.getItem("currentEmp");
    return saved ? JSON.parse(saved) : null;
  });
  const [page, setPage] = useState("dashboard");
  const [toast, setToast] = useState({ msg: "", show: false, error: false });
  const [myRecords, setMyRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const [calYear] = useState(now.getFullYear());
  const [calMonth] = useState(now.getMonth());
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ✅ เพิ่ม ref สำหรับตรวจจับการคลิกข้างนอก
  const dropdownRef = useRef(null);

  const isAdmin =
    currentEmp?.id === "__admin__" || currentEmp?.role === "admin";
  const NAV = isAdmin ? NAV_ADMIN : NAV_USER;

  const REPORT_PAGES = ["report_dashboard", "report_monthly"];

  // ✅ ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

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
    refresh();
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentEmp]);

  useEffect(() => {
    if (!currentEmp) return;
    getRecordsByEmp(currentEmp.id).then(setMyRecords);
  }, [currentEmp]);

  useEffect(() => {
    if (!currentEmp) return;
    async function loadFromSheets() {
      try {
        const sheetEmps = await fetchEmployeesFromSheets();
        if (sheetEmps.length > 0) {
          saveEmployees(sheetEmps);
          setEmployees(sheetEmps);
        }
        const allRows = await fetchRecordsFromSheets();
        const myRows = allRows.filter(
          (r) => String(r.empId) === String(currentEmp.id),
        );
        if (myRows.length > 0) await bulkImport(myRows);
        const fresh = await getRecordsByEmp(String(currentEmp.id));
        setMyRecords(fresh);
      } catch (err) {
        console.error("โหลดจาก Sheets ไม่ได้:", err);
        const local = await getRecordsByEmp(String(currentEmp.id));
        setMyRecords(local);
      }
    }
    loadFromSheets();
  }, [currentEmp]);

  useEffect(() => {
    if (REPORT_PAGES.includes(page) || page === "employees") {
      getAllRecords().then(setAllRecords);
    }
  }, [page]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;
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

  function handleLogin(emp) {
    setCurrentEmp(emp);
    sessionStorage.setItem("currentEmp", JSON.stringify(emp));
    setPage("dashboard");
  }

  function handleLogout() {
    setCurrentEmp(null);
    sessionStorage.removeItem("currentEmp");
    setMyRecords([]);
    setAllRecords([]);
    setPage("dashboard");
  }

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
  async function handleUpdateEmp(id, dept, pos) {
    try {
      const res = await fetch(
        `https://attendance-api-j7q6.onrender.com/api/employees/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dept, pos }),
        },
      );
      if (!res.ok) throw new Error("Update failed");
      const updated = employees.map((e) =>
        e.id === id ? { ...e, dept, pos } : e,
      );
      setEmployees(updated);
      saveEmployees(updated);
    } catch (err) {
      alert("แก้ไขไม่สำเร็จ: " + err.message);
    }
  }

  function renderPage() {
    switch (page) {
      case "dashboard":
        return (
          <Dashboard
            records={myRecords}
            curEmpId={currentEmp.id}
            currentEmp={currentEmp}
            employees={employees}
            isAdmin={isAdmin}
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
      case "report_dashboard":
        return <AdminDashboard employees={employees} />;
      case "report_monthly":
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
            onUpdateEmp={handleUpdateEmp}
            isAdmin={isAdmin}
          />
        );
      default:
        return null;
    }
  }

  if (!currentEmp) {
    return <LoginPage employees={employees} onLogin={handleLogin} />;
  }

  return (
    <>
      <header className="app-header">
        <div className="app-brand">
          <img src="/ITED.png" alt="logo" className="brand-logo" />
          <span className="app-brand-text">ITED-TIMEFLOW</span>
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

      <nav className="app-nav">
        {NAV.map((n) =>
          n.sub ? (
            // ✅ เพิ่ม position: relative และ ref เพื่อให้ dropdown วางตำแหน่งถูกต้อง
            <div
              key={n.key}
              className="nav-dropdown"
              ref={dropdownRef}
              style={{ position: "relative" }}
            >
              <button
                className={`nav-tab${REPORT_PAGES.includes(page) ? " active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen((prev) => !prev);
                }}
              >
                {n.label} ▾
              </button>
              {dropdownOpen && (
                <div
                  className="nav-dropdown-menu"
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    background: "white",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 9999,
                    minWidth: "160px",
                  }}
                >
                  {n.sub.map((s) => (
                    <button
                      key={s.key}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "10px 16px",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setPage(s.key);
                        setDropdownOpen(false);
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              key={n.key}
              className={`nav-tab${page === n.key ? " active" : ""}`}
              onClick={() => setPage(n.key)}
            >
              {n.label}
            </button>
          ),
        )}
      </nav>

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

      <div
        className={`toast${toast.show ? " show" : ""}${toast.error ? " error" : ""}`}
      >
        {toast.msg}
      </div>
    </>
  );
}
