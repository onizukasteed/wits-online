import { handle } from '@/lib/api';
import { getView } from '@/lib/room';

export const dynamic = 'force-dynamic';
export const GET = handle(async (req, { params }) => {
  const u = new URL(req.url);
  const out = await getView(params.code.toUpperCase(), u.searchParams.get('t'), u.searchParams.get('h'));
  if (!out.ok) return out;
  return out.same ? { same: true } : out.view;
});
