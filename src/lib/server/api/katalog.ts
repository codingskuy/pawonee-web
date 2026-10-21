// Katalog resep + pemetaan ke bentuk JSON kontrak v1 (docs/api/openapi.yaml).
// Data bank dibaca dari salinan resmi pawonee-ai-models (tidak disunting; lihat __fixtures__).
import bankJson from '../__fixtures__/bank_resep_grade2.json';
import referensiJson from '../__fixtures__/referensi_bahan.json';
import {
  Mesin,
  skalaJumlah,
  type Bank,
  type Rekomendasi as RekomEngine,
  type ResepBank,
  type TabelHarga
} from '../rekomendasi';
import type { StokItemApi } from './skema';

export const bank = bankJson as unknown as Bank;
export const harga = (referensiJson as unknown as { bahan: TabelHarga }).bahan;
export const mesin = new Mesin(bank, harga);

export interface ResepKontrak {
  id: string;
  nama: string;
  kelompok: string;
  waktuMenit: number;
  kisaranBiayaRp: [number, number];
  bahan: { namaBahan: string; gramDasar4Porsi: number; kodeGrade: string; opsional: boolean }[];
  langkah: string[];
  alergen: string[];
  alatWajib: string[];
}

export interface RekomendasiKontrak {
  resep: ResepKontrak;
  skorTotal: number;
  alasan: string;
  bahanTerskala: { namaBahan: string; gram: number }[];
  belanjaTambahan: { namaBahan: string; gram: number; perkiraanRp: number }[];
}

/**
 * ASUMSI: bank hanya punya satu `estimasiBiaya` per resep, sehingga kisaran kontrak
 * [min, maks] memakai nilai yang sama di kedua ujung. `gramDasar4Porsi` memakai jumlah
 * bank apa adanya (juga untuk satuan ml/pcs); `opsional` selalu false (bank tak punya bahan opsional).
 */
export function keResepKontrak(r: ResepBank): ResepKontrak {
  return {
    id: r.kode,
    nama: r.nama,
    kelompok: r.kelompok,
    waktuMenit: r.menit,
    kisaranBiayaRp: [r.estimasiBiaya, r.estimasiBiaya],
    bahan: r.bahan.map((b) => ({
      namaBahan: b.nama,
      gramDasar4Porsi: b.jumlah,
      kodeGrade: b.kodeGrade,
      opsional: false
    })),
    langkah: r.langkah,
    alergen: r.alergen,
    alatWajib: r.alat
  };
}

export const daftarResep = (): ResepKontrak[] => bank.resep.map(keResepKontrak);

export const cariResep = (kode: string): ResepBank | undefined => bank.resep.find((r) => r.kode === kode);

/** Detail resep terskala untuk `jiwa`; tanpa konteks stok sehingga skor 0 dan tanpa belanja (ASUMSI). */
export function detailTerskala(r: ResepBank, jiwa: number): RekomendasiKontrak {
  return {
    resep: keResepKontrak(r),
    skorTotal: 0,
    alasan: `Takaran ${r.nama} diskalakan untuk ${jiwa} jiwa. Skor dan belanja tambahan dihitung lewat rekomendasi dengan stok Anda.`,
    bahanTerskala: r.bahan.map((b) => ({ namaBahan: b.nama, gram: skalaJumlah(b.jumlah, b.jenis, jiwa) })),
    belanjaTambahan: []
  };
}

const daftarNama = (n: string[]): string => (n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} dan ${n[n.length - 1]}`);

/** Dua kalimat penjelasan (di luar paritas skor): bahan grade-2 terserap dan kemudahannya. */
export function buatAlasan(r: RekomEngine, stok: StokItemApi[]): string {
  const stokG2 = new Map(stok.filter((s) => s.kodeGrade !== 'NON-G2').map((s) => [s.namaBahan, s]));
  const terserap = r.bahanTerskala.map((b) => b.nama).filter((n) => stokG2.has(n));
  const kalimat1 = terserap.length
    ? `Menyerap ${daftarNama(terserap)} dari stok grade-2 Anda.`
    : 'Tidak memakai stok grade-2 Anda saat ini.';
  const kalimat2 = r.belanjaTambahanRp === 0
    ? `Semua bahan sudah ada dan selesai dalam ${r.menit} menit.`
    : `Selesai dalam ${r.menit} menit dengan belanja tambahan sekitar Rp${r.belanjaTambahanRp.toLocaleString('id-ID')}.`;
  return `${kalimat1} ${kalimat2}`;
}

export function keRekomendasiKontrak(r: RekomEngine, stok: StokItemApi[]): RekomendasiKontrak {
  const resep = cariResep(r.kode);
  if (!resep) throw new Error(`Resep bank tidak ada: ${r.kode}`);
  return {
    resep: keResepKontrak(resep),
    skorTotal: r.skorTotal,
    alasan: buatAlasan(r, stok),
    bahanTerskala: r.bahanTerskala.map((b) => ({ namaBahan: b.nama, gram: b.jumlah })),
    belanjaTambahan: r.belanjaTambahan.map((b) => ({ namaBahan: b.nama, gram: b.jumlah, perkiraanRp: b.rupiah }))
  };
}

/** Satuan stok per bahan menurut tabel referensi (kontrak stok hanya `gram`; ml/pcs memakai angka yang sama). */
export const satuanBahan = (nama: string): string => harga[nama]?.satuan ?? 'gram';
