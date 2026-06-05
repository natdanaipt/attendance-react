import { useState, useMemo, useEffect } from "react";
import "./Dashboard.css";
import {
  MONTHS_TH,
  getStatus,
  countWorkDays,
  isHoliday,
  getHolidayName,
  fetchRecordsByEmp,
  exportPDF,
} from "../services/api";

export default function Dashboard({
  records,
  curEmpId,
  currentEmp,
  employees,
  isAdmin,
}) {
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // ── Admin: เลือกพนักงาน ──
  const [selectedEmpId, setSelectedEmpId] = useState(curEmpId);
  const [adminRecords, setAdminRecords] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const today = now.toISOString().slice(0, 10);
  const monthKey = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;

  // โหลด records เมื่อ Admin เปลี่ยนพนักงานที่เลือก
  useEffect(() => {
    if (!isAdmin) return;
    setLoadingRecs(true);
    fetchRecordsByEmp(selectedEmpId)
      .then(setAdminRecords)
      .finally(() => setLoadingRecs(false));
  }, [selectedEmpId, isAdmin]);

  // ถ้า Admin → ใช้ adminRecords, ถ้า User ปกติ → ใช้ records
  const activeRecords = isAdmin ? adminRecords : records;
  const activeEmp = isAdmin
    ? employees?.find((e) => e.id === selectedEmpId) || currentEmp
    : currentEmp;

  const myRecs = useMemo(
    () =>
      activeRecords.filter(
        (r) => r.empId === selectedEmpId && r.date.startsWith(monthKey),
      ),
    [activeRecords, selectedEmpId, monthKey],
  );

  // ── Summary ──
  const summary = useMemo(() => {
    const inRecs = myRecs.filter((r) => r.type === "in");
    const days = [...new Set(inRecs.map((r) => r.date))].length;
    const late = inRecs.filter((r) => getStatus(r.time).kind === "late").length;
    const workDays = countWorkDays(calYear, calMonth);
    return { days, late, absent: Math.max(0, workDays - days) };
  }, [myRecs, calYear, calMonth]);

  // ── Calendar cells ──
  const cells = useMemo(() => {
    const first = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
    const result = [];
    for (let i = 0; i < first.getDay(); i++) {
      const pd = new Date(calYear, calMonth, -(first.getDay() - i - 1));
      result.push({ day: pd.getDate(), cur: false });
    }
    for (let d = 1; d <= lastDay; d++) result.push({ day: d, cur: true });
    const tail = (7 - (result.length % 7)) % 7;
    for (let i = 1; i <= tail; i++) result.push({ day: i, cur: false });
    return result;
  }, [calYear, calMonth]);

  function changeMonth(dir) {
    let m = calMonth + dir;
    let y = calYear;
    if (m > 11) {
      m = 0;
      y++;
    }
    if (m < 0) {
      m = 11;
      y--;
    }
    setCalMonth(m);
    setCalYear(y);
  }

  return (
    <div className="dash-page">
      {/* ── Admin: dropdown เลือกพนักงาน ── */}
      {isAdmin && (
        <div className="admin-emp-select">
          <label>👤 ดูข้อมูลของ:</label>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
          >
            {employees?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.id})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="dash-layout">
        {/* ── Card ซ้าย ── */}
        <div className="profile-side">
          <div className="profile-card">
            <div className="profile-card-header">รายละเอียดบุคลากร</div>
            <div className="profile-card-body">
              <div className="profile-row">
                <span className="profile-label">ชื่อ-สกุล</span>
                <span className="profile-value">
                  {activeEmp?.name} ({activeEmp?.id})
                </span>
              </div>
              <div className="profile-row">
                <span className="profile-label">สังกัด</span>
                <span className="profile-value">{activeEmp?.dept || "-"}</span>
              </div>
              <div className="profile-row">
                <span className="profile-label">ตำแหน่ง</span>
                <span className="profile-value">{activeEmp?.pos || "-"}</span>
              </div>
              <div className="profile-row">
                <span className="profile-label">เพศ</span>
                <span className="profile-value">
                  {activeEmp?.gender || "-"}
                </span>
              </div>
            </div>
          </div>

          {/* ── ปุ่ม Export PDF (Admin เท่านั้น) ── */}
          {isAdmin && (
            <button
              className="export-pdf-btn"
              onClick={() =>
                exportPDF(activeRecords, activeEmp, calYear, calMonth)
              }
            >
              ⬇ Export PDF
            </button>
          )}
        </div>

        {/* ── ปฏิทินขวา ── */}
        {loadingRecs ? (
          <div style={{ padding: "4rem", color: "#8a9b89", fontSize: 14 }}>
            ⏳ กำลังโหลดข้อมูล...
          </div>
        ) : (
          <div className="cal-side">
            <div className="month-nav">
              <button className="month-btn" onClick={() => changeMonth(-1)}>
                &#8592;
              </button>
              <h2 className="month-title">
                {MONTHS_TH[calMonth]} {calYear + 543}
              </h2>
              <button className="month-btn" onClick={() => changeMonth(1)}>
                &#8594;
              </button>
            </div>

            <div className="cal-wrap">
              <div className="cal-head-row">
                {["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."].map((d, i) => (
                  <div
                    key={d}
                    className={`cal-head-cell${i === 0 || i === 6 ? " weekend-head" : ""}`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="cal-grid">
                {cells.map((c, idx) => {
                  const dow = idx % 7;
                  const isWeekend = dow === 0 || dow === 6;
                  const ds = c.cur
                    ? `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`
                    : null;
                  const isToday = ds === today;
                  const dayRecs = ds ? myRecs.filter((r) => r.date === ds) : [];
                  const inRec = dayRecs.find((r) => r.type === "in");
                  const outRec = dayRecs.find((r) => r.type === "out");
                  const isHolidayDay = ds ? isHoliday(ds) : false;
                  const holidayName = ds ? getHolidayName(ds) : null;

                  return (
                    <div
                      key={idx}
                      className={[
                        "cal-cell",
                        !c.cur ? "other-month" : "",
                        isToday ? "today" : "",
                        isWeekend && c.cur ? "weekend" : "",
                        isHolidayDay ? "holiday" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="cal-day">{c.day}</span>
                      {isHolidayDay && c.cur && (
                        <div className="holiday-label">🎌 {holidayName}</div>
                      )}
                      {!isWeekend && !isHolidayDay && inRec && (
                        <div className="entry cal-entry entry-in">
                          <span className="entry-dot" />
                          เข้า {inRec.time}
                        </div>
                      )}
                      {!isWeekend && !isHolidayDay && outRec && (
                        <div className="entry cal-entry entry-out">
                          <span className="entry-dot" />
                          ออก {outRec.time}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
