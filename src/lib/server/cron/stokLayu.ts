// Cron harian: kirim email 1 resep tercepat untuk stok layu (G2-S, kedaluwarsa <= 2 hari).
import { cariResep, mesin, satuanBahan } from '../api/katalog';
import type { ItemStok, Profil, Rekomendasi } from '../rekomendasi';
import type { ProfilKeluargaApi, StokItemApi } from '../api/skema';

export const HARI_LAYU_MAKS = 2;

export interface Penerima {
  email: string;
  profil: ProfilKeluargaApi;
  stok: StokItemApi[];
}

export interface Surel {
  ke: string;
  subjek: string;
  isi: string;
}

export type KirimSurel = (surel: Surel) => Promise<void>;

export const adaStokLayu = (stok: StokItemApi[]): StokItemApi[] =>
  stok.filter((s) => s.kodeGrade === 'G2-S' && s.kedaluwarsaHari <= HARI_LAYU_MAKS);

/** Resep dari rekomendasi yang memakai bahan layu; yang tercepat (menit, lalu skor menurun, lalu kode). */
export function resepTercepatStokLayu(p: Penerima): { resep: Rekomendasi; bahanLayu: string[] } | null {
  const layu = adaStokLayu(p.stok);
  if (!layu.length) return null;
  const namaLayu = new Set(layu.map((s) => s.namaBahan));
  const profil: Profil = {
    alergi: p.profil.alergi,
    pantangan: p.profil.pantangan,
    budgetPerMakan: p.profil.budgetPerMakan,
    levelPedas: p.profil.levelPedas,
    alatMasak: p.profil.alatMasak
  };
  const stok: ItemStok[] = p.stok.map((s) => ({
    nama: s.namaBahan,
    jumlah: s.gram,
    satuan: satuanBahan(s.namaBahan),
    kodeGrade: s.kodeGrade,
    kedaluwarsaHari: s.kedaluwarsaHari
  }));
  const hasil = mesin.rekomendasikan(profil, stok, p.profil.jumlahJiwa, 45);
  const kandidat = hasil.rekomendasi
    .map((r) => ({ resep: r, bahanLayu: r.bahanTerskala.map((b) => b.nama).filter((n) => namaLayu.has(n)) }))
    .filter((k) => k.bahanLayu.length > 0)
    .sort((a, b) => a.resep.menit - b.resep.menit || b.resep.skorTotal - a.resep.skorTotal || (a.resep.kode < b.resep.kode ? -1 : 1));
  return kandidat[0] ?? null;
}

export function susunSurel(p: Penerima, tautanDasar = 'https://pawonee.chefgenie.id'): Surel | null {
  const pilih = resepTercepatStokLayu(p);
  if (!pilih) return null;
  const { resep, bahanLayu } = pilih;
  const nama = cariResep(resep.kode)?.nama ?? resep.kode;
  const tautan = `${tautanDasar}/resep/${resep.kode}?jiwa=${p.profil.jumlahJiwa}`;
  return {
    ke: p.email,
    subjek: `Selamatkan ${bahanLayu.join(', ')}: masak ${nama} (${resep.menit} menit)`,
    isi: `${bahanLayu.join(', ')} di dapur Anda hampir layu. Resep tercepat yang memakainya: ${nama}, ${resep.menit} menit untuk ${p.profil.jumlahJiwa} jiwa.\nBuka resep: ${tautan}\n`
  };
}

export async function jalankanSekali(
  ambilPenerima: () => Promise<Penerima[]>,
  kirim: KirimSurel
): Promise<{ terkirim: number; dilewati: number; gagal: number }> {
  let terkirim = 0;
  let dilewati = 0;
  let gagal = 0;
  for (const p of await ambilPenerima()) {
    const s = susunSurel(p);
    if (!s) {
      dilewati += 1;
      continue;
    }
    try {
      await kirim(s);
      terkirim += 1;
    } catch {
      gagal += 1;
    }
  }
  return { terkirim, dilewati, gagal };
}

/** Milidetik hingga kemunculan berikutnya pukul `jam`:00 (waktu lokal proses; atur TZ=Asia/Jakarta). */
export function msHinggaJam(jam: number, sekarang: Date): number {
  const t = new Date(sekarang);
  t.setHours(jam, 0, 0, 0);
  if (t.getTime() <= sekarang.getTime()) t.setDate(t.getDate() + 1);
  return t.getTime() - sekarang.getTime();
}

/** Jadwal harian berbasis timer (tanpa dependensi); kembalikan fungsi penghenti. */
export function jadwalkanHarian(jam: number, tugas: () => Promise<unknown>): () => void {
  let timer: ReturnType<typeof setTimeout>;
  const pasang = () => {
    timer = setTimeout(async () => {
      try {
        await tugas();
      } catch (e) {
        console.error('[cron stokLayu] gagal:', e instanceof Error ? e.message : e);
      }
      pasang();
    }, msHinggaJam(jam, new Date()));
  };
  pasang();
  return () => clearTimeout(timer);
}
