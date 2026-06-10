import { useState, useEffect, useMemo } from "react";
import "./EmployeesPage.css";

const API_URL = "https://attendance-api-j7q6.onrender.com";

const MONTHS_TH = [
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

function getStatus(time) {
  const [h, m] = time.split(":").map(Number);
  const t = h * 60 + m;
  if (t <= 8 * 60 + 30) return { label: "ตรงเวลา", kind: "ok" };
  return { label: "มาสาย", kind: "late" };
}

function getPastWorkDays(n = 60) {
  const result = [];
  const now = new Date();
  let d = new Date(now);
  while (result.length < n) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      result.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      );
    }
    d.setDate(d.getDate() - 1);
  }
  return result;
}

function getLocalDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function EmployeesPage({
  employees,
  records,
  onAddEmp,
  onDeleteEmp,
  onUpdateEmp,
  isAdmin,
}) {
  const [allRecords, setAllRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr());

  // Filter states
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterPos, setFilterPos] = useState("");
  const [filterTimeFrom, setFilterTimeFrom] = useState("");
  const [filterTimeTo, setFilterTimeTo] = useState("");
  const [editModal, setEditModal] = useState(null); // { id, name, dept, pos }
  const [saving, setSaving] = useState(false);

  const today = getLocalDateStr();

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
        setAllRecords(mapped);
      } catch (err) {
        console.error("โหลด records ไม่ได้:", err);
      }
    }
    loadRecords();
    const interval = setInterval(loadRecords, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const dayRecords = useMemo(
    () => allRecords.filter((r) => r.date === selectedDate),
    [allRecords, selectedDate],
  );

  const pastWorkDays = useMemo(() => getPastWorkDays(60), []);

  const deptOptions = useMemo(
    () => [...new Set(employees.map((e) => e.dept).filter(Boolean))].sort(),
    [employees],
  );

  const posOptions = useMemo(
    () => [...new Set(employees.map((e) => e.pos).filter(Boolean))].sort(),
    [employees],
  );

  const filtered = useMemo(() => {
    return employees.filter((e) => {
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
      if (filterTimeFrom || filterTimeTo) {
        const rec = dayRecords.find((r) => r.empId === e.id && r.type === "in");
        if (!rec) return false;
        const [h, m] = rec.time.split(":").map(Number);
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
    dayRecords,
  ]);

  function handleExportPDF() {
    const dateObj = new Date(selectedDate);
    const dateLabel = `${dateObj.getDate()} ${MONTHS_TH[dateObj.getMonth()]} ${dateObj.getFullYear() + 543}`;

    const rows = filtered
      .map((e) => {
        const recIn = dayRecords.find(
          (r) => r.empId === e.id && r.type === "in",
        );
        const recOut = dayRecords.find(
          (r) => r.empId === e.id && r.type === "out",
        );
        const status = recIn ? getStatus(recIn.time).label : "ยังไม่เข้า";
        const statusColor = recIn
          ? getStatus(recIn.time).kind === "late"
            ? "#c0392b"
            : "#2e7d32"
          : "#999";
        return `<tr>
        <td>${e.id}</td>
        <td>${e.name || "-"}</td>
        <td>${e.dept || "-"}</td>
        <td>${e.pos || "-"}</td>
        <td>${recIn?.time || "-"}</td>
        <td>${recOut?.time || "-"}</td>
        <td style="color:${statusColor};font-weight:600">${status}</td>
      </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>รายชื่อพนักงาน ${dateLabel}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600&display=swap');
        * { font-family: 'Sarabun', sans-serif; font-size: 12px; }
        body { padding: 24px; }
        h2 { font-size: 18px; text-align: center; margin-bottom: 4px; }
        .sub { font-size: 12px; color: #555; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #3d6b3d; color: white; padding: 8px 10px; text-align: left; }
        td { padding: 7px 10px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) td { background: #f9f9f9; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>
      <h2>รายชื่อพนักงาน</h2>
      <div class="sub">วันที่: ${dateLabel}${filterDept ? ` &nbsp;|&nbsp; แผนก: ${filterDept}` : ""} &nbsp;|&nbsp; ทั้งหมด ${filtered.length} คน</div>
      <table>
        <thead><tr>
          <th>รหัส</th><th>ชื่อ-นามสกุล</th><th>แผนก</th><th>ตำแหน่ง</th>
          <th>เวลาเข้า</th><th>เวลาออก</th><th>สถานะ</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 800);
  }

  function formatDateLabel(dateStr) {
    if (dateStr === today) return "วันนี้";
    const d = new Date(dateStr);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === getLocalDateStr(yesterday)) return "เมื่อวาน";
    return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`;
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      await onUpdateEmp(editModal.id, editModal.dept, editModal.pos);
      setEditModal(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="emp-page">
      {/* ── Header ── */}
      <div className="emp-header-row">
        <h2 className="emp-title">รายชื่อพนักงาน</h2>
        <div className="emp-header-actions">
          <input
            type="date"
            className="emp-date-picker"
            value={selectedDate}
            max={today}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
          />
          <button className="export-pdf-btn" onClick={handleExportPDF}>
            ↓ Export PDF
          </button>
        </div>
      </div>

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
            setSelectedDate(getLocalDateStr());
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
              <th>สถานะ {formatDateLabel(selectedDate)}</th>
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
                const recIn = dayRecords.find(
                  (r) => r.empId === e.id && r.type === "in",
                );
                const recOut = dayRecords.find(
                  (r) => r.empId === e.id && r.type === "out",
                );
                return (
                  <tr key={e.id}>
                    <td className="emp-id">{e.id}</td>
                    <td className="emp-name">{e.name}</td>
                    <td className="emp-dept">{e.dept || "—"}</td>
                    <td className="emp-pos">{e.pos || "—"}</td>
                    <td>
                      {recIn ? (
                        <>
                          <span className="entry entry-in">
                            <span className="entry-dot" />
                            เข้า {recIn.time}
                          </span>
                          {recOut && (
                            <span
                              className="entry entry-out"
                              style={{ marginLeft: 6 }}
                            >
                              <span className="entry-dot" />
                              ออก {recOut.time}
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
                    <td style={{ whiteSpace: "nowrap" }}>
                      {isAdmin && (
                        <button
                          className="edit-btn"
                          style={{
                            marginRight: 6,
                            background: "var(--primary, #3d6b3d)",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            padding: "4px 10px",
                            cursor: "pointer",
                            fontSize: 13,
                          }}
                          onClick={() =>
                            setEditModal({
                              id: e.id,
                              name: e.name,
                              dept: e.dept || "",
                              pos: e.pos || "",
                            })
                          }
                          title="แก้ไข"
                        >
                          ✏️ แก้ไข
                        </button>
                      )}
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

      {/* ── Edit Modal ── */}
      {editModal && (
        <div
          className="adm-modal-overlay"
          onClick={() => !saving && setEditModal(null)}
        >
          <div
            className="adm-modal"
            onClick={(ev) => ev.stopPropagation()}
            style={{ maxWidth: 400 }}
          >
            <div className="adm-modal-header">
              <h3>แก้ไขข้อมูล</h3>
              <button
                className="adm-modal-close"
                onClick={() => setEditModal(null)}
                disabled={saving}
              >
                ×
              </button>
            </div>
            <div
              style={{ padding: "8px 20px 4px", color: "#666", fontSize: 13 }}
            >
              {editModal.name} ({editModal.id})
            </div>
            <div
              style={{
                padding: "12px 20px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  fontSize: 14,
                }}
              >
                สังกัด
                <input
                  className="emp-search"
                  value={editModal.dept}
                  onChange={(ev) =>
                    setEditModal({ ...editModal, dept: ev.target.value })
                  }
                  disabled={saving}
                  style={{ marginTop: 2 }}
                />
              </label>
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  fontSize: 14,
                }}
              >
                ตำแหน่ง
                <input
                  className="emp-search"
                  value={editModal.pos}
                  onChange={(ev) =>
                    setEditModal({ ...editModal, pos: ev.target.value })
                  }
                  disabled={saving}
                  style={{ marginTop: 2 }}
                />
              </label>
              <div
                style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
              >
                <button
                  className="clear-btn"
                  onClick={() => setEditModal(null)}
                  disabled={saving}
                >
                  ยกเลิก
                </button>
                <button
                  className="export-pdf-btn"
                  onClick={handleSaveEdit}
                  disabled={saving}
                >
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
