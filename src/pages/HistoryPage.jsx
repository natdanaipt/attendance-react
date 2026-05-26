import { useMemo, useState } from "react";
import { getStatus } from "../services/api";
import { exportPDF } from "../services/exportPDF";
import "./HistoryPage.css";

export default function HistoryPage({
  records,
  employees,
  curEmpId,
  calYear,
  calMonth,
  onDelete,
}) {
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const emp = employees.find((e) => e.id === curEmpId);

  const myData = useMemo(() => {
    return records
      .filter((r) => {
        if (r.empId !== curEmpId) return false;
        if (filterDate && r.date !== filterDate) return false;
        if (search && !r.date.includes(search) && !r.time.includes(search))
          return false;
        return true;
      })
      .slice()
      .sort(
        (a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time),
      );
  }, [records, curEmpId, search, filterDate]);

  const handleExportPDF = () => {
    exportPDF(records, emp, calYear, calMonth);
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
        {/* เปลี่ยนจาก Export CSV → Export PDF */}
        <button className="export-btn" onClick={handleExportPDF}>
          ↓ Export PDF
        </button>
      </div>

      <div className="hist-filters">
        <input
          type="text"
          placeholder="🔍 ค้นหาวันที่ หรือ เวลา..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
