// Skema Zod untuk kontrak REST v1 (docs/api/openapi.yaml di pawonee-backend-service).
import { z } from 'zod';

export const KONTRAK_VERSI = 'v1';
export const ORIGIN_DIIZINKAN = 'https://pawonee.chefgenie.id';

export const KODE_GALAT = [
  'STOK_KOSONG',
  'PROFIL_TIDAK_ADA',
  'JARINGAN_GAGAL',
  'RESEP_TIDAK_ADA',
  'JIWA_DI_LUAR_RENTANG',
  'VALIDASI_GAGAL',
  'BATAS_LAJU',
  'TIDAK_TEROTENTIKASI',
  'KONFLIK',
  'TAK_TERPROSES',
  'KESALAHAN_SERVER'
] as const;
export type KodeGalat = (typeof KODE_GALAT)[number];

export const kodeGrade = z.enum(['G2-V', 'G2-U', 'G2-S', 'NON-G2']);
export const alergi = z.enum(['udang', 'telur', 'kacang-tanah', 'kedelai', 'susu-sapi', 'ikan', 'gluten']);
export const pantangan = z.enum([
  'halal-selalu',
  'vegetarian-nabati',
  'tanpa-santan',
  'rendah-garam',
  'rendah-gula',
  'lunak-lansia'
]);
export const alatMasak = z.enum(['kompor', 'wajan', 'panci', 'kukusan', 'blender', 'oven', 'air-fryer']);

export const RE_ID_KELUARGA = /^KEL-[0-9]{4}$/;
export const RE_ID_RESEP = /^R-[0-9]{2}$/;
export const idKeluarga = z.string().regex(RE_ID_KELUARGA, 'harus berbentuk KEL-0001');

export const jiwa = z.number().int().min(1, 'harus 1 sampai 8').max(8, 'harus 1 sampai 8');
export const waktuMaksimalMenit = z
  .number()
  .int()
  .min(10, 'harus 10 sampai 45')
  .max(45, 'harus 10 sampai 45');

export const stokItem = z.object({
  namaBahan: z.string().min(1),
  gram: z.number().int().min(0, 'harus >= 0'),
  kedaluwarsaHari: z.number().int(),
  kodeGrade
});
export type StokItemApi = z.infer<typeof stokItem>;

export const profilKeluarga = z.object({
  idKeluarga,
  versiProfil: z.number().int().min(1).optional(),
  jumlahJiwa: jiwa,
  komposisi: z
    .object({
      dewasa: z.number().int().min(0).optional(),
      anak: z.number().int().min(0).optional(),
      balita: z.number().int().min(0).optional(),
      lansia: z.number().int().min(0).optional()
    })
    .optional(),
  alergi: z.array(alergi),
  pantangan: z.array(pantangan),
  budgetPerMakan: z.number().int().min(0),
  levelPedas: z.number().int().min(0).max(3),
  alatMasak: z.array(alatMasak),
  sumberBelanja: z.enum(['pedaree-stok', 'lumbung-g2', 'campuran']).optional()
});
export type ProfilKeluargaApi = z.infer<typeof profilKeluarga>;

export const rekomendasiRequest = z.object({
  profil: profilKeluarga,
  stok: z.array(stokItem),
  jiwa,
  waktuMaksimalMenit: waktuMaksimalMenit.default(30)
});
export type RekomendasiRequest = z.infer<typeof rekomendasiRequest>;

export const hasilStokPawonee = z.object({ data: z.array(stokItem) });
