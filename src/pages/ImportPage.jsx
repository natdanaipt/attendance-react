import { useState, useRef } from "react";
import "./ImportPage.css";

export default function ImportPage({ employees, onImport }) {
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  function processFile(file) {
    if (!file || !file.name.endsWith(".csv")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split("\n").filter((l) => l.trim());
      let added = 0,
        skipped = 0;
      const newRows = [];

      for (let i = 0; i < lines.length; i++) {
        const cols = lines[i]
          .split(",")
          .map((c) => c.trim().replace(/^"|"$/g, ""));

        // ข้าม header row
        if (
          cols[0].toUpperCase() === "USERID" ||
          cols[0].toUpperCase() === "รหัส"
        )
          continue;
        if (cols.length < 3) continue;

        try {
          const empId = cols[0];
          const date = cols[1]; // 2026-05-22
          const checkIn = cols[2]; // 08:05
          const checkOut = cols[3] || ""; // 16:10 หรือ ''

          // ตรวจว่า date format ถูกต้อง
          if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            skipped++;
            continue;
          }

          const emp = employees.find((em) => em.id === empId);
          const name = emp?.name || empId;
          const dept = emp?.dept || "-";

          // บันทึก เข้างาน
          if (checkIn) {
            newRows.push({
              id: Date.now() + i * 2,
              empId,
              name,
              dept,
              date,
              time: checkIn,
              type: "in",
            });
            added++;
          }

          // บันทึก ออกงาน (ถ้ามี และไม่เท่ากับเวลาเข้า)
          if (checkOut && checkOut !== checkIn) {
            newRows.push({
              id: Date.now() + i * 2 + 1,
              empId,
              name,
              dept,
              date,
              time: checkOut,
              type: "out",
            });
            added++;
          }
        } catch {
          skipped++;
        }
      }

      onImport(newRows);
      setResult({
        added,
        skipped,
        people: new Set(newRows.map((r) => r.empId)).size,
      });
    };
    reader.readAsText(file, "UTF-8");
  }

  return (
    <div className="import-page">
      <h2 className="import-title">นำเข้าข้อมูล ZKTime</h2>

      <div className="import-panel">
        <div
          className={`drop-zone${dragging ? " dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            processFile(e.dataTransfer.files[0]);
          }}
          onClick={() => inputRef.current?.click()}
        >
          <div className="drop-icon">📂</div>
          <div className="drop-main">ลากไฟล์มาวางที่นี่</div>
          <div className="drop-sub">
            รองรับ .csv ที่ export จาก script Python
          </div>
          <span className="upload-btn">เลือกไฟล์ CSV</span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={(e) => processFile(e.target.files[0])}
          />
        </div>

        <div className="import-hint">
          <strong>รูปแบบ CSV ที่รองรับ</strong>
          <br />
          <code>USERID, DATE, CHECK_IN, CHECK_OUT</code>
          <br />
          <code>553, 2026-05-11, 07:24, 16:24</code>
        </div>

        {result && (
          <div className="import-result">
            ✅ นำเข้าสำเร็จ <strong>{result.added}</strong> รายการ &nbsp;·&nbsp;{" "}
            <strong>{result.people}</strong> คน
            {result.skipped > 0 && ` · ข้ามไป ${result.skipped} แถว`}
          </div>
        )}
      </div>
    </div>
  );
}
