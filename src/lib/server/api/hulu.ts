// Panggilan ke backend Pawonee (hulu) untuk rute yang memproksi: /stok dan /profil.
// Env dibaca lewat process.env (adapter-node/Bun) agar modul ini ikut teruji di `bun test`.
import { galat, ok } from './respons';

export const API_HULU_BAWAAN = 'http://localhost:8080/v1';

export const urlHulu = (): string => (process.env.PAWONEE_API ?? API_HULU_BAWAAN).replace(/\/+$/, '');

/** Header yang diteruskan ke hulu (kredensial milik pemanggil; tidak disimpan). */
export function headerHulu(request: Request): Record<string, string> {
  const h: Record<string, string> = { 'X-Kontrak-Versi': 'v1' };
  for (const k of ['authorization', 'x-device-key', 'x-service-key']) {
    const v = request.headers.get(k);
    if (v) h[k] = v;
  }
  return h;
}

/** Teruskan respons galat hulu apa adanya bila berbentuk AppError; selain itu JARINGAN_GAGAL. */
export async function teruskanGalatHulu(res: Response): Promise<Response> {
  try {
    const b = (await res.json()) as { kode?: string; pesan?: string };
    if (b && typeof b.kode === 'string' && typeof b.pesan === 'string') {
      return ok(b, {}, res.status);
    }
  } catch {
    // badan bukan JSON
  }
  return galat('JARINGAN_GAGAL', 'Layanan hulu tidak dapat dijangkau.');
}
