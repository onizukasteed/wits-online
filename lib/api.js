import { NextResponse } from 'next/server';

export function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function handle(fn) {
  return async (req, ctx) => {
    try {
      const out = await fn(req, ctx);
      if (out && out.ok === false) return json({ error: out.error }, out.status || 400);
      return json(out);
    } catch (e) {
      if (e && e.message === 'NO_REDIS') {
        return json({ error: 'NO_REDIS' }, 500);
      }
      console.error(e);
      return json({ error: 'เซิร์ฟเวอร์ผิดพลาด' }, 500);
    }
  };
}

export async function body(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
