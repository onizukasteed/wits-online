import crypto from 'node:crypto';
import { CFG } from './config.js';
import { newGame, act, viewOf } from './engine.js';
import * as S from './store.js';

const TTL = 60 * 60 * 24;
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const rk = (c) => `ww:room:${c}`;
const fail = (status, error) => ({ ok: false, status, error });
const rid = (n = 8) => crypto.randomBytes(n).toString('hex');

async function load(code) {
  const d = await S.hgetall(rk(code));
  if (!d || !d.meta) return null;
  return { meta: d.meta, g: d.g || null };
}
async function save(code, room) {
  room.meta.v = (room.meta.v || 0) + 1;
  const f = { meta: room.meta };
  if (room.g) f.g = room.g;
  await S.hset(rk(code), f);
  await S.expire(rk(code), TTL);
}
async function withLock(code, fn) {
  const key = `ww:lock:${code}`;
  for (let i = 0; i < 12; i++) {
    if (await S.lock(key, 5)) { try { return await fn(); } finally { await S.unlock(key); } }
    await new Promise((r) => setTimeout(r, 100));
  }
  return fail(429, 'ระบบกำลังประมวลผล ลองอีกครั้ง');
}

export async function createRoom() {
  for (let i = 0; i < 30; i++) {
    const code = Array.from({ length: 4 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join('');
    if (await S.exists(rk(code))) continue;
    const meta = { code, v: 1, hostToken: rid(12), phase: 'lobby', players: [] };
    await S.hset(rk(code), { meta });
    await S.expire(rk(code), TTL);
    return { ok: true, code, hostToken: meta.hostToken };
  }
  return fail(500, 'สร้างห้องไม่สำเร็จ ลองใหม่อีกครั้ง');
}

export async function join(code, rawName) {
  return withLock(code, async () => {
    const room = await load(code);
    if (!room) return fail(404, 'ไม่พบห้องนี้');
    const name = String(rawName || '').trim().slice(0, 14);
    if (!name) return fail(400, 'กรุณาใส่ชื่อ');
    const ex = room.meta.players.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (ex) return { ok: true, pid: ex.id, token: ex.token, rejoined: true };
    if (room.meta.phase !== 'lobby') return fail(409, 'เกมเริ่มไปแล้ว (ถ้าเคยเข้า ให้ใส่ชื่อเดิม)');
    if (room.meta.players.length >= CFG.maxPlayers) return fail(409, `ห้องเต็มแล้ว (สูงสุด ${CFG.maxPlayers} คน)`);
    const p = { id: 'p' + rid(3), name, token: rid(12) };
    room.meta.players.push(p);
    await save(code, room);
    return { ok: true, pid: p.id, token: p.token };
  });
}

function who(room, token) {
  if (!token) return { pid: null, host: false };
  if (token === room.meta.hostToken) return { pid: null, host: true };
  const p = room.meta.players.find((x) => x.token === token);
  return { pid: p ? p.id : null, host: false, bad: !p };
}

export async function getView(code, token, h) {
  const room = await load(code);
  if (!room) return fail(404, 'ไม่พบห้องนี้');
  const w = who(room, token);
  if (w.bad) return fail(401, 'ไม่ได้อยู่ในห้องนี้');
  const hash = `${room.meta.v}`;
  if (h && h === hash) return { ok: true, same: true };
  const base = { h: hash, code, host: w.host, you: w.pid, lobby: room.meta.players.map((p) => ({ id: p.id, name: p.name })) };
  if (room.meta.phase === 'lobby' || !room.g) return { ok: true, view: { ...base, phase: 'lobby' } };
  return { ok: true, view: { ...base, phase: 'game', game: viewOf(room.g, w.pid) } };
}

export async function action(code, token, a) {
  return withLock(code, async () => {
    const room = await load(code);
    if (!room) return fail(404, 'ไม่พบห้องนี้');
    const w = who(room, token);
    if (w.bad || (!w.pid && !w.host)) return fail(401, 'ไม่ได้อยู่ในห้องนี้');
    if (w.host) {
      if (a.type === 'start') {
        if (room.meta.phase !== 'lobby') return fail(409, 'เริ่มไปแล้ว');
        if (room.meta.players.length < CFG.minPlayers) return fail(400, `ต้องมีผู้เล่นอย่างน้อย ${CFG.minPlayers} คน`);
        room.g = newGame(room.meta.players.map((p) => ({ id: p.id, name: p.name })), Number(a.turns));
        room.meta.phase = 'game';
        await save(code, room);
        return { ok: true };
      }
      if (a.type === 'reset') { room.g = null; room.meta.phase = 'lobby'; await S.hset(rk(code), { meta: room.meta, g: null }); await save(code, room); return { ok: true }; }
      if (room.g && ['next', 'force', 'skip'].includes(a.type)) { const r = act(room.g, null, a, true); if (!r.ok) return fail(400, r.error); await save(code, room); return { ok: true }; }
      return fail(400, 'คำสั่งไม่ถูกต้อง');
    }
    if (!room.g) return fail(409, 'เกมยังไม่เริ่ม');
    const r = act(room.g, w.pid, a || {}, false);
    if (!r.ok) return fail(400, r.error);
    await save(code, room);
    return { ok: true, h: String(room.meta.v) };
  });
}
