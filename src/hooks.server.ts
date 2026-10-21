import type { Handle } from '@sveltejs/kit';
import { BatasLaju, kunciPembatas } from '$lib/server/api/batasLaju';
import { preflight, tambahCors } from '$lib/server/api/cors';
import { galat } from '$lib/server/api/respons';

const pembatas = new BatasLaju();

export const handle: Handle = async ({ event, resolve }) => {
  if (!event.url.pathname.startsWith('/api/v1/')) return resolve(event);

  const origin = event.request.headers.get('origin');
  if (event.request.method === 'OPTIONS') return preflight(origin);

  let alamat = 'tak-dikenal';
  try {
    alamat = event.getClientAddress();
  } catch {
    // tanpa alamat klien (mis. prarender): pakai kunci bersama
  }
  if (!pembatas.izinkan(kunciPembatas(event.request, alamat))) {
    return tambahCors(galat('BATAS_LAJU', 'Terlalu banyak permintaan.', undefined, { 'Retry-After': '60' }), origin);
  }
  return tambahCors(await resolve(event), origin);
};
