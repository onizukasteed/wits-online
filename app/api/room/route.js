import { handle, body } from '@/lib/api';
import { createRoom } from '@/lib/room';
import { gateCheck } from '@/lib/gate';

export const dynamic = 'force-dynamic';

export const POST = handle(async (req) => {
  const b = await body(req);
  const bad = gateCheck(b.pass);
  if (bad) {
    if (bad === 'WRONG_PASS') await new Promise((r) => setTimeout(r, 800)); // หน่วงกันเดารหัส
    return { ok: false, status: 401, error: bad };
  }
  return createRoom({ phoneOnly: !!b.phoneOnly });
});
