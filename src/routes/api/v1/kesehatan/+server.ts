import type { RequestHandler } from './$types';
import { ok } from '$lib/server/api/respons';
import { KONTRAK_VERSI } from '$lib/server/api/skema';

export const GET: RequestHandler = () => ok({ status: 'baik', kontrakVersi: KONTRAK_VERSI });
