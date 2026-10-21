import { describe, expect, it } from 'vitest';
import { jalankanSekali, msHinggaJam, resepTercepatStokLayu, susunSurel, type Penerima, type Surel } from './stokLayu';

const profil = {
  idKeluarga: 'KEL-0001',
  jumlahJiwa: 4,
  alergi: [],
  pantangan: [],
  budgetPerMakan: 35000,
  levelPedas: 3,
  alatMasak: ['kompor', 'wajan', 'panci', 'kukusan', 'blender']
} as Penerima['profil'];

const layu: Penerima = {
  email: 'a@contoh.id',
  profil,
  stok: [
    { namaBahan: 'bayam', gram: 400, kedaluwarsaHari: 1, kodeGrade: 'G2-S' },
    { namaBahan: 'jagung manis', gram: 300, kedaluwarsaHari: 6, kodeGrade: 'G2-U' },
    { namaBahan: 'bawang putih', gram: 60, kedaluwarsaHari: 10, kodeGrade: 'G2-U' }
  ]
};
const segar: Penerima = { email: 'b@contoh.id', profil, stok: [{ namaBahan: 'bayam', gram: 400, kedaluwarsaHari: 5, kodeGrade: 'G2-S' }] };

describe('cron stok layu', () => {
  it('memilih resep tercepat yang memakai bahan layu', () => {
    const p = resepTercepatStokLayu(layu);
    expect(p).not.toBeNull();
    expect(p!.bahanLayu).toContain('bayam');
    expect(p!.resep.menit).toBeLessThanOrEqual(45);
  });
  it('tanpa stok layu: tidak ada surel', () => {
    expect(resepTercepatStokLayu(segar)).toBeNull();
    expect(susunSurel(segar)).toBeNull();
  });
  it('surel memuat tautan bagi dengan jiwa', () => {
    const s = susunSurel(layu)!;
    expect(s.ke).toBe('a@contoh.id');
    expect(s.isi).toMatch(/https:\/\/pawonee\.chefgenie\.id\/resep\/R-\d{2}\?jiwa=4/);
  });
  it('jalankanSekali menghitung terkirim, dilewati, gagal', async () => {
    const kirim: Surel[] = [];
    const hasil = await jalankanSekali(async () => [layu, segar, { ...layu, email: 'x@contoh.id' }], async (s) => {
      if (s.ke === 'x@contoh.id') throw new Error('smtp');
      kirim.push(s);
    });
    expect(hasil).toEqual({ terkirim: 1, dilewati: 1, gagal: 1 });
    expect(kirim).toHaveLength(1);
  });
  it('msHinggaJam: sebelum jam -> hari ini; sesudah -> besok', () => {
    expect(msHinggaJam(7, new Date(2026, 0, 1, 6, 0, 0))).toBe(3_600_000);
    expect(msHinggaJam(7, new Date(2026, 0, 1, 8, 0, 0))).toBe(23 * 3_600_000);
  });
});
