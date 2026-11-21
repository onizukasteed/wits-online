import { handle, body } from '@/lib/api';
import { join } from '@/lib/room';

export const dynamic = 'force-dynamic';
export const POST = handle(async (req, { params }) => {
  const b = await body(req);
  return join(params.code.toUpperCase(), b.name);
});
