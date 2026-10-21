import { describe, expect, it, vi } from 'vitest';
import { debounce } from './debounce';
import { KUNCI_RIWAYAT, MAKS_RIWAYAT, bacaRiwayat, simpanRiwayat, tambahMasakan, type Masakan } from './riwayat';
import { load as muatResep } from '../routes/resep/[id]/+page.server';

describe('debounce 300 ms', () => {
  it('hanya panggilan terakhir yang dijalankan setelah 300 ms', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 300);
    d(1);
    vi.advanceTimersByTime(200);
    d(2);
    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(2);
    vi.useRealTimers();
  });
  it('batal menghentikan panggilan tertunda', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 300);
    d();
    d.batal();
    vi.advanceTimersByTime(1000);
    expect(fn).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('riwayat 30 masakan', () => {
  const m = (i: number): Masakan => ({ id: 'R-01', nama: `m${i}`, jiwa: 4, tanggal: new Date(i * 1000).toISOString() });
  it('menahan paling banyak 30 dan yang terbaru di depan', () => {
    let d: Masakan[] = [];
    for (let i = 0; i < 45; i++) d = tambahMasakan(d, m(i));
    expect(d).toHaveLength(MAKS_RIWAYAT);
    expect(d[0].nama).toBe('m44');
    expect(d[29].nama).toBe('m15');
  });
  it('simpan lalu baca; data rusak diabaikan', () => {
    const peta = new Map<string, string>();
    const s = { getItem: (k: string) => peta.get(k) ?? null, setItem: (k: string, v: string) => void peta.set(k, v) };
    simpanRiwayat(s, [m(1), m(2)]);
    expect(bacaRiwayat(s)).toHaveLength(2);
    peta.set(KUNCI_RIWAYAT, '{bukan json');
    expect(bacaRiwayat(s)).toEqual([]);
    peta.set(KUNCI_RIWAYAT, JSON.stringify([{ id: 1 }, m(3)]));
    expect(bacaRiwayat(s)).toHaveLength(1);
  });
});

describe('halaman publik /resep/[id]', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const muat = (id: string, q = '') => (muatResep as any)({ params: { id }, url: new URL(`http://web.test/resep/${id}${q}`) });
  it('tanpa login: memuat resep terskala sesuai ?jiwa=4', () => {
    const d = muat('R-01', '?jiwa=4');
    expect(d.jiwa).toBe(4);
    expect(d.resep.id).toBe('R-01');
    expect(d.bahanTerskala.find((b: { namaBahan: string }) => b.namaBahan === 'tempe').gram).toBe(300);
  });
  it('jiwa 2 diskala; jiwa tidak sah jatuh ke 4', () => {
    expect(muat('R-01', '?jiwa=2').bahanTerskala[0].gram).toBe(165);
    expect(muat('R-01', '?jiwa=99').jiwa).toBe(4);
    expect(muat('R-01', '?jiwa=abc').jiwa).toBe(4);
  });
  it('resep tidak ada -> 404', () => {
    expect(() => muat('R-99')).toThrow();
    try { muat('R-99'); } catch (e) { expect((e as { status: number }).status).toBe(404); }
  });
});
