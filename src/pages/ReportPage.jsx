import { useState, useMemo, useEffect } from "react";
import { getStatus, MONTHS_TH, countWorkDays } from "../services/api";
import "./ReportPage.css";
import "./HistoryPage.css";

const API_URL = "https://attendance-api-j7q6.onrender.com";

export default function ReportPage({ employees, isAdmin }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadRecords() {
      try {
        const res = await fetch(`${API_URL}/api/records`);
        const rows = await res.json();
        const mapped = [];
        for (const row of rows) {
          let date;
          if (typeof row.date === "string") {
            date = row.date.slice(0, 10);
          } else {
            const d = new Date(row.date);
            date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          }
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
        setRecords(mapped);
      } catch (err) {
        console.error("โหลด records ไม่ได้:", err);
      }
    }
    loadRecords();
  }, []);

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const rows = useMemo(() => {
    const inRecs = records.filter(
      (r) => r.date.startsWith(monthKey) && r.type === "in",
    );
    const workDays = countWorkDays(year, month);
    return employees.map((e) => {
      const myRecs = inRecs.filter((r) => r.empId === e.id);
      const days = [...new Set(myRecs.map((r) => r.date))].length;
      const late = myRecs.filter(
        (r) => getStatus(r.time).kind === "late",
      ).length;
      const onTime = myRecs.length - late;
      const absent = Math.max(0, workDays - days);
      return { ...e, days, onTime, late, absent, workDays };
    });
  }, [records, employees, monthKey, year, month]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (e) => e.id.toLowerCase().includes(q) || e.name.toLowerCase().includes(q),
    );
  }, [rows, search]);

  function handleExportPDF() {
    const monthName = MONTHS_TH[month];
    const buddhistYear = year + 543;
    const workDays = filteredRows[0]?.workDays || 0;

    const tableRows = filteredRows
      .map(
        (e) => `
      <tr>
        <td>${e.id}</td>
        <td>${e.name}</td>
        <td>${e.dept || "-"}</td>
        <td>${e.pos || "-"}</td>
        <td style="text-align:center">${e.workDays}</td>
        <td style="text-align:center">${e.days}</td>
        <td style="text-align:center; color:green">${e.onTime}</td>
        <td style="text-align:center; color:#cc0000">${e.late}</td>
        <td style="text-align:center; color:#cc0000">${e.absent}</td>
      </tr>
    `,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8"/>
  <title>รายงานสรุปรายเดือน</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Sarabun',sans-serif; font-size:13px; color:#111; padding:30px 40px; }
    .header { text-align:center; margin-bottom:20px; }
    .header h1 { font-size:18px; font-weight:700; margin-bottom:4px; }
    .header p  { font-size:14px; }
    table { width:100%; border-collapse:collapse; margin-top:10px; }
    thead tr { background-color:#f0f0f0; }
    th { border:1px solid #ccc; padding:7px 10px; text-align:center; font-weight:700; font-size:13px; }
    td { border:1px solid #ddd; padding:6px 10px; }
    tr:nth-child(even) { background:#fafafa; }
    @media print { @page { size:A4 landscape; margin:15mm; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>รายงานสรุปการเข้าปฏิบัติงาน</h1>
    <p>ประจำเดือน ${monthName} ${buddhistYear}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>รหัส</th>
        <th>ชื่อ-นามสกุล</th>
        <th>แผนก</th>
        <th>ตำแหน่ง</th>
        <th>วันทำงานทั้งหมด</th>
        <th>วันที่มาทำงาน</th>
        <th>ตรงเวลา</th>
        <th>สาย</th>
        <th>ขาด</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 800);
  }

  return (
    <div className="report-page">
      <div className="report-header">
        <h2 className="report-title">รายงานสรุปรายเดือน</h2>
        <div className="export-group">
          <select
            className="export-select"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS_TH.map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            className="export-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map(
              (y) => (
                <option key={y} value={y}>
                  {y + 543}
                </option>
              ),
            )}
          </select>
          {isAdmin && (
            <button className="export-btn" onClick={handleExportPDF}>
              ↓ Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="emp-filters" style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="🔍 ค้นหารหัส หรือ ชื่อ-นามสกุล..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="emp-search"
        />
        {search && (
          <button className="clear-btn" onClick={() => setSearch("")}>
            ✕ ล้าง
          </button>
        )}
      </div>

      <div className="rpt-table-wrap">
        <table className="rpt-table">
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อ-นามสกุล</th>
              <th>แผนก</th>
              <th>ตำแหน่ง</th>
              <th>วันทำงานทั้งหมด</th>
              <th>วันที่มาทำงาน</th>
              <th>ตรงเวลา</th>
              <th>สาย</th>
              <th>ขาด</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((e) => (
              <tr key={e.id}>
                <td className="rpt-id">{e.id}</td>
                <td className="rpt-name">{e.name}</td>
                <td className="rpt-dept">{e.dept}</td>
                <td className="rpt-dept">{e.pos || "—"}</td>
                <td className="rpt-num">{e.workDays}</td>
                <td className="rpt-num">{e.days}</td>
                <td>
                  <span className="rpt-ok">{e.onTime}</span>
                </td>
                <td>
                  <span className="rpt-late">{e.late}</span>
                </td>
                <td>
                  <span className="rpt-absent">{e.absent}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
