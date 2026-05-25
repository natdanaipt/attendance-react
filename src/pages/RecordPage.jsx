import { useState, useEffect } from 'react';
import { getStatus } from '../services/api';
import './RecordPage.css';

export default function RecordPage({ employees, curEmpId, onAdd, showToast }) {
  const [mDate, setMDate] = useState(new Date().toISOString().slice(0, 10));
  const [mTime, setMTime] = useState('');
  const [mType, setMType] = useState('in');
  const [nowTime, setNowTime] = useState('');

  useEffect(() => {
    const tick = () => setNowTime(new Date().toTimeString().slice(0, 5));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const emp = employees.find((e) => e.id === curEmpId);

  function quickRecord(type) {
    const date = new Date().toISOString().slice(0, 10);
    const time = new Date().toTimeString().slice(0, 5);
    onAdd(curEmpId, date, time, type);
    const s = type === 'in' ? getStatus(time) : null;
    showToast('บันทึกสำเร็จ · ' + (type === 'in' ? `เข้างาน ${time} — ${s.label}` : `ออกงาน ${time}`));
  }

  function manualRecord() {
    if (!mTime) { showToast('กรุณากรอกเวลา', true); return; }
    onAdd(curEmpId, mDate, mTime, mType);
    showToast(`บันทึกสำเร็จ · ${mDate} ${mTime} (${mType === 'in' ? 'เข้างาน' : 'ออกงาน'})`);
    setMTime('');
  }

  return (
    <div className="record-page">
      <div className="record-emp-label">
        {emp?.name} <span>{emp?.dept}</span>
      </div>

      {/* Big buttons */}
      <div className="record-panel">
        <div className="record-panel-title">บันทึกเวลา (ใช้เวลาปัจจุบัน)</div>
        <div className="big-btns">
          <button className="big-btn big-btn-in" onClick={() => quickRecord('in')}>
            <span className="big-btn-icon">◎</span>
            <span>เข้างาน</span>
            <span className="big-btn-time">{nowTime}</span>
          </button>
          <button className="big-btn big-btn-out" onClick={() => quickRecord('out')}>
            <span className="big-btn-icon">◉</span>
            <span>ออกงาน</span>
            <span className="big-btn-time">{nowTime}</span>
          </button>
        </div>
      </div>

      {/* Manual form */}
      <div className="record-panel">
        <div className="record-panel-title">บันทึกย้อนหลัง / แก้ไขเวลา</div>
        <div className="manual-form-row">
          <div className="field-sm">
            <label>วันที่</label>
            <input
              type="date"
              value={mDate}
              onChange={(e) => setMDate(e.target.value)}
            />
          </div>
          <div className="field-sm">
            <label>เวลา *</label>
            <input
              type="time"
              value={mTime}
              onChange={(e) => setMTime(e.target.value)}
            />
          </div>
          <div className="field-sm">
            <label>ประเภท</label>
            <select value={mType} onChange={(e) => setMType(e.target.value)}>
              <option value="in">เข้างาน</option>
              <option value="out">ออกงาน</option>
            </select>
          </div>
          <button className="save-btn" onClick={manualRecord}>
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
