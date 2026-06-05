import { useMemo, useState } from "react";
import { getStatus } from "../services/api";
import "./HistoryPage.css";
import { exportPDF } from "../services/exportPDF";

const TH_MONTHS = [
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

export default function HistoryPage({
  records,
  employees,
  curEmpId,
  calYear,
  calMonth,
  onDelete,
  isAdmin,
}) {
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterType, setFilterType] = useState("all");

  const now = new Date();
  const [exportYear, setExportYear] = useState(now.getFullYear());
  const [exportMonth, setExportMonth] = useState(now.getMonth() + 1);

  const emp = employees.find((e) => e.id === curEmpId);
  const yearOptions = Array.from(
    { length: 5 },
    (_, i) => now.getFullYear() - i,
  );

  const myData = useMemo(() => {
    return records
      .filter((r) => {
        if (r.empId !== curEmpId) return false;
        if (filterDate && r.date !== filterDate) return false;
        if (filterType !== "all" && r.type !== filterType) return false;
        if (search && !r.date.includes(search) && !r.time.includes(search))
          return false;
        return true;
      })
      .slice()
      .sort(
        (a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time),
      );
  }, [records, curEmpId, search, filterDate, filterType]);

  const handleExportPDF = () => {
    exportPDF(records, emp, exportYear, exportMonth);
  };

  return (
    <div className="history-page">
      <div className="history-page-header">
        <div>
          <h2 className="hist-title">ประวัติการเข้างาน</h2>
          <p className="hist-sub">
            {emp?.name} · {emp?.dept}
          </p>
        </div>

        {/* ── ปุ่ม Export PDF เฉพาะ Admin ── */}
        {isAdmin && (
          <div className="export-group">
            <select
              className="export-select"
              value={exportMonth}
              onChange={(e) => setExportMonth(Number(e.target.value))}
            >
              {TH_MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              className="export-select"
              value={exportYear}
              onChange={(e) => setExportYear(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y + 543}
                </option>
              ))}
            </select>
            <button className="export-btn" onClick={handleExportPDF}>
              ↓ Export PDF
            </button>
          </div>
        )}
      </div>
      {/* ← ปิด history-page-header */}

      <div className="hist-filters">
        <input
          type="text"
          placeholder="🔍 ค้นหาวันที่ หรือ เวลา..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="export-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">ทั้งหมด</option>
          <option value="in">เข้างาน</option>
          <option value="out">ออกงาน</option>
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
        <button
          className="clear-btn"
          onClick={() => {
            setSearch("");
            setFilterDate("");
            setFilterType("all");
          }}
        >
          ✕ ล้าง
        </button>
      </div>

      <div className="hist-table-wrap">
        <table className="hist-table">
          <thead>
            <tr>
              <th>#</th>
              <th>วันที่</th>
              <th>เวลา</th>
              <th>ประเภท</th>
              <th>สถานะ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {myData.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-msg">
                    <div className="empty-icon">🌱</div>
                    ยังไม่มีบันทึก
                  </div>
                </td>
              </tr>
            ) : (
              myData.map((r, i) => {
                const s = r.type === "in" ? getStatus(r.time) : null;
                return (
                  <tr key={r.id}>
                    <td className="row-num">{i + 1}</td>
                    <td className="row-date">{r.date}</td>
                    <td className="row-time">{r.time}</td>
                    <td>
                      {r.type === "in" ? (
                        <span className="entry entry-in">
                          <span className="entry-dot" />
                          เข้างาน
                        </span>
                      ) : (
                        <span className="entry entry-out">
                          <span className="entry-dot" />
                          ออกงาน
                        </span>
                      )}
                    </td>
                    <td>—</td>
                    <td>
                      <button
                        className="del-btn"
                        onClick={() => onDelete(r.id)}
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
