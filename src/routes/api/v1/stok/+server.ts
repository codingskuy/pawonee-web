import type { RequestHandler } from './$types';
import { headerHulu, teruskanGalatHulu, urlHulu } from '$lib/server/api/hulu';
import { galat, ok, periksaVersiKontrak, rinciDariZod } from '$lib/server/api/respons';
import { hasilStokPawonee, idKeluarga } from '$lib/server/api/skema';

/**
 * Baca stok keluarga. Web hanya membaca (stok milik Pedaree): permintaan diteruskan ke
 * `GET {PAWONEE_API}/stok` yang memetakan Pedaree ke bentuk `StokItem`. Cache 60 detik dan
 * `X-Data-Usang` ditambahkan oleh PWN-WEB-004.
 */
export const GET: RequestHandler = async ({ request, url, fetch }) => {
  const salah = periksaVersiKontrak(request);
  if (salah) return salah;
  const id = idKeluarga.safeParse(url.searchParams.get('idKeluarga'));
  if (!id.success) {
    return galat('VALIDASI_GAGAL', 'Parameter tidak valid.', rinciDariZod(id.error).map((r) => ({ ...r, bidang: 'idKeluarga' })));
  }
  let res: Response;
  try {
    res = await fetch(`${urlHulu()}/stok?idKeluarga=${encodeURIComponent(id.data)}`, { headers: headerHulu(request) });
  } catch {
    return galat('JARINGAN_GAGAL', 'Layanan stok tidak dapat dijangkau.');
  }
  if (!res.ok) return teruskanGalatHulu(res);
  const badan = hasilStokPawonee.safeParse(await res.json().catch(() => null));
  if (!badan.success) return galat('JARINGAN_GAGAL', 'Jawaban stok dari hulu tidak sesuai kontrak.');
  return ok(badan.data);
};
