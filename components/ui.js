'use client';
export const PCOL = ['#38bdf8', '#f472b6', '#facc15', '#34d399', '#c084fc', '#fb923c', '#f87171', '#a3e635', '#2dd4bf', '#e879f9'];
export const colorOf = (g, pid) => PCOL[g.order.indexOf(pid) % PCOL.length];
export const fmt = (n) => (n === null || n === undefined ? '' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 3 }));

export function Dot({ g, pid, size = 14 }) {
  return <span className="dot" style={{ background: colorOf(g, pid), width: size, height: size }} />;
}
export function Scores({ g }) {
  const rank = g.order.slice().sort((a, b) => g.score[b] - g.score[a]);
  return (
    <div className="panel">
      {rank.map((p) => (
        <div key={p} className="sc">
          <Dot g={g} pid={p} />
          <b style={{ flex: 1 }}>{g.names[p]}{g.phase === 'answer' ? (g.answered.includes(p) ? ' ✅' : ' ⏳') : g.phase === 'bet' ? (g.betted.includes(p) ? ' ✅' : ' ⏳') : ''}</b>
          <b style={{ fontSize: '1.3rem' }}>{g.score[p]}</b>
        </div>
      ))}
    </div>
  );
}
export function Log({ g }) {
  return <div className="panel log">{g.log.slice().reverse().map((l) => <div key={l.i} className={l.k}>{l.m}</div>)}</div>;
}
// กระดานเดิมพัน: คอลัมน์เรียงจากน้อยไปมาก ช่องแรกคือ "ต่ำกว่าทุกคำตอบ"
export function BetBoard({ g, onPick, chips = [], showBets, compact }) {
  const win = g.result ? g.result.win : -1;
  const count = (i) => chips.filter((c) => c === i).length;
  return (
    <div className={'wwcols' + (compact ? ' compact' : '')}>
      {g.cols.map((c, i) => {
        const on = count(i) > 0;
        const owners = c.pids.map((p) => <span key={p} className="own" style={{ color: colorOf(g, p) }}>● {g.names[p]}</span>);
        const placed = showBets ? Object.entries(g.bets).flatMap(([p, cs]) => cs.filter((x) => x === i).map((_, k) => <span key={p + k} className="chipdot" style={{ background: colorOf(g, p) }} title={g.names[p]} />)) : [];
        return (
          <button key={i} type="button" className={'wwcol' + (win === i ? ' win' : '') + (on ? ' mine' : '')} disabled={!onPick} onClick={() => onPick && onPick(i)}>
            <span className="odds">×{c.odds}</span>
            <span className={'val' + (c.v === null ? ' word' : '')}>{c.v === null ? 'ต่ำกว่าทุกคำตอบ' : fmt(c.v)}</span>
            {c.v !== null && <span className="unit">{g.q.unit}</span>}
            <span className="owners">{c.v === null ? <small>ถ้าทุกคนตอบสูงเกินไป</small> : owners}</span>
            <span className="chips">
              {placed}
              {Array.from({ length: count(i) }, (_, k) => <span key={'m' + k} className="chipdot me" />)}
            </span>
            {win === i && <span className="trophy">🏆</span>}
          </button>
        );
      })}
    </div>
  );
}
