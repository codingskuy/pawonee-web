// Cache proksi stok: 60 detik; bila hulu gagal, pakai data tersimpan dan tandai usang
// (`X-Data-Usang: true`). Kunci mencakup kredensial pemanggil agar stok tak bocor antar pengguna.
import { createHash } from 'node:crypto';
import type { StokItemApi } from './skema';

export const TTL_STOK_MS = 60_000;

interface Entri {
  data: StokItemApi[];
  waktu: number;
}

export interface HasilStok {
  data: StokItemApi[];
  usang: boolean;
}

export class CacheStok {
  private readonly peta = new Map<string, Entri>();

  constructor(
    private readonly ttl = TTL_STOK_MS,
    private readonly sekarang: () => number = Date.now
  ) {}

  static kunci(idKeluarga: string, kredensial: string): string {
    return `${idKeluarga}:${createHash('sha256').update(kredensial).digest('hex').slice(0, 16)}`;
  }

  /**
   * Segar (< ttl) dikembalikan tanpa memanggil hulu. Jika hulu melempar, kembalikan data
   * lama dengan `usang: true`; tanpa data lama, lempar ulang galatnya.
   */
  async ambil(kunci: string, muat: () => Promise<StokItemApi[]>): Promise<HasilStok> {
    const e = this.peta.get(kunci);
    if (e && this.sekarang() - e.waktu < this.ttl) return { data: e.data, usang: false };
    try {
      const data = await muat();
      this.peta.set(kunci, { data, waktu: this.sekarang() });
      return { data, usang: false };
    } catch (err) {
      if (e) return { data: e.data, usang: true };
      throw err;
    }
  }
}

/** Galat hulu yang membawa respons AppError untuk diteruskan apa adanya (bukan alasan memakai cache). */
export class GalatHulu extends Error {
  constructor(public readonly respons: Response) {
    super('galat hulu');
  }
}
