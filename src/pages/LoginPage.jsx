import { useState } from "react";
import "./LoginPage.css";

// รหัส Admin พิเศษ
const ADMIN_IDS = ["ADMIN", "admin", "0000"];

export default function LoginPage({ employees, onLogin }) {
  const [empId, setEmpId] = useState("");
  const [err, setErr] = useState("");

  function handleLogin() {
    const id = empId.trim();
    if (!id) {
      setErr("กรุณากรอกรหัสพนักงาน");
      return;
    }

    // Admin login
    if (ADMIN_IDS.includes(id)) {
      onLogin({
        id: "__admin__",
        name: "ผู้ดูแลระบบ",
        dept: "",
        isAdmin: true,
      });
      return;
    }

    // พนักงานทั่วไป
    const emp = employees.find((e) => String(e.id) === String(id));
    if (!emp) {
      setErr("ไม่พบรหัสพนักงานนี้ในระบบ");
      return;
    }
    setErr("");
    onLogin(emp);
  }

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div className="login-leaf">🌿</div>
        <h1 className="login-title">บันทึกเวลาเข้า-ออกงาน</h1>
        <p className="login-sub">กรอกรหัสพนักงานเพื่อเข้าสู่ระบบ</p>

        <div className="login-field">
          <label>รหัสพนักงาน</label>
          <input
            type="text"
            placeholder="เช่น 123,456"
            value={empId}
            onChange={(e) => {
              setEmpId(e.target.value);
              setErr("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            autoFocus
          />
        </div>

        {err && <div className="login-err">❌ {err}</div>}
        
const SSO_URL =
  "https://sso.kmutnb.ac.th/auth/authorize?" +
  new URLSearchParams({
    response_type: "code",
    client_id: "Bdtnb6ZVThzxLc3nuqybHmBI9KQFCAw0",
    redirect_uri: "https://attendance-react-3n3s.vercel.app/callback",
    scope: "openid profile email",
  });

function handleSSOLogin() {
  window.location.href = SSO_URL;
}
        <button className="login-btn" onClick={handleLogin}>
          เข้าสู่ระบบ
        </button>
      </div>
    </div>
  );
}
