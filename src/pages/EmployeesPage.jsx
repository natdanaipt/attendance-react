import { useState } from 'react';
import './EmployeesPage.css';

export default function EmployeesPage({ employees, records, onAddEmp, onDeleteEmp }) {
  const [eId,   setEId]   = useState('');
  const [eName, setEName] = useState('');
  const [eDept, setEDept] = useState('');
  const [ePos,  setEPos]  = useState('');
  const [err,   setErr]   = useState('');

  const today = new Date().toISOString().slice(0, 10);

  function handleAdd() {
    if (!eId.trim() || !eName.trim()) { setErr('กรุณากรอกรหัสและชื่อ'); return; }
    if (employees.find((e) => e.id === eId.trim())) { setErr('รหัสพนักงานซ้ำ'); return; }
    onAddEmp({ id: eId.trim(), name: eName.trim(), dept: eDept.trim(), pos: ePos.trim() });
    setEId(''); setEName(''); setEDept(''); setEPos(''); setErr('');
  }

  return (
    <div className="emp-page">
      <h2 className="emp-title">รายชื่อพนักงาน</h2>

      {/* Add form */}
      <div className="emp-form-panel">
        <div className="emp-form-title">เพิ่มพนักงานใหม่</div>
        {err && <div className="emp-err">{err}</div>}
        <div className="emp-form-row">
          <div className="field-sm"><label>รหัส</label><input value={eId}   onChange={e => setEId(e.target.value)}   placeholder="EMP007" /></div>
          <div className="field-sm"><label>ชื่อ-นามสกุล</label><input value={eName} onChange={e => setEName(e.target.value)} placeholder="ชื่อ นามสกุล" style={{width:180}} /></div>
          <div className="field-sm"><label>แผนก</label><input value={eDept} onChange={e => setEDept(e.target.value)} placeholder="แผนก" /></div>
          <div className="field-sm"><label>ตำแหน่ง</label><input value={ePos}  onChange={e => setEPos(e.target.value)}  placeholder="ตำแหน่ง" /></div>
          <button className="save-btn" onClick={handleAdd}>+ เพิ่ม</button>
        </div>
      </div>

      {/* Table */}
      <div className="emp-table-wrap">
        <table className="emp-table">
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อ-นามสกุล</th>
              <th>แผนก</th>
              <th>ตำแหน่ง</th>
              <th>สถานะวันนี้</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-msg"><div className="empty-icon">🌱</div>ยังไม่มีพนักงาน</div></td></tr>
            ) : employees.map((e) => {
              const todayIn  = records.find((r) => r.empId === e.id && r.date === today && r.type === 'in');
              const todayOut = records.find((r) => r.empId === e.id && r.date === today && r.type === 'out');
              return (
                <tr key={e.id}>
                  <td className="emp-id">{e.id}</td>
                  <td className="emp-name">{e.name}</td>
                  <td className="emp-dept">{e.dept || '—'}</td>
                  <td className="emp-pos">{e.pos  || '—'}</td>
                  <td>
                    {todayIn ? (
                      <>
                        <span className="entry entry-in"><span className="entry-dot"/>เข้า {todayIn.time}</span>
                        {todayOut && <span className="entry entry-out" style={{marginLeft:6}}><span className="entry-dot"/>ออก {todayOut.time}</span>}
                      </>
                    ) : (
                      <span className="entry" style={{background:'var(--paper)',color:'var(--text-light)',borderColor:'var(--border-light)'}}>
                        <span className="entry-dot" style={{background:'var(--border)'}}/>ยังไม่เข้า
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className="del-btn"
                      onClick={() => { if (window.confirm('ลบพนักงานคนนี้?')) onDeleteEmp(e.id); }}
                      title="ลบ"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
