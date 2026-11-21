import { handle, body } from '@/lib/api';
import { action } from '@/lib/room';

export const dynamic = 'force-dynamic';
export const POST = handle(async (req, { params }) => {
  const b = await body(req);
  return action(params.code.toUpperCase(), b.t, b.a);
});
