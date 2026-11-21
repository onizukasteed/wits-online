'use client';
import { useEffect, useRef, useState } from 'react';
import { post, usePoll } from '@/lib/client';
import * as snd from '@/lib/sound';
import { BetBoard, Scores, fmt } from '@/components/ui';

const BG = { answer: 'clue', bet: 'guess', reveal: 'reveal', over: 'over' };

export default function Play({ params }) {
  const code = params.code.toUpperCase();
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem('ww-me-' + code) || 'null'); if (s) setMe(s); } catch {} setReady(true); }, [code]);
  const { data: v, error, refresh } = usePoll(me ? `/api/room/${code}?t=${me.token}` : null, 1200);
  async function doJoin(e) {
    e.preventDefault(); setErr('');
    try { const r = await post(`/api/room/${code}/join`, { name }); const s = { pid: r.pid, token: r.token }; localStorage.setItem('ww-me-' + code, JSON.stringify(s)); setMe(s); }
    catch (x) { setErr(x.message); }
  }
  if (!ready) return null;
  if (!me) return (
    <main className="home"><h1 className="title">ห้อง {code}</h1>
      <form className="card-box" onSubmit={doJoin}><h2>ใส่ชื่อของคุณ</h2>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ" maxLength={14} autoFocus />
        <button className="btn big" disabled={!name.trim()}>เข้าร่วม</button>{err && <p className="error">{err}</p>}</form></main>
  );
  if (error && !v) { if (/ไม่ได้อยู่ในห้อง/.test(error)) { localStorage.removeItem('ww-me-' + code); setMe(null); } return <main className="home"><p className="error">{error}</p></main>; }
  if (!v) return <main className="home"><p>กำลังโหลด…</p></main>;
  if (!v.game) return (
    <main className="lobby"><h1 className="title">ห้อง {code}</h1><p className="sub">รอเจ้าของห้องกดเริ่มเกม…</p>
      <div className="card-box"><h2>ผู้เล่น</h2>{v.lobby.map((p) => <div key={p.id} className="pl">🧑 {p.name}{p.id === me.pid ? ' (คุณ)' : ''}</div>)}</div></main>
  );
  return <Game g={v.game} code={code} me={me} refresh={refresh} />;
}

function Game({ g, code, me, refresh }) {
  const [val, setVal] = useState('');
  const [chips, setChips] = useState([]);
  const [msg, setMsg] = useState('');
  const [sOn, setSOn] = useState(false);
  const lastFx = useRef(null);
  const ph = g.phase;
  const need = g.cfg.chips;
  useEffect(() => { if (snd.soundPref()) { const go = () => { if (snd.enable()) setSOn(true); window.removeEventListener('pointerdown', go); }; window.addEventListener('pointerdown', go); } }, []);
  useEffect(() => { document.body.dataset.phase = BG[ph]; return () => { delete document.body.dataset.phase; }; }, [ph]);
  const lastId = g.fx && g.fx.length ? g.fx[g.fx.length - 1].i : 0;
  useEffect(() => {
    if (lastFx.current === null) { lastFx.current = lastId; return; }
    g.fx.filter((f) => f.i > lastFx.current && ['good', 'miss', 'win', 'turn', 'clue'].includes(f.k)).forEach((f, i) => setTimeout(() => snd.sfx(f.k), i * 250));
    lastFx.current = lastId;
  }, [lastId]);
  useEffect(() => { setVal(''); setChips([]); setMsg(''); }, [g.round]);
  useEffect(() => { if (ph === 'bet') setChips(g.mine.bet || []); }, [ph]);

  async function act(a) { setMsg(''); try { await post(`/api/room/${code}/act`, { t: me.token, a }); refresh(); } catch (e) { setMsg(e.message); } }
  const answered = g.mine.answer !== undefined;
  const betted = !!g.mine.bet;
  const add = (i) => { if (betted || chips.length >= need) return; snd.sfx('tick'); setChips([...chips, i]); };
  const removeLast = () => setChips(chips.slice(0, -1));
  const gain = g.result ? g.result.gains[me.pid] : null;

  let panel = null;
  if (ph === 'over') {
    const rank = g.order.slice().sort((a, b) => g.score[b] - g.score[a]);
    panel = <div className="res">{g.winners.includes(me.pid) ? '🏆 คุณชนะ!' : `${g.winners.map((p) => g.names[p]).join(' และ ')} ชนะ`}<div className="hand" style={{ fontSize: '1rem' }}>{rank.map((p, i) => `${i + 1}. ${g.names[p]} ${g.score[p]}`).join(' · ')}</div></div>;
  } else if (ph === 'answer') {
    panel = (
      <div>
        <input className="numin" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder={answered ? `คำตอบของคุณ: ${fmt(g.mine.answer)}` : 'พิมพ์ตัวเลขคำตอบ'} />
        <div className="hand">หน่วย: {g.q.unit} · เดาให้ใกล้ที่สุดแต่ “ไม่เกินเฉลย” จะได้โบนัส</div>
        <button className="btn big" disabled={!val.trim()} onClick={() => { act({ type: 'answer', v: val }); setVal(''); }}>{answered ? 'แก้คำตอบ' : 'ส่งคำตอบ'}</button>
        {answered && <div className="hand" style={{ marginTop: 6 }}>ส่งแล้ว ✅ รออีก {g.order.length - g.answered.length} คน (แก้ไขได้จนกว่าทุกคนจะส่ง)</div>}
      </div>
    );
  } else if (ph === 'bet') {
    panel = betted ? (
      <div><b>เดิมพันแล้ว ✅</b> <span className="hand">รออีก {g.order.length - g.betted.length} คน</span></div>
    ) : (
      <div>
        <div className="hand">แตะช่องเพื่อวางเหรียญ ({chips.length}/{need}) · วางซ้ำช่องเดียวกันได้ · เลือกช่องที่คิดว่า “ใกล้เฉลยที่สุดโดยไม่เกิน”</div>
        <div className="row"><button className="chip" onClick={removeLast} disabled={!chips.length}>↩ เอาเหรียญล่าสุดออก</button></div>
        <button className="btn big" disabled={chips.length !== need} onClick={() => act({ type: 'bet', cols: chips })}>ยืนยันเดิมพัน</button>
      </div>
    );
  } else if (ph === 'reveal') {
    panel = (
      <div>
        <div className="bigans" style={{ fontSize: '1.6rem' }}>คำตอบจริง: {fmt(g.result.answer)} {g.q.unit}</div>
        <div className="res" style={{ fontSize: '1.4rem', color: gain.bet + gain.ans ? '#5ee08a' : '#f87171' }}>คุณได้ +{gain.bet + gain.ans}{gain.ans ? ` (รวมตอบใกล้สุด +${gain.ans})` : ''}</div>
        {me.pid === g.order[0] && <button className="btn big" onClick={() => act({ type: 'next' })}>{g.round >= g.totalRounds ? 'ดูผลสรุป ▶' : 'รอบต่อไป ▶'}</button>}
      </div>
    );
  }
  const showBoard = ph === 'bet' || ph === 'reveal';
  return (
    <div className="ph">
      <div className="bar">
        <div className="turnbox">{ph === 'over' ? 'จบเกม' : `รอบ ${g.round}/${g.totalRounds}`}{g.mult > 1 && ph !== 'over' ? ' · คูณ 2' : ''}</div>
        {msg && <div className="error">{msg}</div>}
        <button className="chip" style={{ position: 'absolute', right: 6, top: 6 }} onClick={() => { if (sOn) { snd.disable(); setSOn(false); } else if (snd.enable()) setSOn(true); }}>{sOn ? '🔊' : '🔇'}</button>
      </div>
      {ph !== 'over' && <div className="qtext" style={{ fontSize: '1.25rem' }}>{g.q.text}</div>}
      {showBoard && <BetBoard g={g} compact onPick={ph === 'bet' && !betted ? add : undefined} chips={ph === 'bet' ? chips : []} showBets={ph === 'reveal'} />}
      <div className="panel" style={{ margin: '8px 0' }}>{panel}</div>
      <Scores g={g} />
    </div>
  );
}
