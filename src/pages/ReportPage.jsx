import { useState, useMemo } from "react";
import { getStatus, MONTHS_TH, exportPDF } from "../services/api";
import "./ReportPage.css";

export default function ReportPage({ records, employees, isAdmin }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const rows = useMemo(() => {
    const inRecs = records.filter(
      (r) => r.date.startsWith(monthKey) && r.type === "in",
    );
    return employees.map((e) => {
      const myRecs = inRecs.filter((r) => r.empId === e.id);
      const days = [...new Set(myRecs.map((r) => r.date))].length;
      const late = myRecs.filter(
        (r) => getStatus(r.time).kind === "late",
      ).length;
      const onTime = myRecs.length - late;
      const totalMins = myRecs.reduce((s, r) => {
        const [h, m] = r.time.split(":").map(Number);
        return s + h * 60 + m;
      }, 0);
      const avgTime =
        myRecs.length > 0
          ? `${String(Math.floor(totalMins / myRecs.length / 60)).padStart(2, "0")}:${String(Math.floor((totalMins / myRecs.length) % 60)).padStart(2, "0")}`
          : "—";
      return { ...e, days, onTime, late, avgTime };
    });
  }, [records, employees, monthKey]);

  function changeMonth(dir) {
    let m = month + dir;
    let y = year;
    if (m > 11) {
      m = 0;
      y++;
    }
    if (m < 0) {
      m = 11;
      y--;
    }
    setMonth(m);
    setYear(y);
  }

  // Export PDF ทุกคนในเดือนนั้น
  function handleExportPDF() {
    exportPDF(records, { name: "ทุกคน", id: "all" }, year, month);
  }

  return (
    <div className="report-page">
      <div className="report-header">
        <h2 className="report-title">รายงานสรุปรายเดือน</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="report-month-nav">
            <button className="rpt-nav-btn" onClick={() => changeMonth(-1)}>
              &#8592;
            </button>
            <span className="rpt-month-label">
              {MONTHS_TH[month]} {year + 543}
            </span>
            <button className="rpt-nav-btn" onClick={() => changeMonth(1)}>
              &#8594;
            </button>
          </div>

          {/* ปุ่ม Export PDF — Admin เท่านั้น */}
          {isAdmin && (
            <button className="export-pdf-btn" onClick={handleExportPDF}>
              ⬇ Export PDF
            </button>
          )}
        </div>
      </div>

      <div className="rpt-table-wrap">
        <table className="rpt-table">
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อ-นามสกุล</th>
              <th>แผนก</th>
              <th>วันที่มา</th>
              <th>ตรงเวลา</th>
              <th>สาย</th>
              <th>เวลาเข้าเฉลี่ย</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td className="rpt-id">{e.id}</td>
                <td className="rpt-name">{e.name}</td>
                <td className="rpt-dept">{e.dept}</td>
                <td className="rpt-num">{e.days}</td>
                <td>
                  <span className="rpt-ok">{e.onTime}</span>
                </td>
                <td>
                  <span className="rpt-late">{e.late}</span>
                </td>
                <td className="rpt-avg">{e.avgTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
