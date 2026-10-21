import type { RequestHandler } from './$types';
import { cariResep, detailTerskala } from '$lib/server/api/katalog';
import { galat, jiwaDiLuarRentang, ok, periksaVersiKontrak } from '$lib/server/api/respons';
import { jiwa as skemaJiwa, RE_ID_RESEP } from '$lib/server/api/skema';

export const GET: RequestHandler = ({ request, params, url }) => {
  const salah = periksaVersiKontrak(request);
  if (salah) return salah;
  if (!RE_ID_RESEP.test(params.id)) {
    return galat('VALIDASI_GAGAL', 'Parameter tidak valid.', [{ bidang: 'id', pesan: 'harus berbentuk R-01' }]);
  }
  const mentah = url.searchParams.get('jiwa');
  const angka = mentah === null ? 4 : Number(mentah);
  if (mentah !== null && (mentah.trim() === '' || !Number.isInteger(angka))) {
    return galat('VALIDASI_GAGAL', 'Parameter tidak valid.', [{ bidang: 'jiwa', pesan: 'harus bilangan bulat' }]);
  }
  const hasil = skemaJiwa.safeParse(angka);
  if (!hasil.success) return jiwaDiLuarRentang();
  const resep = cariResep(params.id);
  if (!resep) return galat('RESEP_TIDAK_ADA', `Resep ${params.id} tidak ada.`);
  return ok({ data: detailTerskala(resep, hasil.data) }, { 'Cache-Control': 'public, max-age=86400' });
};
