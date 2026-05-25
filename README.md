# ระบบบันทึกเวลาเข้า-ออกงาน

React + Vite · ดีไซน์ botanical สไตล์ปฏิทิน

## โครงสร้างไฟล์

```
attendance-app/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx                  ← entry point
    ├── App.jsx                   ← root component + routing + state
    ├── App.css                   ← nav tabs style
    ├── components/
    │   ├── Sidebar.jsx           ← header + employee selector
    │   └── Sidebar.css
    ├── pages/
    │   ├── Dashboard.jsx         ← ปฏิทินรายเดือน + summary
    │   ├── Dashboard.css
    │   ├── RecordPage.jsx        ← บันทึกเวลา (quick + manual)
    │   ├── RecordPage.css
    │   ├── HistoryPage.jsx       ← ประวัติของคนที่เลือก
    │   ├── HistoryPage.css
    │   ├── ReportPage.jsx        ← รายงานสรุปรายเดือน
    │   ├── ReportPage.css
    │   ├── EmployeesPage.jsx     ← จัดการพนักงาน
    │   ├── EmployeesPage.css
    │   ├── ImportPage.jsx        ← นำเข้า CSV จาก ZKTime
    │   └── ImportPage.css
    ├── services/
    │   └── api.js                ← localStorage CRUD + utilities
    └── styles/
        └── theme.css             ← CSS variables + shared styles
```

## ติดตั้งและรัน

```bash
npm install
npm run dev
```

เปิดที่ http://localhost:5173

## Build

```bash
npm run build
npm run preview
```

## ฟีเจอร์

| หน้า | รายละเอียด |
|------|-----------|
| 📅 ปฏิทิน | ปฏิทินรายเดือน แสดงเวลาเข้า-ออกในแต่ละช่องวัน |
| ⏱ บันทึกเวลา | กดปุ่มเข้า/ออกงาน (เวลาปัจจุบัน) หรือกรอกย้อนหลัง |
| 📋 ประวัติ | ดูและลบรายการของพนักงานที่เลือก + Export CSV |
| 📈 รายงาน | สรุปรายเดือนแยกรายบุคคล (วันที่มา / ตรงเวลา / สาย) |
| 👥 พนักงาน | เพิ่ม/ลบพนักงาน + ดูสถานะวันนี้ |
| ⬆ นำเข้า | Drag & drop ไฟล์ CSV จาก ZKTime 5.0 |

## ข้อมูล

บันทึกใน **localStorage** ของเบราว์เซอร์
แต่ละพนักงานมีข้อมูลแยกกัน — เปลี่ยนดูได้จาก dropdown บนขวา
