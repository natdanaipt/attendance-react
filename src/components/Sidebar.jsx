import './Sidebar.css';

export default function Sidebar({ employees, curEmpId, onEmpChange }) {
  return (
    <header className="header">
      <div className="header-brand">
        <span className="brand-leaf">🌿</span>
        <span className="brand-title">บันทึกเวลาเข้า-ออกงาน</span>
      </div>

      <div className="header-controls">
        <div className="emp-select-wrap">
          <label htmlFor="empSelect">พนักงาน</label>
          <select
            id="empSelect"
            className="emp-select"
            value={curEmpId}
            onChange={(e) => onEmpChange(e.target.value)}
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}  ({e.dept})
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
