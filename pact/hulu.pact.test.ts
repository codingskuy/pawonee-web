// Pact konsumen (PWN-WEB-TEST-PACT): kontrak yang DIPAKAI web terhadap backend Pawonee (hulu).
// Web memproksi dua rute ke hulu: PUT /v1/profil/{idKeluarga} dan GET /v1/stok (lihat src/lib/server/api/hulu.ts).
// Uji memanggil handler SvelteKit sungguhan dengan PAWONEE_API diarahkan ke mock server Pact, jadi
// permintaan yang masuk ke hulu persis yang dikirim kode produksi. Berkas keluar: pacts/pawonee-web-pawonee-backend-service.json
import { MatchersV3, PactV3 } from '@pact-foundation/pact';
import { afterEach, describe, expect, it } from 'vitest';
import { PUT as simpanProfil } from '../src/routes/api/v1/profil/[idKeluarga]/+server';
import { GET as bacaStok } from '../src/routes/api/v1/stok/+server';

const { like, regex, eachLike, integer } = MatchersV3;

const KEL = 'KEL-0001';
const BEARER = 'Bearer token-contoh';
// Cache stok web (60 dtk, kunci memuat kredensial) hidup antar uji: token berbeda mencegah hasil uji sebelumnya terpakai.
const BEARER_TANPA_PROFIL = 'Bearer token-contoh-tanpa-profil';
const KODE_GRADE = '^(G2-V|G2-U|G2-S|NON-G2)$';

const profil = {
  idKeluarga: KEL,
  jumlahJiwa: 4,
  alergi: [] as string[],
  pantangan: ['halal-selalu'],
  budgetPerMakan: 35000,
  levelPedas: 1,
  alatMasak: ['kompor', 'wajan', 'panci', 'kukusan']
};

const pact = new PactV3({
  consumer: 'pawonee-web',
  provider: 'pawonee-backend-service',
  dir: 'pacts',
  logLevel: 'warn'
});

const awal = process.env.PAWONEE_API;
afterEach(() => {
  if (awal === undefined) delete process.env.PAWONEE_API;
  else process.env.PAWONEE_API = awal;
});

const panggilProfil = (url: string, headers: Record<string, string>, badan: unknown) => {
  process.env.PAWONEE_API = `${url}/v1`;
  const u = new URL(`/api/v1/profil/${KEL}`, 'http://web.test');
  const request = new Request(u, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(badan)
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (simpanProfil as any)({ request, url: u, params: { idKeluarga: KEL }, fetch }) as Promise<Response>;
};

const panggilStok = (url: string, headers: Record<string, string>) => {
  process.env.PAWONEE_API = `${url}/v1`;
  const u = new URL(`/api/v1/stok?idKeluarga=${KEL}`, 'http://web.test');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (bacaStok as any)({ request: new Request(u, { headers }), url: u, params: {}, fetch }) as Promise<Response>;
};

describe('PUT /v1/profil/{idKeluarga} (hulu)', () => {
  it('menyimpan profil keluarga baru', async () => {
    pact
      .given(`keluarga ${KEL} belum punya profil`)
      .uponReceiving('web meneruskan simpan profil keluarga baru')
      .withRequest({
        method: 'PUT',
        path: `/v1/profil/${KEL}`,
        headers: { 'X-Kontrak-Versi': 'v1', Authorization: BEARER, 'Content-Type': 'application/json' },
        body: profil
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Kontrak-Versi': 'v1' },
        body: { data: { tersimpan: true } }
      });
    await pact.executeTest(async (mock) => {
      const r = await panggilProfil(mock.url, { authorization: BEARER }, profil);
      expect(r.status).toBe(200);
      expect(await r.json()).toEqual({ data: { tersimpan: true } });
    });
  });

  it('meneruskan 401 bila tanpa kredensial', async () => {
    pact
      .uponReceiving('web meneruskan simpan profil tanpa kredensial')
      .withRequest({
        method: 'PUT',
        path: `/v1/profil/${KEL}`,
        headers: { 'X-Kontrak-Versi': 'v1', 'Content-Type': 'application/json' },
        body: profil
      })
      .willRespondWith({
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: { kode: 'TIDAK_TEROTENTIKASI', pesan: like('Autentikasi diperlukan.') }
      });
    await pact.executeTest(async (mock) => {
      const r = await panggilProfil(mock.url, {}, profil);
      expect(r.status).toBe(401);
      expect((await r.json()).kode).toBe('TIDAK_TEROTENTIKASI');
    });
  });
});

describe('GET /v1/stok (hulu)', () => {
  it('membaca stok keluarga', async () => {
    pact
      .given(`stok keluarga ${KEL} tersedia`)
      .uponReceiving('web memproksi baca stok keluarga')
      .withRequest({
        method: 'GET',
        path: '/v1/stok',
        query: { idKeluarga: KEL },
        headers: { 'X-Kontrak-Versi': 'v1', Authorization: BEARER }
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          data: eachLike({
            namaBahan: like('tempe'),
            gram: integer(300),
            kedaluwarsaHari: integer(5),
            kodeGrade: regex(KODE_GRADE, 'NON-G2')
          })
        }
      });
    await pact.executeTest(async (mock) => {
      const r = await panggilStok(mock.url, { authorization: BEARER });
      expect(r.status).toBe(200);
      const b = await r.json();
      expect(b.data[0]).toMatchObject({ namaBahan: 'tempe', gram: 300, kedaluwarsaHari: 5, kodeGrade: 'NON-G2' });
    });
  });

  it('meneruskan 404 PROFIL_TIDAK_ADA', async () => {
    pact
      .given(`keluarga ${KEL} belum punya profil`)
      .uponReceiving('web memproksi baca stok keluarga tanpa profil')
      .withRequest({
        method: 'GET',
        path: '/v1/stok',
        query: { idKeluarga: KEL },
        headers: { 'X-Kontrak-Versi': 'v1', Authorization: BEARER_TANPA_PROFIL }
      })
      .willRespondWith({
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        body: { kode: 'PROFIL_TIDAK_ADA', pesan: like('Profil keluarga belum ada.') }
      });
    await pact.executeTest(async (mock) => {
      const r = await panggilStok(mock.url, { authorization: BEARER_TANPA_PROFIL });
      expect(r.status).toBe(404);
      expect((await r.json()).kode).toBe('PROFIL_TIDAK_ADA');
    });
  });
});
