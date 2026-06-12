import { useState, useEffect, useMemo } from "react";
import {
  MONTHS_TH,
  getStatus,
  countWorkDays,
  isHoliday,
} from "../services/api";
import "./AdminDashboard.css";

const API_URL = import.meta.env.VITE_API_URL;

export default function AdminDashboard({ employees }) {
  const now = new Date();
  function getLocalDateStr(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const today = getLocalDateStr();

  const [records, setRecords] = useState([]);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [filterDept, setFilterDept] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [modal, setModal] = useState(null);

  useEffect(() => {
    async function load() {
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
        console.error(err);
      }
    }
    load();
  }, []);

  const deptOptions = useMemo(
    () => [...new Set(employees.map((e) => e.dept).filter(Boolean))].sort(),
    [employees],
  );

  const filteredEmps = useMemo(
    () =>
      filterDept ? employees.filter((e) => e.dept === filterDept) : employees,
    [employees, filterDept],
  );

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const workDaysInMonth = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dow = new Date(ds).getDay();
      if (dow === 0 || dow === 6 || isHoliday(ds)) continue;
      if (new Date(ds) > now) break;
      result.push({ day: d, dateStr: ds });
    }
    return result;
  }, [year, month]);

  const selectedDateStr = filterDay
    ? `${year}-${String(month + 1).padStart(2, "0")}-${String(filterDay).padStart(2, "0")}`
    : today;

  const todayStats = useMemo(() => {
    const empIds = new Set(filteredEmps.map((e) => e.id));

    if (filterDay) {
      const todayIn = records.filter(
        (r) =>
          r.date === selectedDateStr && r.type === "in" && empIds.has(r.empId),
      );
      const came = new Set(todayIn.map((r) => r.empId)).size;
      const late = todayIn.filter(
        (r) => getStatus(r.time).kind === "late",
      ).length;
      const onTime = came - late;
      const total = filteredEmps.length;
      const absent = total - came;
      return { came, onTime, late, absent, total };
    } else {
      const todayIn = records.filter(
        (r) => r.date === today && r.type === "in" && empIds.has(r.empId),
      );
      const monthIn = records.filter(
        (r) =>
          r.date.startsWith(monthKey) && r.type === "in" && empIds.has(r.empId),
      );
      const came = new Set(todayIn.map((r) => r.empId)).size;
      const late = monthIn.filter(
        (r) => getStatus(r.time).kind === "late",
      ).length;
      const onTime = monthIn.length - late;
      const total = filteredEmps.length;
      const absent = total - came;
      return { came, onTime, late, absent, total };
    }
  }, [records, filteredEmps, today, filterDay, selectedDateStr, monthKey]);

  const monthStats = useMemo(() => {
    const empIds = new Set(filteredEmps.map((e) => e.id));
    const inRecs = records.filter(
      (r) =>
        r.date.startsWith(monthKey) && r.type === "in" && empIds.has(r.empId),
    );
    const workDays = countWorkDays(year, month);
    let totalCame = 0,
      totalLate = 0,
      totalOnTime = 0,
      totalAbsent = 0;
    filteredEmps.forEach((e) => {
      const myRecs = inRecs.filter((r) => r.empId === e.id);
      const days = [...new Set(myRecs.map((r) => r.date))].length;
      const late = myRecs.filter(
        (r) => getStatus(r.time).kind === "late",
      ).length;
      totalCame += days;
      totalLate += late;
      totalOnTime += days - late;
      totalAbsent += Math.max(0, workDays - days);
    });
    return { totalCame, totalLate, totalOnTime, totalAbsent, workDays };
  }, [records, filteredEmps, monthKey, year, month]);

  const dailyData = useMemo(() => {
    const empIds = new Set(filteredEmps.map((e) => e.id));
    return workDaysInMonth.map(({ day, dateStr }) => {
      const came = new Set(
        records
          .filter(
            (r) => r.date === dateStr && r.type === "in" && empIds.has(r.empId),
          )
          .map((r) => r.empId),
      ).size;
      return { date: day, dateStr, came, total: filteredEmps.length };
    });
  }, [records, filteredEmps, workDaysInMonth]);

  const topDepts = useMemo(() => {
    const empIds = new Set(filteredEmps.map((e) => e.id));
    const inRecs = records.filter(
      (r) =>
        r.date.startsWith(monthKey) && r.type === "in" && empIds.has(r.empId),
    );
    const workDays = countWorkDays(year, month);
    const deptMap = {};
    filteredEmps.forEach((e) => {
      if (!e.dept) return;
      if (!deptMap[e.dept]) deptMap[e.dept] = { total: 0, came: 0 };
      deptMap[e.dept].total += workDays;
      const days = [
        ...new Set(inRecs.filter((r) => r.empId === e.id).map((r) => r.date)),
      ].length;
      deptMap[e.dept].came += days;
    });
    return Object.entries(deptMap)
      .map(([dept, v]) => ({
        dept,
        pct: v.total > 0 ? Math.round((v.came / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  }, [records, filteredEmps, monthKey, year, month]);

  const maxCame = Math.max(...dailyData.map((d) => d.came), 1);

  // ── เปิด modal รายชื่อตามหมวด ──
  function openModal(category) {
    const empIds = new Set(filteredEmps.map((e) => e.id));

    const todayIn = records.filter(
      (r) =>
        r.date === selectedDateStr && r.type === "in" && empIds.has(r.empId),
    );
    const cameIds = new Set(todayIn.map((r) => r.empId));

    // ข้อมูลตาม mode: รายวันที่เลือก หรือ ทั้งเดือน
    const periodRecs = filterDay
      ? records.filter(
          (r) =>
            r.date === selectedDateStr &&
            r.type === "in" &&
            empIds.has(r.empId),
        )
      : records.filter(
          (r) =>
            r.date.startsWith(monthKey) &&
            r.type === "in" &&
            empIds.has(r.empId),
        );

    const periodLabel = filterDay
      ? selectedDateStr
      : `${MONTHS_TH[month]} ${year + 543}`;

    let list = [];
    let title = "";
    let showDate = false;

    if (category === "came") {
      title = `มาวันนี้ — ${selectedDateStr}`;
      list = todayIn.map((r) => {
        const emp = filteredEmps.find((e) => e.id === r.empId);
        return {
          id: r.empId,
          name: emp?.name || r.empId,
          dept: emp?.dept,
          time: r.time,
        };
      });
    } else if (category === "onTime") {
      title = `ตรงเวลา — ${periodLabel}`;
      showDate = !filterDay;
      list = periodRecs
        .filter((r) => getStatus(r.time).kind === "ok")
        .map((r) => {
          const emp = filteredEmps.find((e) => e.id === r.empId);
          return {
            id: r.empId,
            name: emp?.name || r.empId,
            dept: emp?.dept,
            time: r.time,
            date: r.date,
          };
        });
    } else if (category === "late") {
      title = `มาสาย — ${periodLabel}`;
      showDate = !filterDay;
      list = periodRecs
        .filter((r) => getStatus(r.time).kind === "late")
        .map((r) => {
          const emp = filteredEmps.find((e) => e.id === r.empId);
          return {
            id: r.empId,
            name: emp?.name || r.empId,
            dept: emp?.dept,
            time: r.time,
            date: r.date,
          };
        });
    } else if (category === "absent") {
      title = `ยังไม่มา — ${selectedDateStr}`;
      list = filteredEmps
        .filter((e) => !cameIds.has(e.id))
        .map((e) => ({ id: e.id, name: e.name, dept: e.dept, time: "-" }));
    }

    if (showDate) {
      list.sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.name || "").localeCompare(b.name || "", "th"),
      );
    } else {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "th"));
    }

    setModal({ title, list, showDate });
  }

  return (
    <div className="adm-dash">
      <div className="adm-header">
        <h2 className="adm-title">📊 Dashboard ภาพรวม</h2>
        <div className="adm-filters">
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
            value={month}
            onChange={(e) => {
              setMonth(Number(e.target.value));
              setFilterDay("");
            }}
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
            onChange={(e) => {
              setYear(Number(e.target.value));
              setFilterDay("");
            }}
          >
            {Array.from({ length: 3 }, (_, i) => now.getFullYear() - i).map(
              (y) => (
                <option key={y} value={y}>
                  {y + 543}
                </option>
              ),
            )}
          </select>
          <select
            className="export-select"
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
          >
            <option value="">ภาพรวมทั้งเดือน</option>
            {workDaysInMonth.map(({ day, dateStr }) => (
              <option key={dateStr} value={day}>
                วันที่ {day} {MONTHS_TH[month]} {year + 543}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="adm-section-title">
        {filterDay
          ? `วันที่ ${filterDay} ${MONTHS_TH[month]} ${year + 543}`
          : `วันนี้ — ${today}`}
      </div>

      <div className="adm-cards">
        <div
          className="adm-card adm-card-blue adm-card-clickable"
          onClick={() => openModal("came")}
        >
          <div className="adm-card-num">{todayStats.came}</div>
          <div className="adm-card-label">มาวันนี้</div>
          <div className="adm-card-sub">จาก {todayStats.total} คน</div>
        </div>
        <div
          className="adm-card adm-card-green adm-card-clickable"
          onClick={() => openModal("onTime")}
        >
          <div className="adm-card-num">{todayStats.onTime}</div>
          <div className="adm-card-label">
            {filterDay ? "ตรงเวลา" : "ครั้งที่ตรงเวลา"}
          </div>
          {!filterDay && <div className="adm-card-sub">รวมทั้งเดือน</div>}
        </div>
        <div
          className="adm-card adm-card-gold adm-card-clickable"
          onClick={() => openModal("late")}
        >
          <div className="adm-card-num">{todayStats.late}</div>
          <div className="adm-card-label">
            {filterDay ? "มาสาย" : "ครั้งที่สาย"}
          </div>
          {!filterDay && <div className="adm-card-sub">รวมทั้งเดือน</div>}
        </div>
        <div
          className="adm-card adm-card-red adm-card-clickable"
          onClick={() => openModal("absent")}
        >
          <div className="adm-card-num">{todayStats.absent}</div>
          <div className="adm-card-label">ยังไม่มา</div>
        </div>
      </div>

      <div className="adm-row">
        <div className="adm-panel adm-chart-panel">
          <div className="adm-panel-title">
            จำนวนคนมาทำงานรายวัน — {MONTHS_TH[month]} {year + 543}
          </div>
          <div className="adm-chart">
            {dailyData.map((d, i) => (
              <div
                key={i}
                className={`adm-bar-wrap${filterDay && String(d.date) === String(filterDay) ? " adm-bar-wrap--active" : ""}`}
                onClick={() =>
                  setFilterDay(
                    filterDay === String(d.date) ? "" : String(d.date),
                  )
                }
                title={`วันที่ ${d.date}: ${d.came} คน`}
              >
                <div className="adm-bar-val">{d.came}</div>
                <div
                  className="adm-bar"
                  style={{
                    height: `${Math.round((d.came / maxCame) * 180)}px`,
                  }}
                />
                <div className="adm-bar-label">{d.date}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-panel adm-top-panel">
          <div className="adm-panel-title">Top แผนกที่มาครบที่สุด</div>
          {topDepts.map((d, i) => (
            <div key={d.dept} className="adm-top-row">
              <span className="adm-top-rank">#{i + 1}</span>
              <div className="adm-top-info">
                <div className="adm-top-name">{d.dept}</div>
                <div className="adm-top-bar-wrap">
                  <div className="adm-top-bar" style={{ width: `${d.pct}%` }} />
                </div>
              </div>
              <span className="adm-top-pct">{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal รายชื่อ ── */}
      {modal && (
        <div className="adm-modal-overlay" onClick={() => setModal(null)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3>{modal.title}</h3>
              <button
                className="adm-modal-close"
                onClick={() => setModal(null)}
              >
                ×
              </button>
            </div>
            <div className="adm-modal-count">{modal.list.length} รายการ</div>
            <div className="adm-modal-list">
              {modal.list.length === 0 ? (
                <div className="adm-modal-empty">ไม่มีรายชื่อ</div>
              ) : (
                modal.list.map((p, idx) => (
                  <div key={`${p.id}-${idx}`} className="adm-modal-row">
                    <div className="adm-modal-name">
                      {p.name} <span className="adm-modal-id">({p.id})</span>
                    </div>
                    <div className="adm-modal-dept">{p.dept || "-"}</div>
                    {modal.showDate && (
                      <div className="adm-modal-date">{p.date}</div>
                    )}
                    <div className="adm-modal-time">{p.time}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
