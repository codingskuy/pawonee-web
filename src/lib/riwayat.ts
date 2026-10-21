// Riwayat masak lokal (per peramban): menyimpan paling banyak 30 masakan terakhir.
export const MAKS_RIWAYAT = 30;
export const KUNCI_RIWAYAT = 'pawonee.riwayat.v1';

export interface Masakan {
  id: string;
  nama: string;
  jiwa: number;
  tanggal: string; // ISO
}

export function tambahMasakan(daftar: Masakan[], baru: Masakan): Masakan[] {
  return [baru, ...daftar].slice(0, MAKS_RIWAYAT);
}

export function bacaRiwayat(simpan: Pick<Storage, 'getItem'>): Masakan[] {
  try {
    const mentah = simpan.getItem(KUNCI_RIWAYAT);
    const arr: unknown = mentah ? JSON.parse(mentah) : [];
    return Array.isArray(arr)
      ? (arr.filter(
          (m): m is Masakan =>
            !!m && typeof m.id === 'string' && typeof m.nama === 'string' && typeof m.jiwa === 'number' && typeof m.tanggal === 'string'
        ) as Masakan[]).slice(0, MAKS_RIWAYAT)
      : [];
  } catch {
    return [];
  }
}

export function simpanRiwayat(simpan: Pick<Storage, 'setItem'>, daftar: Masakan[]): void {
  try {
    simpan.setItem(KUNCI_RIWAYAT, JSON.stringify(daftar.slice(0, MAKS_RIWAYAT)));
  } catch {
    // penyimpanan penuh/diblokir: abaikan, riwayat hanya fitur kenyamanan
  }
}
