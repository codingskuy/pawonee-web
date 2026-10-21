import { describe, expect, it } from 'vitest';
import { GET as kesehatan } from '../../../routes/api/v1/kesehatan/+server';
import { GET as daftar } from '../../../routes/api/v1/resep/+server';
import { GET as detail } from '../../../routes/api/v1/resep/[id]/+server';
import { POST as rekomendasi } from '../../../routes/api/v1/rekomendasi/+server';
import { GET as stok } from '../../../routes/api/v1/stok/+server';
import { PUT as profil } from '../../../routes/api/v1/profil/[idKeluarga]/+server';
import { handle } from '../../../hooks.server';
import { BatasLaju } from './batasLaju';
import { KODE_GALAT, ORIGIN_DIIZINKAN } from './skema';

// Pembantu: panggil handler dengan event minimal.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const panggil = (h: any, url: string, init: RequestInit = {}, params: Record<string, string> = {}, fetchPalsu?: typeof fetch) => {
  const u = new URL(url, 'http://web.test');
  return h({ request: new Request(u, init), url: u, params, fetch: fetchPalsu ?? fetch }) as Promise<Response> | Response;
};

const profilOk = {
  idKeluarga: 'KEL-0001',
  jumlahJiwa: 4,
  alergi: [],
  pantangan: [],
  budgetPerMakan: 35000,
  levelPedas: 3,
  alatMasak: ['kompor', 'wajan', 'panci', 'kukusan', 'blender']
};
const stokOk = [
  { namaBahan: 'tempe', gram: 300, kedaluwarsaHari: 5, kodeGrade: 'NON-G2' },
  { namaBahan: 'bawang merah', gram: 100, kedaluwarsaHari: 5, kodeGrade: 'G2-U' },
  { namaBahan: 'cabai merah', gram: 20, kedaluwarsaHari: 5, kodeGrade: 'G2-V' },
  { namaBahan: 'tomat', gram: 200, kedaluwarsaHari: 5, kodeGrade: 'G2-V' },
  { namaBahan: 'kecap manis', gram: 30, kedaluwarsaHari: 90, kodeGrade: 'NON-G2' }
];
const json = (b: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(b)
});

describe('GET /kesehatan', () => {
  it('status baik + versi kontrak v1', async () => {
    const r = await panggil(kesehatan, '/api/v1/kesehatan');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ status: 'baik', kontrakVersi: 'v1' });
  });
});

describe('GET /resep', () => {
  it('mengembalikan 12 resep, cache 7 hari', async () => {
    const r = await panggil(daftar, '/api/v1/resep');
    const b = await r.json();
    expect(b.data).toHaveLength(12);
    expect(b.data[0]).toMatchObject({ id: 'R-01', kelompok: 'tumis', waktuMenit: 15 });
    expect(r.headers.get('cache-control')).toBe('public, max-age=604800');
  });
  it('menolak X-Kontrak-Versi selain v1', async () => {
    const r = await panggil(daftar, '/api/v1/resep', { headers: { 'x-kontrak-versi': 'v9' } });
    expect(r.status).toBe(400);
    expect((await r.json()).kode).toBe('VALIDASI_GAGAL');
  });
});

describe('GET /resep/[id]', () => {
  it('terskala per jiwa (R-01, 2 jiwa: tempe 55% = 165 g)', async () => {
    const r = await panggil(detail, '/api/v1/resep/R-01?jiwa=2', {}, { id: 'R-01' });
    const b = await r.json();
    expect(r.status).toBe(200);
    expect(b.data.resep.id).toBe('R-01');
    expect(b.data.bahanTerskala.find((x: { namaBahan: string }) => x.namaBahan === 'tempe').gram).toBe(165);
  });
  it('jiwa bawaan 4', async () => {
    const b = await (await panggil(detail, '/api/v1/resep/R-01', {}, { id: 'R-01' })).json();
    expect(b.data.bahanTerskala.find((x: { namaBahan: string }) => x.namaBahan === 'tempe').gram).toBe(300);
  });
  it.each(['0', '9'])('jiwa %s -> 422 JIWA_DI_LUAR_RENTANG', async (j) => {
    const r = await panggil(detail, `/api/v1/resep/R-01?jiwa=${j}`, {}, { id: 'R-01' });
    expect(r.status).toBe(422);
    expect((await r.json()).kode).toBe('JIWA_DI_LUAR_RENTANG');
  });
  it('jiwa bukan angka -> 400', async () => {
    const r = await panggil(detail, '/api/v1/resep/R-01?jiwa=abc', {}, { id: 'R-01' });
    expect(r.status).toBe(400);
  });
  it('R-99 -> 404 RESEP_TIDAK_ADA; id salah bentuk -> 400', async () => {
    const r = await panggil(detail, '/api/v1/resep/R-99', {}, { id: 'R-99' });
    expect(r.status).toBe(404);
    expect((await r.json()).kode).toBe('RESEP_TIDAK_ADA');
    expect((await panggil(detail, '/api/v1/resep/xx', {}, { id: 'xx' })).status).toBe(400);
  });
});

describe('POST /rekomendasi', () => {
  it('stok tepat R-01 menghasilkan R-01 peringkat 1 (skor 100)', async () => {
    const r = await panggil(rekomendasi, '/api/v1/rekomendasi', json({ profil: profilOk, stok: stokOk, jiwa: 4, waktuMaksimalMenit: 45 }));
    const b = await r.json();
    expect(r.status).toBe(200);
    expect(b.modeTanpaStok).toBe(false);
    expect(b.data.length).toBeLessThanOrEqual(5);
    expect(b.data[0].resep.id).toBe('R-01');
    expect(b.data[0].skorTotal).toBeCloseTo(100, 2);
    expect(b.data[0].alasan).toMatch(/\. /);
  });
  it('stok kosong -> modeTanpaStok true', async () => {
    const b = await (await panggil(rekomendasi, '/api/v1/rekomendasi', json({ profil: profilOk, stok: [], jiwa: 4, waktuMaksimalMenit: 45 }))).json();
    expect(b.modeTanpaStok).toBe(true);
    expect(b.data).toHaveLength(5);
  });
  it('waktuMaksimalMenit bawaan 30', async () => {
    const r = await panggil(rekomendasi, '/api/v1/rekomendasi', json({ profil: profilOk, stok: stokOk, jiwa: 4 }));
    expect(r.status).toBe(200);
  });
  it.each([0, 9])('jiwa %i -> 422', async (jiwa) => {
    const r = await panggil(rekomendasi, '/api/v1/rekomendasi', json({ profil: profilOk, stok: stokOk, jiwa, waktuMaksimalMenit: 30 }));
    expect(r.status).toBe(422);
    expect((await r.json()).kode).toBe('JIWA_DI_LUAR_RENTANG');
  });
  it.each([9, 46])('waktuMaksimalMenit %i -> 400 VALIDASI_GAGAL dengan rinci', async (w) => {
    const r = await panggil(rekomendasi, '/api/v1/rekomendasi', json({ profil: profilOk, stok: stokOk, jiwa: 4, waktuMaksimalMenit: w }));
    const b = await r.json();
    expect(r.status).toBe(400);
    expect(b.kode).toBe('VALIDASI_GAGAL');
    expect(b.rinci[0].bidang).toBe('waktuMaksimalMenit');
  });
  it('gram negatif dan kodeGrade tak dikenal -> 400', async () => {
    const buruk = [{ ...stokOk[0], gram: -1 }, { ...stokOk[1], kodeGrade: 'G9' }];
    const r = await panggil(rekomendasi, '/api/v1/rekomendasi', json({ profil: profilOk, stok: buruk, jiwa: 4, waktuMaksimalMenit: 30 }));
    const b = await r.json();
    expect(r.status).toBe(400);
    expect(b.rinci.map((x: { bidang: string }) => x.bidang)).toEqual(['stok.0.gram', 'stok.1.kodeGrade']);
  });
  it('badan bukan JSON -> 400', async () => {
    const r = await panggil(rekomendasi, '/api/v1/rekomendasi', { method: 'POST', body: 'bukan json' });
    expect(r.status).toBe(400);
  });
});

describe('GET /stok', () => {
  const hulu = (res: Response | Error) => (async () => { if (res instanceof Error) throw res; return res; }) as unknown as typeof fetch;
  it('meneruskan ke hulu dan memvalidasi bentuk StokItem', async () => {
    let dipanggil = '';
    let auth: string | null = null;
    const f = (async (u: string, init?: RequestInit) => {
      dipanggil = u;
      auth = new Headers(init?.headers).get('authorization');
      return Response.json({ data: stokOk });
    }) as unknown as typeof fetch;
    const r = await panggil(stok, '/api/v1/stok?idKeluarga=KEL-0001', { headers: { authorization: 'Bearer t' } }, {}, f);
    expect(r.status).toBe(200);
    expect((await r.json()).data).toHaveLength(5);
    expect(dipanggil).toContain('/stok?idKeluarga=KEL-0001');
    expect(auth).toBe('Bearer t');
  });
  it('idKeluarga hilang -> 400', async () => {
    expect((await panggil(stok, '/api/v1/stok')).status).toBe(400);
  });
  it('hulu mati -> 502 JARINGAN_GAGAL', async () => {
    const r = await panggil(stok, '/api/v1/stok?idKeluarga=KEL-0001', {}, {}, hulu(new Error('putus')));
    expect(r.status).toBe(502);
    expect((await r.json()).kode).toBe('JARINGAN_GAGAL');
  });
  it('galat AppError hulu diteruskan (PROFIL_TIDAK_ADA 404)', async () => {
    const r = await panggil(stok, '/api/v1/stok?idKeluarga=KEL-0001', {}, {}, hulu(Response.json({ kode: 'PROFIL_TIDAK_ADA', pesan: 'x' }, { status: 404 })));
    expect(r.status).toBe(404);
    expect((await r.json()).kode).toBe('PROFIL_TIDAK_ADA');
  });
});

describe('PUT /profil/[idKeluarga]', () => {
  const put = (b: unknown, id = 'KEL-0001', f?: typeof fetch) =>
    panggil(profil, `/api/v1/profil/${id}`, { ...json(b), method: 'PUT' }, { idKeluarga: id }, f);
  const hulu200 = (async () => Response.json({ data: { tersimpan: true } })) as unknown as typeof fetch;
  it('valid -> tersimpan true', async () => {
    const r = await put(profilOk, 'KEL-0001', hulu200);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ data: { tersimpan: true } });
  });
  it('jumlahJiwa 9 -> 422; levelPedas 4 -> 400; id beda dengan path -> 400', async () => {
    expect((await put({ ...profilOk, jumlahJiwa: 9 })).status).toBe(422);
    expect((await put({ ...profilOk, levelPedas: 4 })).status).toBe(400);
    expect((await put({ ...profilOk, idKeluarga: 'KEL-0002' })).status).toBe(400);
  });
  it('konflik versi dari hulu diteruskan (409)', async () => {
    const r = await put(profilOk, 'KEL-0001', (async () => Response.json({ kode: 'KONFLIK', pesan: 'lama' }, { status: 409 })) as unknown as typeof fetch);
    expect(r.status).toBe(409);
  });
});

describe('galat baku', () => {
  it('kode galat mencakup tujuh kode wajib', () => {
    for (const k of ['STOK_KOSONG', 'PROFIL_TIDAK_ADA', 'JARINGAN_GAGAL', 'RESEP_TIDAK_ADA', 'JIWA_DI_LUAR_RENTANG', 'VALIDASI_GAGAL', 'BATAS_LAJU']) {
      expect(KODE_GALAT).toContain(k);
    }
  });
});

describe('BatasLaju', () => {
  it('30 permintaan per menit per kunci, lalu reset', () => {
    let t = 0;
    const b = new BatasLaju(30, () => t);
    for (let i = 0; i < 30; i++) expect(b.izinkan('a')).toBe(true);
    expect(b.izinkan('a')).toBe(false);
    expect(b.izinkan('b')).toBe(true);
    t = 60_000;
    expect(b.izinkan('a')).toBe(true);
  });
});

describe('hooks: CORS + batas laju', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jalankan = (method: string, origin: string | null, ip = '1.1.1.1', path = '/api/v1/kesehatan') => {
    const u = new URL(path, 'http://web.test');
    const headers = new Headers();
    if (origin) headers.set('origin', origin);
    const event = { request: new Request(u, { method, headers }), url: u, getClientAddress: () => ip };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (handle as any)({ event, resolve: async () => Response.json({ ok: true }) }) as Promise<Response>;
  };
  it('preflight dari origin resmi diizinkan', async () => {
    const r = await jalankan('OPTIONS', ORIGIN_DIIZINKAN);
    expect(r.status).toBe(204);
    expect(r.headers.get('access-control-allow-origin')).toBe(ORIGIN_DIIZINKAN);
    expect(r.headers.get('access-control-allow-methods')).toContain('PUT');
  });
  it('origin lain tidak mendapat header izin', async () => {
    const r = await jalankan('GET', 'https://evil.example', '2.2.2.2');
    expect(r.headers.get('access-control-allow-origin')).toBeNull();
    const p = await jalankan('OPTIONS', 'https://evil.example');
    expect(p.headers.get('access-control-allow-origin')).toBeNull();
  });
  it('origin resmi mendapat header izin pada GET', async () => {
    const r = await jalankan('GET', ORIGIN_DIIZINKAN, '3.3.3.3');
    expect(r.headers.get('access-control-allow-origin')).toBe(ORIGIN_DIIZINKAN);
  });
  it('permintaan ke-31 -> 429 BATAS_LAJU dengan retrySetelahDetik 60', async () => {
    for (let i = 0; i < 30; i++) expect((await jalankan('GET', null, '9.9.9.9')).status).toBe(200);
    const r = await jalankan('GET', null, '9.9.9.9');
    expect(r.status).toBe(429);
    expect(await r.json()).toMatchObject({ kode: 'BATAS_LAJU', retrySetelahDetik: 60 });
  });
  it('rute non-API tidak dibatasi', async () => {
    for (let i = 0; i < 40; i++) expect((await jalankan('GET', null, '8.8.8.8', '/')).status).toBe(200);
  });
});
