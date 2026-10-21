import { describe, expect, it } from 'vitest';
import { ambilRekomendasi, urlRekomendasi, type Resep } from './pantryResep';

const contoh: Resep = {
  id: 'R-01',
  nama: 'Tempe tumis bawang',
  bahan: [{ nama: 'tempe' }],
  langkah: ['tumis'],
  menit: 15,
  levelPedas: 1,
  estimasiBiaya: 18000
};

describe('pantryResep', () => {
  it('menyusun URL dengan bahan ter-encode', () => {
    expect(urlRekomendasi('http://x', ['tempe', 'bawang merah'])).toBe(
      'http://x/v1/resep/rekomendasi?bahan=tempe%2Cbawang%20merah'
    );
  });

  it('mengembalikan daftar resep dari backend', async () => {
    const palsu = (async () => new Response(JSON.stringify([contoh]))) as unknown as typeof fetch;
    expect(await ambilRekomendasi(['tempe'], 'http://x', palsu)).toEqual([contoh]);
  });

  it('melempar galat saat backend gagal', async () => {
    const palsu = (async () => new Response('', { status: 503 })) as unknown as typeof fetch;
    await expect(ambilRekomendasi(['tempe'], 'http://x', palsu)).rejects.toThrow('Backend 503');
  });
});
