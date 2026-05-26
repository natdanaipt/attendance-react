// src/services/exportPDF.js

export const HOLIDAYS_2569 = {
  "2026-01-01": "วันขึ้นปีใหม่",
  "2026-01-02": "วันหยุดพิเศษ",
  "2026-03-03": "วันมาฆบูชา",
  "2026-04-06": "วันจักรี",
  "2026-04-13": "วันสงกรานต์",
  "2026-04-14": "วันสงกรานต์",
  "2026-04-15": "วันสงกรานต์",
  "2026-05-04": "วันฉัตรมงคล",
  "2026-05-13": "วันพืชมงคล",
  "2026-06-01": "ชดเชยวันวิสาขบูชา",
  "2026-06-03": "วันเฉลิมพระชนมพรรษา ร.10",
  "2026-07-28": "วันเฉลิมพระชนมพรรษา ร.10",
  "2026-07-29": "วันอาสาฬหบูชา",
  "2026-07-30": "วันเข้าพรรษา",
  "2026-08-12": "วันแม่แห่งชาติ",
  "2026-10-13": "วันนวมินทรมหาราช",
  "2026-10-23": "วันปิยมหาราช",
  "2026-12-07": "ชดเชยวันพ่อแห่งชาติ",
  "2026-12-10": "วันรัฐธรรมนูญ",
  "2026-12-31": "วันสิ้นปี",
};

function pairRecords(records, empId, year, month) {
  const filtered = records.filter((r) => {
    if (r.empId !== empId) return false;
    if (year && month) {
      const [y, m] = r.date.split("-");
      if (parseInt(y) !== parseInt(year) || parseInt(m) !== parseInt(month))
        return false;
    }
    return true;
  });

  const byDate = {};
  filtered.forEach((r) => {
    if (!byDate[r.date]) byDate[r.date] = { in: null, out: null };
    if (r.type === "in") byDate[r.date].in = r.time;
    else byDate[r.date].out = r.time;
  });

  const thDays = [
    "อาทิตย์",
    "จันทร์",
    "อังคาร",
    "พุธ",
    "พฤหัสบดี",
    "ศุกร์",
    "เสาร์",
  ];
  const thMonths = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  const rows = [];

  if (year && month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const buddhistYear = parseInt(year) + 543;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dateObj = new Date(dateStr);
      const dayIndex = dateObj.getDay();
      const dayName = thDays[dayIndex];
      const label = `วัน${dayName} ${d} ${thMonths[parseInt(month) - 1]} ${buddhistYear}`;
      const data = byDate[dateStr] || {};
      const isWeekend = dayIndex === 0 || dayIndex === 6;
      const holiday = HOLIDAYS_2569[dateStr] || null;

      // ถ้าเป็นวันเสาร์/อาทิตย์ หรือวันหยุดราชการ → ไม่แสดงเวลา
      const showTime = !isWeekend && !holiday;

      rows.push({
        dateStr,
        label,
        inTime: showTime ? data.in || "" : "",
        outTime: showTime ? data.out || "" : "",
        isWeekend,
        holiday,
      });
    }
  } else {
    Object.keys(byDate)
      .sort()
      .forEach((dateStr) => {
        const dateObj = new Date(dateStr);
        const dayIndex = dateObj.getDay();
        const isWeekend = dayIndex === 0 || dayIndex === 6;
        const holiday = HOLIDAYS_2569[dateStr] || null;
        const showTime = !isWeekend && !holiday;
        rows.push({
          dateStr,
          label: dateStr,
          inTime: showTime ? byDate[dateStr].in || "" : "",
          outTime: showTime ? byDate[dateStr].out || "" : "",
          isWeekend,
          holiday,
        });
      });
  }

  return rows;
}

export function exportPDF(records, emp, year, month) {
  const rows = pairRecords(records, emp?.id, year, month);

  const thMonthsFull = [
    "",
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

  const buddhistYear = year ? parseInt(year) + 543 : "";
  const periodLabel =
    year && month
      ? `ประจำเดือน ${thMonthsFull[parseInt(month)]} ${buddhistYear}`
      : "";
  const empLabel = emp ? `${emp.name}${emp.id ? ` (${emp.id})` : ""}` : "";

  const tableRows = rows
    .map((r) => {
      const isRed = r.isWeekend || r.holiday;
      const isAbsent = !r.isWeekend && !r.holiday && !r.inTime && !r.outTime;
      const rowColor = isRed || isAbsent ? "#cc0000" : "#111";

      // หมายเหตุ: วันหยุดราชการใส่ชื่อ, วันเสาร์/อาทิตย์ไม่ใส่อะไร
      const note = r.holiday ? r.holiday : "";

      return `<tr style="color:${rowColor}">
      <td style="text-align:left; padding:5px 10px;">${r.label}</td>
      <td>${r.inTime}</td>
      <td>${r.outTime}</td>
      <td style="text-align:center; padding:5px 10px; font-size:12px;">${note}</td>
    </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8"/>
  <title>รายงานการเข้าปฏิบัติงาน</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Sarabun',sans-serif; font-size:13px; color:#111; padding:30px 40px; }
    .header { text-align:center; margin-bottom:20px; }
    .header h1 { font-size:18px; font-weight:700; margin-bottom:4px; color:#111; }
    .header p { font-size:14px; color:#111; }
    table { width:100%; border-collapse:collapse; margin-top:10px; }
    thead tr { background-color:#f0f0f0; }
    th { border:1px solid #ccc; padding:7px 10px; text-align:center; font-weight:700; font-size:13px; color:#111; }
    td { border:1px solid #ddd; padding:5px 10px; text-align:center; font-weight:500; }
    tr:nth-child(even) { background-color:#fafafa; }
    @media print { body { padding:15px 20px; } @page { size:A4 portrait; margin:15mm; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>รายงานการเข้าปฏิบัติงาน</h1>
    <p>${empLabel}${periodLabel ? `  ${periodLabel}` : ""}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:40%;text-align:left;padding-left:10px;">วันที่</th>
        <th style="width:17%;">เวลาเข้างาน</th>
        <th style="width:17%;">เวลาเลิกงาน</th>
        <th style="width:26%;text-align:center;">หมายเหตุ</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 800);
  };
}
