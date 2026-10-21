import type { RequestHandler } from './$types';
import { headerHulu, teruskanGalatHulu, urlHulu } from '$lib/server/api/hulu';
import { galat, ok, periksaVersiKontrak, rinciDariZod } from '$lib/server/api/respons';
import { hasilStokPawonee, idKeluarga } from '$lib/server/api/skema';
import { CacheStok, GalatHulu } from '$lib/server/api/stokCache';

const cache = new CacheStok();

/**
 * Baca stok keluarga (proksi hanya-baca; stok milik Pedaree). Diteruskan ke
 * `GET {PAWONEE_API}/stok`, cache 60 detik; bila hulu mati dan ada data tersimpan,
 * jawab dengan header `X-Data-Usang: true`; tanpa data tersimpan, 502 `JARINGAN_GAGAL`.
 */
export const GET: RequestHandler = async ({ request, url, fetch }) => {
  const salah = periksaVersiKontrak(request);
  if (salah) return salah;
  const id = idKeluarga.safeParse(url.searchParams.get('idKeluarga'));
  if (!id.success) {
    return galat('VALIDASI_GAGAL', 'Parameter tidak valid.', rinciDariZod(id.error).map((r) => ({ ...r, bidang: 'idKeluarga' })));
  }
  const kunci = CacheStok.kunci(
    id.data,
    [request.headers.get('authorization'), request.headers.get('x-device-key'), request.headers.get('x-service-key')].join('|')
  );
  try {
    const hasil = await cache.ambil(kunci, async () => {
      const res = await fetch(`${urlHulu()}/stok?idKeluarga=${encodeURIComponent(id.data)}`, { headers: headerHulu(request) });
      if (!res.ok) {
        // 4xx dari hulu (mis. 401/404) diteruskan; hanya 5xx dan jaringan memakai cache usang.
        if (res.status < 500) throw new GalatHulu(await teruskanGalatHulu(res));
        throw new Error(`hulu ${res.status}`);
      }
      const badan = hasilStokPawonee.safeParse(await res.json().catch(() => null));
      if (!badan.success) throw new Error('bentuk stok hulu tidak sesuai kontrak');
      return badan.data.data;
    });
    return ok({ data: hasil.data }, hasil.usang ? { 'X-Data-Usang': 'true' } : {});
  } catch (e) {
    if (e instanceof GalatHulu) return e.respons;
    return galat('JARINGAN_GAGAL', 'Layanan stok tidak dapat dijangkau dan tidak ada data tersimpan.');
  }
};
