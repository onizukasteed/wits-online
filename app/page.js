'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/client';

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [needPass, setNeedPass] = useState(false);
  const [pass, setPass] = useState('');
  const fixErr = (m) => {
    if (m === 'NEED_PASS') { setNeedPass(true); return 'ใส่รหัสผ่านครอบครัวก่อนสร้างห้อง'; }
    if (m === 'WRONG_PASS') { setNeedPass(true); try { localStorage.removeItem('family-pass'); } catch {} return 'รหัสผ่านไม่ถูกต้อง'; }
    return m;
  };
  async function createReq() {
    let p = pass;
    if (!p) { try { p = localStorage.getItem('family-pass') || ''; } catch {} }
    const r = await post('/api/room', { pass: p });
    if (p) { try { localStorage.setItem('family-pass', p); } catch {} }
    return r;
  }
  async function create() {
    setBusy(true); setErr('');
    try { const r = await createReq(); localStorage.setItem('ww-host-' + r.code, r.hostToken); router.push('/tv/' + r.code); }
    catch (e) { setErr(fixErr(e.message)); setBusy(false); }
  }
  function joinRoom(e) { e.preventDefault(); const c = code.trim().toUpperCase(); if (c.length === 4) router.push('/play/' + c); }
  return (
    <main className="home">
      <h1 className="title">WITS &amp; WAGERS<br />ตอบ-เดิมพัน-รวย</h1>
      <p className="sub">ทุกคนเดาตัวเลข แล้วเดิมพันว่าคำตอบของใครใกล้สุด · เล่นผ่านมือถือ ขึ้นจอทีวี</p>
      <div className="card-box">
        <h2>เป็นเจ้าของห้อง</h2>
        <p>เปิดหน้านี้บนทีวีหรือคอมพิวเตอร์ แล้วกดสร้างห้อง เพื่อน ๆ สแกน QR เข้าร่วม (3-10 คน)</p>
        {needPass && <input className="input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="รหัสผ่านครอบครัว" autoComplete="off" />}
        <button className="btn big" onClick={create} disabled={busy}>{busy ? 'กำลังสร้างห้อง…' : 'สร้างห้องใหม่ (จอทีวี)'}</button>
        {err && <p className="error">{err === 'NO_REDIS' ? 'ยังไม่ได้เชื่อม Redis กับโปรเจกต์นี้' : err}</p>}
      </div>
      <form className="card-box" onSubmit={joinRoom}>
        <h2>เข้าร่วมห้อง</h2>
        <input className="input code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))} placeholder="ABCD" autoComplete="off" autoCapitalize="characters" />
        <button className="btn big" disabled={code.length !== 4}>เข้าห้อง</button>
      </form>
    </main>
  );
}
