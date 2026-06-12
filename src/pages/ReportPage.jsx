import { useState, useMemo, useEffect } from "react";
import { getStatus, MONTHS_TH, countWorkDays } from "../services/api";
import "./ReportPage.css";
import "./HistoryPage.css";

const API_URL = import.meta.env.VITE_API_URL;

export default function ReportPage({ employees, isAdmin }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterPos, setFilterPos] = useState("");

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

  const deptOptions = useMemo(
    () => [...new Set(employees.map((e) => e.dept).filter(Boolean))].sort(),
    [employees],
  );

  const posOptions = useMemo(
    () => [...new Set(employees.map((e) => e.pos).filter(Boolean))].sort(),
    [employees],
  );

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
    return rows.filter((e) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !e.id.toLowerCase().includes(q) &&
          !e.name.toLowerCase().includes(q)
        )
          return false;
      }
      if (filterDept && e.dept !== filterDept) return false;
      if (filterPos && e.pos !== filterPos) return false;
      return true;
    });
  }, [rows, search, filterDept, filterPos]);

  // ── สรุปภาพรวม ──
  const summary = useMemo(() => {
    const total = filteredRows.length;
    const workDays = filteredRows[0]?.workDays || 0;
    const totalCame = filteredRows.reduce((s, e) => s + e.days, 0);
    const totalOnTime = filteredRows.reduce((s, e) => s + e.onTime, 0);
    const totalLate = filteredRows.reduce((s, e) => s + e.late, 0);
    const totalAbsent = filteredRows.reduce((s, e) => s + e.absent, 0);
    const avgDays = total > 0 ? (totalCame / total).toFixed(1) : 0;
    const maxPossible = total * workDays;
    const attendanceRate =
      maxPossible > 0 ? Math.round((totalCame / maxPossible) * 100) : 0;
    return {
      total,
      workDays,
      totalCame,
      totalOnTime,
      totalLate,
      totalAbsent,
      avgDays,
      attendanceRate,
    };
  }, [filteredRows]);

  function handleExportPDF() {
    const monthName = MONTHS_TH[month];
    const buddhistYear = year + 543;

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
      </tr>`,
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
    .header p { font-size:14px; }
    table { width:100%; border-collapse:collapse; margin-top:10px; }
    thead tr { background-color:#f0f0f0; }
    th { border:1px solid #ccc; padding:7px 10px; text-align:center; font-weight:700; font-size:13px; }
    td { border:1px solid #ddd; padding:6px 10px; }
    tr:nth-child(even) { background:#fafafa; }
    .summary-box { margin-top:28px; border:1px solid #ccc; border-radius:8px; padding:16px 20px; background:#f8f8f8; }
    .summary-box h2 { font-size:15px; font-weight:700; margin-bottom:12px; }
    .summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    .summary-item { background:#fff; border:1px solid #ddd; border-radius:6px; padding:10px 14px; }
    .summary-item .label { font-size:11px; color:#666; margin-bottom:4px; }
    .summary-item .value { font-size:18px; font-weight:700; color:#2e7d32; }
    .summary-item .value.red { color:#c0392b; }
    .summary-item .value.gold { color:#b8860b; }
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
        <th>รหัส</th><th>ชื่อ-นามสกุล</th><th>แผนก</th><th>ตำแหน่ง</th>
        <th>วันทำงานทั้งหมด</th><th>วันที่มา</th><th>ตรงเวลา</th><th>สาย</th><th>ขาด</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>

  <div class="summary-box">
    <h2>ผลสรุปภาพรวม</h2>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="label">จำนวนพนักงานทั้งหมด</div>
        <div class="value">${summary.total} คน</div>
      </div>
      <div class="summary-item">
        <div class="label">วันที่มาทำงาน (รวม)</div>
        <div class="value">${summary.totalCame} วัน</div>
      </div>
      <div class="summary-item">
        <div class="label">มาทำงานเฉลี่ย</div>
        <div class="value">${summary.avgDays} วัน/คน</div>
      </div>
      <div class="summary-item">
        <div class="label">อัตราการมาทำงาน</div>
        <div class="value">${summary.attendanceRate}%</div>
      </div>
      <div class="summary-item">
        <div class="label">ตรงเวลา (รวม)</div>
        <div class="value">${summary.totalOnTime} ครั้ง</div>
      </div>
      <div class="summary-item">
        <div class="label">มาสาย (รวม)</div>
        <div class="value gold">${summary.totalLate} ครั้ง</div>
      </div>
      <div class="summary-item">
        <div class="label">ขาด (รวม)</div>
        <div class="value red">${summary.totalAbsent} ครั้ง</div>
      </div>
      <div class="summary-item">
        <div class="label">วันทำงานในเดือน</div>
        <div class="value">${summary.workDays} วัน</div>
      </div>
    </div>
  </div>
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

      {/* ── Filter bar ── */}
      <div className="emp-filters" style={{ marginBottom: "1rem" }}>
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
        {(search || filterDept || filterPos) && (
          <button
            className="clear-btn"
            onClick={() => {
              setSearch("");
              setFilterDept("");
              setFilterPos("");
            }}
          >
            ✕ ล้าง
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="rpt-table-wrap">
        <table className="rpt-table">
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อ-นามสกุล</th>
              <th>แผนก</th>
              <th>ตำแหน่ง</th>
              <th>วันทำงานทั้งหมด</th>
              <th>วันที่มา</th>
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

      {/* ── สรุปภาพรวม ── */}
      <div
        style={{
          marginTop: 28,
          background: "#f5f7f5",
          border: "1px solid #d6e4d6",
          borderRadius: 10,
          padding: "20px 24px",
        }}
      >
        <h3
          style={{
            fontSize: 15,
            fontWeight: 700,
            marginBottom: 16,
            color: "#2e5e2e",
          }}
        >
          ผลสรุปภาพรวม — {MONTHS_TH[month]} {year + 543}
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
          }}
        >
          {[
            {
              label: "จำนวนพนักงาน",
              value: `${summary.total} คน`,
              color: "#2e5e2e",
            },
            {
              label: "วันที่มาทำงาน (รวม)",
              value: `${summary.totalCame} วัน`,
              color: "#2e5e2e",
            },
            {
              label: "มาเฉลี่ย",
              value: `${summary.avgDays} วัน/คน`,
              color: "#2e5e2e",
            },
            {
              label: "อัตราการมาทำงาน",
              value: `${summary.attendanceRate}%`,
              color: "#2e5e2e",
            },
            {
              label: "ตรงเวลา (รวม)",
              value: `${summary.totalOnTime} ครั้ง`,
              color: "#2e7d32",
            },
            {
              label: "มาสาย (รวม)",
              value: `${summary.totalLate} ครั้ง`,
              color: "#b8860b",
            },
            {
              label: "ขาด (รวม)",
              value: `${summary.totalAbsent} ครั้ง`,
              color: "#c0392b",
            },
            {
              label: "วันทำงานในเดือน",
              value: `${summary.workDays} วัน`,
              color: "#2e5e2e",
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: "#fff",
                border: "1px solid #d6e4d6",
                borderRadius: 8,
                padding: "12px 16px",
              }}
            >
              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
