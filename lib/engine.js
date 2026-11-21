// ตรรกะเกม Wits & Wagers แบบออนไลน์ (ฟังก์ชันล้วน เก็บเป็น JSON ได้)
import { CFG } from './config.js';
import { QUESTIONS } from './questions.js';

const fail = (error) => ({ ok: false, error });
const OK = { ok: true };

export function log(g, m, k = 'info') { g.ev += 1; g.log.push({ i: g.ev, m, k }); if (g.log.length > 30) g.log.shift(); }
function fx(g, k) { g.fxn += 1; g.fx.push({ i: g.fxn, k }); if (g.fx.length > 10) g.fx.shift(); }
const shuffle = (a, rnd) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

export function newGame(players, rounds, rnd = Math.random) {
  const order = players.map((p) => p.id);
  const total = CFG.roundsOptions.includes(rounds) ? rounds : CFG.defaultRounds;
  const g = {
    phase: 'answer', names: {}, order, round: 1, totalRounds: total, deck: shuffle(QUESTIONS.map((_, i) => i), rnd), qi: 0,
    answers: {}, cols: [], bets: {}, score: {}, result: null, winners: [], log: [], ev: 0, fx: [], fxn: 0,
  };
  players.forEach((p) => { g.names[p.id] = p.name; g.score[p.id] = 0; });
  startRound(g);
  log(g, `เริ่มเกม ${order.length} คน · ${total} รอบ (${CFG.doubleLast} รอบสุดท้ายคะแนนคูณ 2)`);
  return g;
}

function startRound(g) {
  if (!g.deck.length) g.deck = shuffle(QUESTIONS.map((_, i) => i), Math.random);
  g.qi = g.deck.shift();
  g.answers = {}; g.cols = []; g.bets = {}; g.result = null; g.phase = 'answer';
  fx(g, 'turn');
}

export const multOf = (g) => (g.round > g.totalRounds - CFG.doubleLast ? 2 : 1);
export const questionOf = (g) => { const [q, a, u] = QUESTIONS[g.qi]; return { text: q, answer: a, unit: u }; };

// สร้างช่องเดิมพัน: ช่องแรกคือ "ต่ำกว่าทุกคำตอบ" ที่เหลือเรียงจากน้อยไปมาก
export function buildCols(answers) {
  const by = new Map();
  for (const [pid, v] of Object.entries(answers)) { if (!by.has(v)) by.set(v, []); by.get(v).push(pid); }
  const vals = [...by.keys()].sort((a, b) => a - b);
  const m = vals.length;
  const centers = m % 2 ? [(m - 1) / 2] : [m / 2 - 1, m / 2];
  const cols = [{ v: null, pids: [], odds: CFG.lowOdds }];
  vals.forEach((v, i) => {
    const d = Math.min(...centers.map((c) => Math.abs(i - c)));
    cols.push({ v, pids: by.get(v), odds: Math.min(CFG.maxOdds, CFG.centerOdds + d) });
  });
  return cols;
}

function toBet(g) {
  g.cols = buildCols(g.answers);
  g.phase = 'bet';
  fx(g, 'clue');
  log(g, `ทุกคนตอบแล้ว ขึ้นกระดานเดิมพัน (${g.cols.length - 1} คำตอบ)`);
}

function reveal(g) {
  const { answer } = questionOf(g);
  // คนที่ตอบใกล้สุดโดยไม่เกินเฉลย
  let win = 0;
  g.cols.forEach((c, i) => { if (c.v !== null && c.v <= answer) win = i; });
  const mult = multOf(g);
  const gains = {};
  g.order.forEach((p) => { gains[p] = { bet: 0, ans: 0 }; });
  const wc = g.cols[win];
  wc.pids.forEach((p) => { gains[p].ans = CFG.ansBonus * mult; });
  for (const [p, chips] of Object.entries(g.bets)) {
    chips.forEach((ci) => { if (ci === win) gains[p].bet += wc.odds * mult; });
  }
  g.order.forEach((p) => { g.score[p] += gains[p].bet + gains[p].ans; });
  g.result = { win, answer, gains, mult };
  g.phase = 'reveal';
  const anyBet = Object.values(gains).some((x) => x.bet > 0);
  fx(g, anyBet ? 'good' : 'miss');
  log(g, `เฉลย ${answer.toLocaleString('en-US')} · ${wc.v === null ? 'ทุกคำตอบสูงเกินไป' : 'ช่องที่ชนะคือ ' + wc.v.toLocaleString('en-US')}`, anyBet ? 'good' : 'info');
}

function goNext(g) {
  if (g.round >= g.totalRounds) {
    g.phase = 'over';
    const top = Math.max(...g.order.map((p) => g.score[p]));
    g.winners = g.order.filter((p) => g.score[p] === top);
    log(g, `จบเกม! ${g.winners.map((p) => g.names[p]).join(' และ ')} ชนะด้วย ${top} แต้ม`, 'good');
    fx(g, 'win');
    return;
  }
  g.round += 1;
  startRound(g);
}

export function act(g, pid, a, isHost = false) {
  switch (a.type) {
    case 'answer': {
      if (g.phase !== 'answer') return fail('ตอนนี้ตอบไม่ได้');
      if (!g.names[pid]) return fail('ไม่ได้อยู่ในเกม');
      const v = Number(String(a.v).replace(/,/g, ''));
      if (!Number.isFinite(v) || String(a.v).trim() === '') return fail('ใส่ตัวเลขเท่านั้น');
      if (v < 0 || v > 1e12) return fail('ตัวเลขไม่อยู่ในช่วงที่ใช้ได้');
      g.answers[pid] = Math.round(v * 1000) / 1000;
      fx(g, 'lock');
      if (g.order.every((p) => g.answers[p] !== undefined)) toBet(g);
      return OK;
    }
    case 'bet': {
      if (g.phase !== 'bet') return fail('ตอนนี้เดิมพันไม่ได้');
      if (!g.names[pid]) return fail('ไม่ได้อยู่ในเกม');
      const chips = Array.isArray(a.cols) ? a.cols.map(Number) : [];
      if (chips.length !== CFG.chips) return fail(`ต้องวางเดิมพันให้ครบ ${CFG.chips} เหรียญ`);
      if (chips.some((c) => !Number.isInteger(c) || c < 0 || c >= g.cols.length)) return fail('ช่องเดิมพันไม่ถูกต้อง');
      g.bets[pid] = chips.slice().sort((x, y) => x - y);
      fx(g, 'lock');
      if (g.order.every((p) => g.bets[p])) reveal(g);
      return OK;
    }
    case 'next': {
      if (g.phase !== 'reveal') return fail('ยังไม่ถึงช่วงเฉลย');
      if (!isHost && pid !== g.order[0]) return fail('ให้จอทีวีหรือผู้เล่นคนแรกกดไปต่อ');
      goNext(g);
      return OK;
    }
    case 'force': { // เจ้าของห้อง: ข้ามคนที่ยังไม่ส่ง
      if (!isHost) return fail('เฉพาะเจ้าของห้อง');
      if (g.phase === 'answer') {
        if (Object.keys(g.answers).length < 2) return fail('ต้องมีคนตอบอย่างน้อย 2 คน');
        toBet(g); return OK;
      }
      if (g.phase === 'bet') {
        if (Object.keys(g.bets).length < 1) return fail('ยังไม่มีใครเดิมพัน');
        reveal(g); return OK;
      }
      return fail('ใช้ได้ตอนรอคำตอบหรือรอเดิมพันเท่านั้น');
    }
    default: return fail('คำสั่งไม่ถูกต้อง');
  }
}

export function viewOf(g, pid) {
  const q = questionOf(g);
  const done = g.phase === 'reveal' || g.phase === 'over';
  const inBet = g.phase === 'bet';
  const mine = {};
  if (pid && g.answers[pid] !== undefined) mine.answer = g.answers[pid];
  if (pid && g.bets[pid]) mine.bet = g.bets[pid];
  return {
    phase: g.phase, names: g.names, order: g.order, round: g.round, totalRounds: g.totalRounds, mult: multOf(g),
    q: { text: q.text, unit: q.unit }, answered: g.order.filter((p) => g.answers[p] !== undefined),
    cols: inBet || done ? g.cols : [], betted: g.order.filter((p) => g.bets[p]),
    bets: done ? g.bets : {}, score: g.score, result: g.result, winners: g.winners, mine,
    log: g.log, fx: g.fx, you: pid, cfg: { chips: CFG.chips, ansBonus: CFG.ansBonus },
  };
}
