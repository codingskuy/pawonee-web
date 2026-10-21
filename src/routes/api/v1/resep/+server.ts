import type { RequestHandler } from './$types';
import { daftarResep } from '$lib/server/api/katalog';
import { ok, periksaVersiKontrak } from '$lib/server/api/respons';

export const GET: RequestHandler = ({ request }) =>
  periksaVersiKontrak(request) ?? ok({ data: daftarResep() }, { 'Cache-Control': 'public, max-age=604800' });
