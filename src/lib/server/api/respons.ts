// Pembungkus respons baku: sukses `{ data, ... }`, galat `AppError` (`Hasil<T>`).
import type { ZodError } from 'zod';
import { KONTRAK_VERSI, type KodeGalat } from './skema';

export interface Rinci {
  bidang: string;
  pesan: string;
}
export interface AppError {
  kode: KodeGalat;
  pesan: string;
  rinci?: Rinci[];
  retrySetelahDetik?: number;
}

const STATUS: Record<KodeGalat, number> = {
  STOK_KOSONG: 404,
  PROFIL_TIDAK_ADA: 404,
  JARINGAN_GAGAL: 502,
  RESEP_TIDAK_ADA: 404,
  JIWA_DI_LUAR_RENTANG: 422,
  VALIDASI_GAGAL: 400,
  BATAS_LAJU: 429,
  TIDAK_TEROTENTIKASI: 401,
  KONFLIK: 409,
  TAK_TERPROSES: 422,
  KESALAHAN_SERVER: 500
};

const baseHeaders = { 'X-Kontrak-Versi': KONTRAK_VERSI };

export function ok(body: unknown, headers: Record<string, string> = {}, status = 200): Response {
  return Response.json(body, { status, headers: { ...baseHeaders, ...headers } });
}

export function galat(kode: KodeGalat, pesan: string, rinci?: Rinci[], headers: Record<string, string> = {}): Response {
  const body: AppError = { kode, pesan };
  if (rinci?.length) body.rinci = rinci;
  if (kode === 'BATAS_LAJU') body.retrySetelahDetik = 60;
  return Response.json(body, { status: STATUS[kode], headers: { ...baseHeaders, ...headers } });
}

export function rinciDariZod(e: ZodError): Rinci[] {
  return e.issues.map((i) => ({ bidang: i.path.join('.') || '(badan)', pesan: i.message }));
}

export function validasiGagal(e: ZodError): Response {
  return galat('VALIDASI_GAGAL', 'Parameter tidak valid.', rinciDariZod(e));
}

export function jiwaDiLuarRentang(): Response {
  return galat('JIWA_DI_LUAR_RENTANG', 'Jumlah jiwa harus 1 sampai 8.');
}

/** Baca badan JSON; null bila bukan JSON valid. */
export async function bacaJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** Tolak bila klien meminta versi kontrak selain v1. */
export function periksaVersiKontrak(request: Request): Response | null {
  const v = request.headers.get('x-kontrak-versi');
  if (v !== null && v !== KONTRAK_VERSI) {
    return galat('VALIDASI_GAGAL', 'Versi kontrak tidak didukung.', [
      { bidang: 'X-Kontrak-Versi', pesan: `harus ${KONTRAK_VERSI}` }
    ]);
  }
  return null;
}
