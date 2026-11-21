import assert from 'node:assert';
import { newGame, act, viewOf, buildCols, questionOf } from '../lib/engine.js';
import { QUESTIONS } from '../lib/questions.js';

assert.ok(QUESTIONS.length >= 50 && QUESTIONS.every((q) => q.length === 3 && typeof q[1] === 'number'));
// ช่องเดิมพัน: คี่ = กลางจ่าย 2, คู่ = สองช่องกลางจ่าย 2
let c = buildCols({ a: 10, b: 20, c: 30, d: 40, e: 50 });
assert.deepEqual(c.map((x) => x.odds), [6, 4, 3, 2, 3, 4]);
c = buildCols({ a: 10, b: 20, c: 30, d: 40 });
assert.deepEqual(c.map((x) => x.odds), [6, 3, 2, 2, 3]);
c = buildCols({ a: 10, b: 10, c: 30 });
assert.equal(c.length, 3); assert.deepEqual(c[1].pids, ['a', 'b']);
c = buildCols({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9 });
assert.equal(Math.max(...c.slice(1).map((x) => x.odds)), 5);

const P = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id.toUpperCase() }));
const g = newGame(P, 5);
assert.equal(g.totalRounds, 5);
const ans = questionOf(g).answer;
assert.ok(act(g, 'a', { type: 'answer', v: 'abc' }).error);
assert.ok(act(g, 'a', { type: 'answer', v: -5 }).error);
assert.equal(viewOf(g, 'b').cols.length, 0);
act(g, 'a', { type: 'answer', v: ans - 100 }); act(g, 'b', { type: 'answer', v: ans + 50 }); act(g, 'c', { type: 'answer', v: ans + 10 });
assert.equal(g.phase, 'answer'); assert.equal(viewOf(g, 'b').answered.length, 3); assert.equal(viewOf(g, 'b').mine.answer, ans + 50);
act(g, 'd', { type: 'answer', v: ans - 5 });
assert.equal(g.phase, 'bet');
assert.equal(g.cols[0].v, null); assert.deepEqual(g.cols.slice(1).map((x) => x.v), [ans - 100, ans - 5, ans + 10, ans + 50]);
assert.ok(act(g, 'a', { type: 'bet', cols: [1] }).error);
assert.ok(act(g, 'a', { type: 'bet', cols: [1, 9] }).error);
const win = 2; // ans-5 (d) = ใกล้สุดไม่เกินเฉลย
assert.ok(act(g, 'a', { type: 'bet', cols: [win, win] }).ok);
assert.equal(viewOf(g, 'b').bets.a, undefined); // เดิมพันของคนอื่นยังไม่เปิดเผย
act(g, 'b', { type: 'bet', cols: [0, 1] }); act(g, 'c', { type: 'bet', cols: [win, 3] });
assert.equal(g.phase, 'bet'); act(g, 'd', { type: 'bet', cols: [4, 4] });
assert.equal(g.phase, 'reveal'); assert.equal(g.result.win, win);
const odds = g.cols[win].odds; // 4 คำตอบ -> ช่อง 2 = กลาง = 2
assert.equal(odds, 2);
assert.equal(g.score.a, 2 * odds); assert.equal(g.score.b, 0); assert.equal(g.score.c, odds); assert.equal(g.score.d, 3);
assert.equal(viewOf(g, 'b').bets.a.length, 2);
assert.ok(act(g, 'b', { type: 'next' }).error); assert.ok(act(g, 'a', { type: 'next' }).ok);
// ทุกคำตอบสูงเกิน -> ช่อง "ต่ำกว่า"
const h = newGame(P, 5); const a2 = questionOf(h).answer;
P.forEach((p, i) => act(h, p.id, { type: 'answer', v: a2 + 10 + i }));
P.forEach((p) => act(h, p.id, { type: 'bet', cols: [0, 0] }));
assert.equal(h.result.win, 0); assert.equal(h.score.a, 12);
// ข้ามคนไม่ส่ง
const k = newGame(P, 5); act(k, 'a', { type: 'answer', v: 1 }); assert.ok(act(k, null, { type: 'force' }, true).error);
act(k, 'b', { type: 'answer', v: 2 }); assert.ok(act(k, null, { type: 'force' }, true).ok); assert.equal(k.phase, 'bet');
act(k, 'a', { type: 'bet', cols: [1, 2] }); assert.ok(act(k, null, { type: 'force' }, true).ok); assert.equal(k.phase, 'reveal');
// เล่นจนจบ + คะแนนคูณสองในรอบท้าย
const m = newGame(P, 5); let guard = 0; const mults = [];
while (m.phase !== 'over' && guard++ < 50) {
  const a = questionOf(m).answer; P.forEach((p, i) => act(m, p.id, { type: 'answer', v: a + i * 7 - 10 }));
  P.forEach((p) => act(m, p.id, { type: 'bet', cols: [1, 2] })); mults.push(m.result.mult); act(m, 'a', { type: 'next' });
}
assert.equal(m.phase, 'over'); assert.deepEqual(mults, [1, 1, 1, 2, 2]); assert.ok(m.winners.length >= 1);
console.log('wits engine OK', QUESTIONS.length, 'questions');
