import { handle } from '@/lib/api';
import { createRoom } from '@/lib/room';

export const dynamic = 'force-dynamic';
export const POST = handle(async () => createRoom());
