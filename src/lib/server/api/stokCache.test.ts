import { describe, expect, it } from 'vitest';
import { GET as stok } from '../../../routes/api/v1/stok/+server';
import { CacheStok, TTL_STOK_MS } from './stokCache';

const item = { namaBahan: 'bayam', gram: 400, kedaluwarsaHari: 1, kodeGrade: 'G2-S' as const };

describe('CacheStok', () => {
  it('TTL 60 detik: panggilan kedua dalam TTL tidak memanggil hulu', async () => {
    let t = 0;
    let n = 0;
    const c = new CacheStok(TTL_STOK_MS, () => t);
    const muat = async () => (n++, [item]);
    expect((await c.ambil('k', muat)).usang).toBe(false);
    t = 59_999;
    await c.ambil('k', muat);
    expect(n).toBe(1);
    t = 60_000;
    await c.ambil('k', muat);
    expect(n).toBe(2);
  });
  it('hulu mati dan ada data lama -> usang true', async () => {
    let t = 0;
    const c = new CacheStok(TTL_STOK_MS, () => t);
    await c.ambil('k', async () => [item]);
    t = 120_000;
    const h = await c.ambil('k', async () => {
      throw new Error('mati');
    });
    expect(h).toEqual({ data: [item], usang: true });
  });
  it('hulu mati tanpa data lama -> galat dilempar', async () => {
    const c = new CacheStok();
    await expect(c.ambil('k', async () => { throw new Error('mati'); })).rejects.toThrow('mati');
  });
  it('kunci berbeda per kredensial', () => {
    expect(CacheStok.kunci('KEL-0001', 'a')).not.toBe(CacheStok.kunci('KEL-0001', 'b'));
  });
});

describe('GET /api/v1/stok dengan cache', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const panggil = (id: string, f: typeof fetch, auth: string) => (stok as any)({
    request: new Request(`http://web.test/api/v1/stok?idKeluarga=${id}`, { headers: { authorization: auth } }),
    url: new URL(`http://web.test/api/v1/stok?idKeluarga=${id}`),
    fetch: f
  }) as Promise<Response>;

  it('cache segar tanpa header usang; hulu 500 setelah kadaluarsa tidak ada -> pakai cache segar', async () => {
    let n = 0;
    const ok = (async () => (n++, Response.json({ data: [item] }))) as unknown as typeof fetch;
    const r1 = await panggil('KEL-0101', ok, 'Bearer a');
    expect(r1.headers.get('x-data-usang')).toBeNull();
    await panggil('KEL-0101', ok, 'Bearer a');
    expect(n).toBe(1);
  });
  it('hulu mati tanpa cache -> 502 JARINGAN_GAGAL tanpa X-Data-Usang', async () => {
    const mati = (async () => { throw new Error('putus'); }) as unknown as typeof fetch;
    const r = await panggil('KEL-0102', mati, 'Bearer a');
    expect(r.status).toBe(502);
    expect((await r.json()).kode).toBe('JARINGAN_GAGAL');
    expect(r.headers.get('x-data-usang')).toBeNull();
  });
  it('4xx hulu diteruskan, bukan dianggap usang', async () => {
    const f = (async () => Response.json({ kode: 'TIDAK_TEROTENTIKASI', pesan: 'x' }, { status: 401 })) as unknown as typeof fetch;
    const r = await panggil('KEL-0103', f, 'Bearer a');
    expect(r.status).toBe(401);
  });
  it('kredensial beda tidak berbagi cache', async () => {
    let n = 0;
    const ok = (async () => (n++, Response.json({ data: [item] }))) as unknown as typeof fetch;
    await panggil('KEL-0104', ok, 'Bearer a');
    await panggil('KEL-0104', ok, 'Bearer b');
    expect(n).toBe(2);
  });
});
