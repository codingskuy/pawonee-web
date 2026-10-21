import type { RequestHandler } from './$types';
import { headerHulu, teruskanGalatHulu, urlHulu } from '$lib/server/api/hulu';
import {
  bacaJson,
  galat,
  jiwaDiLuarRentang,
  ok,
  periksaVersiKontrak,
  validasiGagal
} from '$lib/server/api/respons';
import { profilKeluarga, RE_ID_KELUARGA } from '$lib/server/api/skema';

/**
 * Simpan profil keluarga (idempoten lewat `versiProfil`). Kontrak v1 hanya mendefinisikan `PUT`;
 * web memvalidasi lalu meneruskan ke backend Pawonee dan tidak menyimpan apa pun (tanpa DB).
 */
export const PUT: RequestHandler = async ({ request, params, fetch }) => {
  const salah = periksaVersiKontrak(request);
  if (salah) return salah;
  if (!RE_ID_KELUARGA.test(params.idKeluarga)) {
    return galat('VALIDASI_GAGAL', 'Parameter tidak valid.', [{ bidang: 'idKeluarga', pesan: 'harus berbentuk KEL-0001' }]);
  }
  const badan = await bacaJson(request);
  if (badan === null || typeof badan !== 'object') {
    return galat('VALIDASI_GAGAL', 'Badan permintaan harus JSON objek.');
  }
  const j = (badan as { jumlahJiwa?: unknown }).jumlahJiwa;
  if (typeof j === 'number' && Number.isInteger(j) && (j < 1 || j > 8)) return jiwaDiLuarRentang();
  const parsed = profilKeluarga.safeParse(badan);
  if (!parsed.success) return validasiGagal(parsed.error);
  if (parsed.data.idKeluarga !== params.idKeluarga) {
    return galat('VALIDASI_GAGAL', 'Parameter tidak valid.', [{ bidang: 'idKeluarga', pesan: 'harus sama dengan path' }]);
  }
  let res: Response;
  try {
    res = await fetch(`${urlHulu()}/profil/${params.idKeluarga}`, {
      method: 'PUT',
      headers: { ...headerHulu(request), 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data)
    });
  } catch {
    return galat('JARINGAN_GAGAL', 'Layanan profil tidak dapat dijangkau.');
  }
  if (!res.ok) return teruskanGalatHulu(res);
  return ok({ data: { tersimpan: true } });
};
