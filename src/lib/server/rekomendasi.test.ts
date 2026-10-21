import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BAHAN_DAPUR_POKOK,
  FAKTOR_PORSI,
  KELIPATAN,
  Mesin,
  type Bank,
  type ItemStok,
  type Profil,
  type TabelHarga
} from './rekomendasi';

const dir = new URL('./__fixtures__/', import.meta.url);
const bacaTeks = (n: string) => readFileSync(new URL(n, dir), 'utf8');
const bankTeks = bacaTeks('bank_resep_grade2.json');
const bank = JSON.parse(bankTeks) as Bank;
const fixture = JSON.parse(bacaTeks('paritas-32-kasus.json')) as {
  bankSha256: string;
  ambangSelisih: number;
  konfigurasi: {
    faktorPorsiPersen: Record<string, { bahan: number; bumbu: number; air: number }>;
    kelipatanPembulatan: Record<string, number>;
    bahanDapurPokok: string[];
    harga: TabelHarga;
  };
  kasus: {
    id: string;
    masukan: { profil: Profil; stok: ItemStok[]; jiwa: number; waktuMaksimalMenit: number };
    harapan: {
      galat: string | null;
      modeTanpaStok: boolean;
      rekomendasi: Record<string, unknown>[];
    };
  }[];
};

const SKOR = ['skorTotal', 'skorSerapan', 'skorKecocokanStok', 'skorBudget', 'skorWaktu'] as const;
const mesin = new Mesin(bank, fixture.konfigurasi.harga);

describe('paket fixture', () => {
  it('SHA-256 bank sama dengan bankSha256 fixture', () => {
    expect(createHash('sha256').update(bankTeks).digest('hex')).toBe(fixture.bankSha256);
  });

  it('memuat 32 kasus dan ambang 0,01', () => {
    expect(fixture.kasus).toHaveLength(32);
    expect(fixture.ambangSelisih).toBe(0.01);
  });

  it('konstanta mesin sama dengan konfigurasi fixture', () => {
    for (const [jiwa, f] of Object.entries(fixture.konfigurasi.faktorPorsiPersen)) {
      expect(FAKTOR_PORSI[Number(jiwa)]).toEqual([f.bahan, f.bumbu, f.air]);
    }
    expect(KELIPATAN).toEqual(fixture.konfigurasi.kelipatanPembulatan);
    expect(BAHAN_DAPUR_POKOK).toEqual(fixture.konfigurasi.bahanDapurPokok);
  });
});

describe('paritas 32 kasus (selisih skor < 0,01)', () => {
  for (const k of fixture.kasus) {
    it(k.id, () => {
      const { profil, stok, jiwa, waktuMaksimalMenit } = k.masukan;
      const hasil = mesin.rekomendasikan(profil, stok, jiwa, waktuMaksimalMenit);
      expect(hasil.galat).toBe(k.harapan.galat);
      expect(hasil.modeTanpaStok).toBe(k.harapan.modeTanpaStok);
      expect(hasil.rekomendasi.map((r) => r.kode)).toEqual(k.harapan.rekomendasi.map((r) => r.kode));
      hasil.rekomendasi.forEach((r, i) => {
        const h = k.harapan.rekomendasi[i];
        for (const f of SKOR) {
          expect(Math.abs(r[f] - (h[f] as number))).toBeLessThan(fixture.ambangSelisih);
        }
        expect(r.belanjaTambahanRp).toBe(h.belanjaTambahanRp);
        expect(r.bahanTerskala).toEqual(h.bahanTerskala);
      });
    });
  }
});
