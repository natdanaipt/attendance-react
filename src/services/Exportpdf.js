// src/services/exportPDF.js
// ใช้ HTML + window.print() — รองรับภาษาไทยสมบูรณ์ ไม่ต้องติดตั้ง library เพิ่ม

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
      const dayName = thDays[dateObj.getDay()];
      const label = `วัน${dayName} ${d} ${thMonths[parseInt(month) - 1]} ${buddhistYear}`;
      const data = byDate[dateStr] || {};
      rows.push({ label, inTime: data.in || "", outTime: data.out || "" });
    }
  } else {
    Object.keys(byDate)
      .sort()
      .forEach((dateStr) => {
        rows.push({
          label: dateStr,
          inTime: byDate[dateStr].in || "",
          outTime: byDate[dateStr].out || "",
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
      const isWeekend =
        r.label.includes("วันเสาร์") || r.label.includes("วันอาทิตย์");
      const isEmpty = !r.inTime && !r.outTime;
      const rowStyle = isWeekend || isEmpty ? 'style="color:#aaa;"' : "";
      return `
        <tr ${rowStyle}>
          <td style="text-align:left; padding: 5px 10px;">${r.label}</td>
          <td>${r.inTime}</td>
          <td>${r.outTime}</td>
        </tr>`;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8" />
      <title>รายงานการเข้าปฏิบัติงาน</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Sarabun', sans-serif;
          font-size: 13px;
          color: #111;
          padding: 30px 40px;
        }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
        .header p { font-size: 14px; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        thead tr { background-color: #f0f0f0; }
        th {
          border: 1px solid #ccc;
          padding: 7px 10px;
          text-align: center;
          font-weight: 600;
          font-size: 13px;
        }
        td {
          border: 1px solid #ddd;
          padding: 5px 10px;
          text-align: center;
          font-size: 13px;
        }
        tr:nth-child(even) { background-color: #fafafa; }
        @media print {
          body { padding: 15px 20px; }
          @page { size: A4 portrait; margin: 15mm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>รายงานการเข้าปฏิบัติงาน</h1>
        <p>${empLabel}</p>
        ${periodLabel ? `<p>${periodLabel}</p>` : ""}
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:55%; text-align:left; padding-left:10px;">วันที่</th>
            <th style="width:22.5%;">เวลาเข้างาน</th>
            <th style="width:22.5%;">เวลาเลิกงาน</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  printWindow.document.write(html);
  printWindow.document.close();

  // รอ font โหลดเสร็จแล้วค่อย print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 800);
  };
}
