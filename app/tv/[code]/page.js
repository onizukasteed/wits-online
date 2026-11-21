'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { post, usePoll } from '@/lib/client';
import * as snd from '@/lib/sound';
import { CFG } from '@/lib/config';
import { BetBoard, Scores, Log, Dot, PCOL, colorOf, fmt } from '@/components/ui';

const BG = { answer: 'clue', bet: 'guess', reveal: 'reveal', over: 'over' };

export default function TV({ params }) {
  const code = params.code.toUpperCase();
  const [host, setHost] = useState(null);
  const [qr, setQr] = useState('');
  const [msg, setMsg] = useState('');
  const [rounds, setRounds] = useState(CFG.defaultRounds);
  const [soundOn, setSoundOn] = useState(false);
  const lastFx = useRef(null);
  useEffect(() => {
    setHost(localStorage.getItem('ww-host-' + code) || '');
    QRCode.toDataURL(`${location.origin}/play/${code}`, { margin: 1, width: 360 }).then(setQr).catch(() => {});
    if (snd.soundPref()) { const go = () => { if (snd.enable({ music: true })) setSoundOn(true); window.removeEventListener('pointerdown', go); }; window.addEventListener('pointerdown', go); }
  }, [code]);
  const { data: v, error, refresh } = usePoll(host === null ? null : `/api/room/${code}?t=${host}`, 1200);
  const g = v && v.game;
  const lastId = g && g.fx.length ? g.fx[g.fx.length - 1].i : 0;
  useEffect(() => {
    if (!g) return;
    if (lastFx.current === null) { lastFx.current = lastId; return; }
    g.fx.filter((f) => f.i > lastFx.current).forEach((f, i) => { const rv = ['good', 'miss'].includes(f.k); setTimeout(() => { if (rv) snd.sfx('whoosh'); setTimeout(() => snd.sfx(f.k), rv ? 450 : 0); }, i * 300); });
    lastFx.current = lastId;
  }, [lastId]);
  useEffect(() => {
    snd.setMode(g && g.phase === 'bet' ? 1 : 0);
    document.body.dataset.phase = g ? BG[g.phase] : 'lobby';
    return () => { delete document.body.dataset.phase; };
  }, [g && g.phase]);

  async function act(a) { setMsg(''); try { await post(`/api/room/${code}/act`, { t: host, a }); refresh(); } catch (e) { setMsg(e.message); } }
  const mute = <button className="btn alt tvmute" onClick={() => { if (soundOn) { snd.disable(); setSoundOn(false); } else if (snd.enable({ music: true })) setSoundOn(true); }}>{soundOn ? '🔊 เสียงเปิด' : '🔇 เปิดเสียง'}</button>;

  if (error && !v) return <main className="home"><p className="error">{error === 'NO_REDIS' ? 'ยังไม่ได้เชื่อม Redis' : error}</p></main>;
  if (!v) return <main className="home"><p>กำลังโหลด…</p></main>;
  if (!v.host) return <main className="home"><p className="error">หน้านี้ใช้ได้เฉพาะเครื่องที่สร้างห้อง</p></main>;

  if (!g) {
    const n = v.lobby.length;
    return (
      <main className="lobby">
        <p className="sub">เข้าร่วมที่ หรือสแกน QR</p>
        <div className="big-code">{code}</div>
        {qr && <img src={qr} alt="QR" width="240" height="240" style={{ borderRadius: 12, background: '#fff' }} />}
        <div className="card-box">
          <h2>ผู้เล่น ({n}/10)</h2>
          {v.lobby.map((p, i) => <div key={p.id} className="pl"><span className="dot" style={{ background: PCOL[i % 10] }} /> {p.name}</div>)}
          {!n && <p className="sub">รอเพื่อน ๆ เข้าร่วม…</p>}
        </div>
        <div className="sub">จำนวนรอบ ({CFG.doubleLast} รอบสุดท้ายคะแนนคูณ 2)</div>
        <div className="row" style={{ justifyContent: 'center' }}>
          {CFG.roundsOptions.map((k) => <button key={k} className={'chip' + (rounds === k ? ' on' : '')} onClick={() => setRounds(k)}>{k} รอบ</button>)}
        </div>
        <button className="btn big" disabled={n < CFG.minPlayers} onClick={() => act({ type: 'start', turns: rounds })}>{n < CFG.minPlayers ? `ต้องมีอย่างน้อย ${CFG.minPlayers} คน` : 'เริ่มเกม'}</button>
        {msg && <p className="error">{msg}</p>}
        {mute}
      </main>
    );
  }
  const ph = g.phase;
  const done = ph === 'reveal' || ph === 'over';
  const winnerNames = g.winners.map((p) => g.names[p]).join(' และ ');
  return (
    <div className="tvg">
      <div className="main">
        <div className="panel" style={{ textAlign: 'center', marginBottom: 6, padding: '6px 10px' }}>
          <div className="turnbox">{ph === 'over' ? '🏆 จบเกม' : `รอบ ${g.round}/${g.totalRounds}`}{g.mult > 1 && ph !== 'over' ? <b style={{ color: '#ffd166' }}> · คะแนนคูณ {g.mult}!</b> : ''}</div>
        </div>
        {ph !== 'over' && <div className="qtext">{g.q.text}</div>}
        {ph !== 'over' && <div className="qunit">ตอบเป็นตัวเลข · หน่วย: {g.q.unit}</div>}
        {ph === 'answer' && (
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <div className="res" style={{ color: '#ffd166' }}>ทุกคนใส่คำตอบบนมือถือ</div>
            <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
              {g.order.map((p) => <span key={p} className="chip" style={{ borderColor: colorOf(g, p) }}>{g.names[p]} {g.answered.includes(p) ? '✅' : '⏳'}</span>)}
            </div>
          </div>
        )}
        {(ph === 'bet' || done) && ph !== 'over' && (
          <>
            {ph === 'reveal' && <div className="bigans">คำตอบจริง: {fmt(g.result.answer)} {g.q.unit}</div>}
            <BetBoard g={g} showBets={done} />
            {ph === 'bet' && <div className="res" style={{ color: '#ffd166', fontSize: 'clamp(1rem,2.8vh,1.5rem)' }}>วางเดิมพัน {CFG.chips} เหรียญบนมือถือ · ช่องที่ไกลจากกลางจ่ายสูงกว่า · รอ: {g.order.filter((p) => !g.betted.includes(p)).map((p) => g.names[p]).join(', ') || '—'}</div>}
          </>
        )}
        {ph === 'reveal' && (
          <div>
            <div className="row" style={{ justifyContent: 'center' }}>
              {g.order.map((p) => { const x = g.result.gains[p]; return <span key={p} className="chip" style={{ borderColor: colorOf(g, p) }}>{g.names[p]} +{x.bet + x.ans}{x.ans ? ` (ตอบใกล้สุด +${x.ans})` : ''}</span>; })}
            </div>
            <div style={{ textAlign: 'center', margin: 6 }}><button className="btn big" style={{ maxWidth: 360 }} onClick={() => act({ type: 'next' })}>{g.round >= g.totalRounds ? 'ดูผลสรุป ▶' : 'รอบต่อไป ▶'}</button></div>
          </div>
        )}
        {ph === 'over' && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <div className="res" style={{ fontSize: 'clamp(2rem,7vh,3.4rem)' }}>🏆 {winnerNames} ชนะ!</div>
            <button className="btn big" style={{ maxWidth: 360, margin: 14 }} onClick={() => act({ type: 'reset' })}>เล่นอีกรอบ (กลับล็อบบี้)</button>
          </div>
        )}
        <div className="row" style={{ justifyContent: 'center' }}>
          {(ph === 'answer' || ph === 'bet') && <button className="chip" onClick={() => act({ type: 'force' })}>⏭ ข้ามคนที่ยังไม่ส่ง</button>}
        </div>
        {msg && <p className="error" style={{ textAlign: 'center' }}>{msg}</p>}
      </div>
      <div className="side" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Scores g={g} />
        <div className="panel hand">คนที่ตอบใกล้เฉลยที่สุด “โดยไม่เกิน” ชนะ +{g.cfg.ansBonus}<br />เหรียญเดิมพันบนช่องที่ชนะ ได้แต้มตามตัวคูณ ×2–×5 (ช่อง “ต่ำกว่าทุกคำตอบ” ×6)</div>
        <Log g={g} />
      </div>
      {mute}
    </div>
  );
}
