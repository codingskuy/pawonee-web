import { error } from '@sveltejs/kit';
import { cariResep, detailTerskala } from '$lib/server/api/katalog';
import { RE_ID_RESEP } from '$lib/server/api/skema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
  if (!RE_ID_RESEP.test(params.id)) error(404, 'Resep tidak ada');
  const resep = cariResep(params.id);
  if (!resep) error(404, 'Resep tidak ada');
  // jiwa di luar 1-8 atau bukan angka: pakai bawaan 4 (halaman bagi tidak boleh gagal karena tautan lama).
  const mentah = Number(url.searchParams.get('jiwa'));
  const jiwa = Number.isInteger(mentah) && mentah >= 1 && mentah <= 8 ? mentah : 4;
  const d = detailTerskala(resep, jiwa);
  return { jiwa, resep: d.resep, bahanTerskala: d.bahanTerskala, satuan: Object.fromEntries(resep.bahan.map((b) => [b.nama, b.satuan])) };
};
