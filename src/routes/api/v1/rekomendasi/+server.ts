import type { RequestHandler } from './$types';
import { keRekomendasiKontrak, mesin, satuanBahan } from '$lib/server/api/katalog';
import {
  bacaJson,
  galat,
  jiwaDiLuarRentang,
  ok,
  periksaVersiKontrak,
  validasiGagal
} from '$lib/server/api/respons';
import { rekomendasiRequest } from '$lib/server/api/skema';

export const POST: RequestHandler = async ({ request }) => {
  const salahVersi = periksaVersiKontrak(request);
  if (salahVersi) return salahVersi;

  const badan = await bacaJson(request);
  if (badan === null || typeof badan !== 'object') {
    return galat('VALIDASI_GAGAL', 'Badan permintaan harus JSON objek.');
  }
  const j = (badan as { jiwa?: unknown }).jiwa;
  if (typeof j === 'number' && Number.isInteger(j) && (j < 1 || j > 8)) return jiwaDiLuarRentang();

  const parsed = rekomendasiRequest.safeParse(badan);
  if (!parsed.success) return validasiGagal(parsed.error);
  const { profil, stok, jiwa, waktuMaksimalMenit } = parsed.data;

  const hasil = mesin.rekomendasikan(
    {
      alergi: profil.alergi,
      pantangan: profil.pantangan,
      budgetPerMakan: profil.budgetPerMakan,
      levelPedas: profil.levelPedas,
      alatMasak: profil.alatMasak
    },
    stok.map((s) => ({
      nama: s.namaBahan,
      jumlah: s.gram,
      satuan: satuanBahan(s.namaBahan),
      kodeGrade: s.kodeGrade,
      kedaluwarsaHari: s.kedaluwarsaHari
    })),
    jiwa,
    waktuMaksimalMenit
  );
  if (hasil.galat) return jiwaDiLuarRentang();
  return ok({
    data: hasil.rekomendasi.map((r) => keRekomendasiKontrak(r, stok)),
    modeTanpaStok: hasil.modeTanpaStok
  });
};
