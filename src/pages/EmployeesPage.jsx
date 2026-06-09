import { useState, useEffect, useMemo } from "react";
import "./EmployeesPage.css";

const API_URL = "https://attendance-api-j7q6.onrender.com";

export default function EmployeesPage({
  employees,
  records,
  onAddEmp,
  onDeleteEmp,
}) {
  const [todayRecords, setTodayRecords] = useState([]);

  // ── Filter states ──
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterPos, setFilterPos] = useState("");
  const [filterTimeFrom, setFilterTimeFrom] = useState("");
  const [filterTimeTo, setFilterTimeTo] = useState("");

  useEffect(() => {
    async function loadToday() {
      try {
        const res = await fetch(`${API_URL}/api/records`);
        const rows = await res.json();
        const today = new Date().toISOString().slice(0, 10);
        const mapped = [];
        for (const row of rows) {
          let date;
          if (typeof row.date === "string") {
            date = row.date.slice(0, 10);
          } else {
            const d = new Date(row.date);
            date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
          }
          if (date !== today) continue;
          const empId = String(row.emp_id);
          const checkIn = row.check_in
            ? String(row.check_in).slice(0, 5)
            : null;
          const checkOut = row.check_out
            ? String(row.check_out).slice(0, 5)
            : null;
          if (checkIn) mapped.push({ empId, date, time: checkIn, type: "in" });
          if (checkOut)
            mapped.push({ empId, date, time: checkOut, type: "out" });
        }
        setTodayRecords(mapped);
      } catch (err) {
        console.error("โหลด today records ไม่ได้:", err);
      }
    }
    loadToday();
    const interval = setInterval(loadToday, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ── unique dept และ pos สำหรับ dropdown ──
  const deptOptions = useMemo(
    () => [...new Set(employees.map((e) => e.dept).filter(Boolean))].sort(),
    [employees],
  );

  const posOptions = useMemo(
    () => [...new Set(employees.map((e) => e.pos).filter(Boolean))].sort(),
    [employees],
  );

  // ── กรองพนักงาน ──
  const filtered = useMemo(() => {
    return employees.filter((e) => {
      // ค้นหา รหัส / ชื่อ
      if (search) {
        const q = search.toLowerCase();
        if (
          !e.id.toLowerCase().includes(q) &&
          !e.name.toLowerCase().includes(q)
        )
          return false;
      }
      // กรองแผนก
      if (filterDept && e.dept !== filterDept) return false;
      // กรองตำแหน่ง
      if (filterPos && e.pos !== filterPos) return false;
      // กรองเวลาเข้า
      if (filterTimeFrom || filterTimeTo) {
        const todayIn = todayRecords.find(
          (r) => r.empId === e.id && r.type === "in",
        );
        if (!todayIn) return false;
        const [h, m] = todayIn.time.split(":").map(Number);
        const t = h * 60 + m;
        if (filterTimeFrom) {
          const [fh, fm] = filterTimeFrom.split(":").map(Number);
          if (t < fh * 60 + fm) return false;
        }
        if (filterTimeTo) {
          const [th, tm] = filterTimeTo.split(":").map(Number);
          if (t > th * 60 + tm) return false;
        }
      }
      return true;
    });
  }, [
    employees,
    search,
    filterDept,
    filterPos,
    filterTimeFrom,
    filterTimeTo,
    todayRecords,
  ]);

  return (
    <div className="emp-page">
      <h2 className="emp-title">รายชื่อพนักงาน</h2>

      {/* ── Filter bar ── */}
      <div className="emp-filters">
        <input
          type="text"
          placeholder="🔍 ค้นหารหัส หรือ ชื่อ-นามสกุล..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="emp-search"
        />
        <select
          className="export-select"
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
        >
          <option value="">ทุกแผนก</option>
          {deptOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          className="export-select"
          value={filterPos}
          onChange={(e) => setFilterPos(e.target.value)}
        >
          <option value="">ทุกตำแหน่ง</option>
          {posOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div className="time-range">
          <span>เวลาเข้า</span>
          <input
            type="time"
            value={filterTimeFrom}
            onChange={(e) => setFilterTimeFrom(e.target.value)}
            className="time-input"
          />
          <span>ถึง</span>
          <input
            type="time"
            value={filterTimeTo}
            onChange={(e) => setFilterTimeTo(e.target.value)}
            className="time-input"
          />
        </div>
        <button
          className="clear-btn"
          onClick={() => {
            setSearch("");
            setFilterDept("");
            setFilterPos("");
            setFilterTimeFrom("");
            setFilterTimeTo("");
          }}
        >
          ✕ ล้าง
        </button>
      </div>

      {/* ── Table ── */}
      <div className="emp-table-wrap">
        <table className="emp-table">
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อ-นามสกุล</th>
              <th>แผนก</th>
              <th>ตำแหน่ง</th>
              <th>สถานะวันนี้</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-msg">
                    <div className="empty-icon">🌱</div>ไม่พบพนักงาน
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((e) => {
                const todayIn = todayRecords.find(
                  (r) => r.empId === e.id && r.type === "in",
                );
                const todayOut = todayRecords.find(
                  (r) => r.empId === e.id && r.type === "out",
                );
                return (
                  <tr key={e.id}>
                    <td className="emp-id">{e.id}</td>
                    <td className="emp-name">{e.name}</td>
                    <td className="emp-dept">{e.dept || "—"}</td>
                    <td className="emp-pos">{e.pos || "—"}</td>
                    <td>
                      {todayIn ? (
                        <>
                          <span className="entry entry-in">
                            <span className="entry-dot" />
                            เข้า {todayIn.time}
                          </span>
                          {todayOut && (
                            <span
                              className="entry entry-out"
                              style={{ marginLeft: 6 }}
                            >
                              <span className="entry-dot" />
                              ออก {todayOut.time}
                            </span>
                          )}
                        </>
                      ) : (
                        <span
                          className="entry"
                          style={{
                            background: "var(--paper)",
                            color: "var(--text-light)",
                            borderColor: "var(--border-light)",
                          }}
                        >
                          <span
                            className="entry-dot"
                            style={{ background: "var(--border)" }}
                          />
                          ยังไม่เข้า
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="del-btn"
                        onClick={() => {
                          if (window.confirm("ลบพนักงานคนนี้?"))
                            onDeleteEmp(e.id);
                        }}
                        title="ลบ"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
