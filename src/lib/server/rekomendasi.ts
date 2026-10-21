// Port TypeScript mesin rekomendasi Pawonee (PWN-WEB-002).
// Mengikuti `:shared:pantry-resep` dan implementasi rujukan `eval/rekomendasi_ref.py`
// (pawonee-ai-models, fixtures/README.md). Bukan rumus baru. Semua jumlah memakai
// integer; hanya skor serapan dan kecocokan yang pecahan.

export type KodeGrade = 'G2-V' | 'G2-U' | 'G2-S' | 'NON-G2';

export interface BahanResep {
  nama: string;
  jumlah: number;
  satuan: string;
  kodeGrade: KodeGrade;
  jenis: string;
}

export interface ResepBank {
  kode: string;
  id: string;
  nama: string;
  kelompok: string;
  bahan: BahanResep[];
  langkah: string[];
  menit: number;
  jumlahKompor: number;
  levelPedas: number;
  estimasiBiaya: number;
  alergen: string[];
  alat: string[];
  flag: string[];
  pendamping: { nasi: boolean; lauk: string | null };
  grade: number;
}

export interface Substitusi {
  id: string;
  sumber: string;
  hilang: { nama: string; jumlah: number; satuan: string };
  pengganti: {
    komponen: { nama: string; jumlah: number; satuan: string; kodeGrade: KodeGrade }[];
    alergen: string[];
    tambahMenit: number;
  }[];
}

export interface Bank {
  versiBank: string;
  versiSkema: string;
  resep: ResepBank[];
  substitusi: Substitusi[];
}

export interface HargaBahan {
  satuan: string;
  per: number;
  harga: number;
}
export type TabelHarga = Record<string, HargaBahan>;

export interface Profil {
  alergi: string[];
  pantangan: string[];
  budgetPerMakan: number;
  levelPedas: number;
  alatMasak: string[];
}

export interface ItemStok {
  nama: string;
  jumlah: number;
  satuan: string;
  kodeGrade: KodeGrade;
  kedaluwarsaHari: number | null;
}

export interface ItemBelanja {
  nama: string;
  jumlah: number;
  satuan: string;
  rupiah: number;
}

export interface Rekomendasi {
  kode: string;
  id: string;
  kelompok: string;
  menit: number;
  skorTotal: number;
  skorSerapan: number;
  skorKecocokanStok: number;
  skorBudget: number;
  skorWaktu: number;
  belanjaTambahanRp: number;
  belanjaTambahan: ItemBelanja[];
  bahanTerskala: { nama: string; jumlah: number; satuan: string }[];
  estimasiBiaya: number;
}

export interface HasilRekomendasi {
  galat: 'JIWA_DI_LUAR_RENTANG' | null;
  modeTanpaStok: boolean;
  rekomendasi: Rekomendasi[];
}

// Faktor skala (persen): [bahan, bumbu, air]. 7 jiwa = ASUMSI (interpolasi, fixtures F2).
export const FAKTOR_PORSI: Record<number, readonly [number, number, number]> = {
  1: [30, 35, 35],
  2: [55, 60, 60],
  3: [80, 80, 85],
  4: [100, 100, 100],
  5: [125, 115, 120],
  6: [150, 130, 140],
  7: [175, 145, 160],
  8: [200, 160, 180]
};
export const KELIPATAN: Record<string, number> = { sayur: 50, telur: 2, santan: 200 };
const FAKTOR_BUMBU = new Set(['bumbu']);
const FAKTOR_AIR = new Set(['cair', 'santan']);
export const BAHAN_DAPUR_POKOK = ['air', 'garam', 'gula', 'merica', 'minyak goreng'];

const MAKS_REKOMENDASI = 5;
const MAKS_PER_KELOMPOK = 2;
const BATAS_CABAI_GRAM = 50;
const BOBOT_SERAPAN = 50;
const BOBOT_KECOCOKAN = 25;
const BONUS_G2S = 5;
const HARI_BONUS_MAKS = 2;
const ARAH_SKOR = 10000;

const ceilDiv = (a: number, b: number): number => Math.ceil(a / b);
const bulatSetengahNaik = (pembilang: number, penyebut: number): number =>
  Math.floor((2 * pembilang + penyebut) / (2 * penyebut));
const kunciSkor = (skor: number): number => Math.floor(skor * ARAH_SKOR + 0.5);
const adalahG2 = (k: string): boolean => k.startsWith('G2-');
const irisan = (a: Iterable<string>, b: string[]): boolean => {
  const h = new Set(b);
  for (const x of a) if (h.has(x)) return true;
  return false;
};
const bandingString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** PorsiScaler.skala untuk satu bahan. */
export function skalaJumlah(jumlah: number, jenis: string, jiwa: number): number {
  const [bahan, bumbu, air] = FAKTOR_PORSI[jiwa];
  const persen = FAKTOR_BUMBU.has(jenis) ? bumbu : FAKTOR_AIR.has(jenis) ? air : bahan;
  const k = KELIPATAN[jenis] ?? 1;
  return ceilDiv(jumlah * persen, 100 * k) * k;
}

function bahanEfektif(
  resep: ResepBank,
  profil: Profil,
  penggantiAyam: Substitusi
): { bahan: BahanResep[]; alergen: Set<string> } | null {
  let bahan = resep.bahan.map((b) => ({ ...b }));
  const alergen = new Set(resep.alergen);
  if (profil.pantangan.includes('vegetarian-nabati') && resep.flag.includes('mengandung-daging')) {
    if (!resep.flag.includes('varian-nabati')) return null;
    const ayam = bahan.find((b) => b.nama === 'ayam');
    if (!ayam) return null;
    const alt = penggantiAyam.pengganti.find((p) => !irisan(p.alergen, profil.alergi));
    if (!alt) return null;
    const komponen: BahanResep[] = alt.komponen.map((k) => ({
      nama: k.nama,
      jumlah: bulatSetengahNaik(ayam.jumlah * k.jumlah, 100),
      satuan: k.satuan,
      kodeGrade: k.kodeGrade,
      jenis: k.nama === 'telur' ? 'telur' : 'protein'
    }));
    const idx = bahan.indexOf(ayam);
    bahan = [...bahan.slice(0, idx), ...komponen, ...bahan.slice(idx + 1)];
    for (const a of alt.alergen) alergen.add(a);
  }
  return { bahan, alergen };
}

function lolosFilter(
  resep: ResepBank,
  profil: Profil,
  alergen: Set<string>,
  bahan: BahanResep[],
  waktuMaks: number
): boolean {
  if (irisan(alergen, profil.alergi)) return false;
  if (profil.pantangan.includes('tanpa-santan') && resep.flag.includes('mengandung-santan')) return false;
  if (profil.pantangan.includes('lunak-lansia') && !resep.flag.includes('lunak-lansia')) return false;
  if (!resep.alat.every((a) => profil.alatMasak.includes(a))) return false;
  if (resep.menit > waktuMaks) return false;
  const cabai = bahan.filter((b) => b.nama.startsWith('cabai')).reduce((t, b) => t + b.jumlah, 0);
  if (cabai > BATAS_CABAI_GRAM && profil.levelPedas < 2) return false;
  return true;
}

function gabungStok(stok: ItemStok[]): Map<string, ItemStok> {
  const hasil = new Map<string, ItemStok>();
  for (const s of stok) {
    const h = hasil.get(s.nama);
    if (!h) {
      hasil.set(s.nama, { ...s });
      continue;
    }
    h.jumlah += s.jumlah;
    if (s.kedaluwarsaHari !== null) {
      h.kedaluwarsaHari =
        h.kedaluwarsaHari === null ? s.kedaluwarsaHari : Math.min(h.kedaluwarsaHari, s.kedaluwarsaHari);
    }
  }
  return hasil;
}

export class Mesin {
  private readonly penggantiAyam: Substitusi;

  constructor(
    private readonly bank: Bank,
    private readonly harga: TabelHarga
  ) {
    const p = bank.substitusi.find((s) => s.hilang.nama === 'ayam');
    if (!p) throw new Error('Bank tanpa substitusi ayam (BR-103)');
    this.penggantiAyam = p;
  }

  private hargaBahan(nama: string, jumlah: number): number {
    const e = this.harga[nama];
    if (!e) throw new Error(`Harga bahan tidak ada: ${nama}`);
    return bulatSetengahNaik(jumlah * e.harga, e.per);
  }

  private hitung(
    resep: ResepBank,
    bahan: BahanResep[],
    profil: Profil,
    stok: Map<string, ItemStok>,
    jiwa: number
  ): Rekomendasi | null {
    const terskala = bahan.map((b) => ({
      nama: b.nama,
      jumlah: skalaJumlah(b.jumlah, b.jenis, jiwa),
      satuan: b.satuan,
      kodeGrade: b.kodeGrade
    }));

    let g2Tersedia = 0;
    for (const s of stok.values()) if (s.satuan === 'gram' && adalahG2(s.kodeGrade)) g2Tersedia += s.jumlah;
    let g2Terpakai = 0;
    let bonus = false;
    let dimiliki = 0;
    let total = 0;
    const belanja: ItemBelanja[] = [];
    for (const b of terskala) {
      const s = stok.get(b.nama);
      const ada = s && s.satuan === b.satuan ? s.jumlah : 0;
      if (BAHAN_DAPUR_POKOK.includes(b.nama)) continue;
      total += 1;
      if (ada >= b.jumlah) dimiliki += 1;
      const kurang = Math.max(0, b.jumlah - ada);
      if (kurang) {
        belanja.push({ nama: b.nama, jumlah: kurang, satuan: b.satuan, rupiah: this.hargaBahan(b.nama, kurang) });
      }
      if (s && adalahG2(b.kodeGrade) && b.satuan === 'gram' && adalahG2(s.kodeGrade) && ada > 0) {
        g2Terpakai += Math.min(b.jumlah, ada);
        if (s.kodeGrade === 'G2-S' && s.kedaluwarsaHari !== null && s.kedaluwarsaHari <= HARI_BONUS_MAKS) {
          bonus = true;
        }
      }
    }

    const belanjaRp = belanja.reduce((t, x) => t + x.rupiah, 0);
    if (belanjaRp > profil.budgetPerMakan) return null; // BR-205

    let serapan = g2Tersedia > 0 ? (BOBOT_SERAPAN * g2Terpakai) / g2Tersedia : 0;
    serapan = Math.min(BOBOT_SERAPAN, serapan + (bonus ? BONUS_G2S : 0));
    const kecocokan = total ? (BOBOT_KECOCOKAN * dimiliki) / total : 0;
    const skorBudget = belanjaRp * 10 <= profil.budgetPerMakan * 6 ? 15 : 8;
    const skorWaktu = resep.menit <= 15 ? 10 : resep.menit <= 30 ? 7 : 4;
    return {
      kode: resep.kode,
      id: resep.id,
      kelompok: resep.kelompok,
      menit: resep.menit,
      skorTotal: serapan + kecocokan + skorBudget + skorWaktu,
      skorSerapan: serapan,
      skorKecocokanStok: kecocokan,
      skorBudget,
      skorWaktu,
      belanjaTambahanRp: belanjaRp,
      belanjaTambahan: belanja,
      bahanTerskala: terskala.map(({ nama, jumlah, satuan }) => ({ nama, jumlah, satuan })),
      estimasiBiaya: resep.estimasiBiaya
    };
  }

  rekomendasikan(profil: Profil, stok: ItemStok[], jiwa: number, waktuMaks = 30): HasilRekomendasi {
    if (!Number.isInteger(jiwa) || !(jiwa in FAKTOR_PORSI)) {
      return { galat: 'JIWA_DI_LUAR_RENTANG', modeTanpaStok: false, rekomendasi: [] };
    }
    const gabung = gabungStok(stok);
    const kandidat: Rekomendasi[] = [];
    for (const resep of this.bank.resep) {
      const efektif = bahanEfektif(resep, profil, this.penggantiAyam);
      if (!efektif) continue;
      if (!lolosFilter(resep, profil, efektif.alergen, efektif.bahan, waktuMaks)) continue;
      const h = this.hitung(resep, efektif.bahan, profil, gabung, jiwa);
      if (h) kandidat.push(h);
    }

    if (stok.length === 0) {
      kandidat.sort(
        (a, b) => a.estimasiBiaya - b.estimasiBiaya || a.menit - b.menit || bandingString(a.kode, b.kode)
      );
      const pilihan = kandidat.slice(0, MAKS_REKOMENDASI).map((r) => ({
        ...r,
        skorTotal: 0,
        skorSerapan: 0,
        skorKecocokanStok: 0,
        skorBudget: 0,
        skorWaktu: 0
      }));
      return { galat: null, modeTanpaStok: true, rekomendasi: pilihan };
    }

    kandidat.sort(
      (a, b) =>
        kunciSkor(b.skorTotal) - kunciSkor(a.skorTotal) ||
        a.menit - b.menit ||
        a.belanjaTambahanRp - b.belanjaTambahanRp ||
        bandingString(a.kode, b.kode)
    );
    const pilihan: Rekomendasi[] = [];
    const perKelompok = new Map<string, number>();
    for (const r of kandidat) {
      const n = perKelompok.get(r.kelompok) ?? 0;
      if (n >= MAKS_PER_KELOMPOK) continue;
      perKelompok.set(r.kelompok, n + 1);
      pilihan.push(r);
      if (pilihan.length === MAKS_REKOMENDASI) break;
    }
    return { galat: null, modeTanpaStok: false, rekomendasi: pilihan };
  }
}
