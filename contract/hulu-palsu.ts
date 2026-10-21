// Hulu palsu (backend Pawonee tiruan) untuk uji kontrak lokal: menjawab dua rute yang diproksi web
// dengan respons sesuai openapi.yaml. Pakai: bun contract/hulu-palsu.ts <port>
const port = Number(process.argv[2] ?? 28472);
const stok = [
  { namaBahan: 'tempe', gram: 300, kedaluwarsaHari: 5, kodeGrade: 'NON-G2' },
  { namaBahan: 'bawang merah', gram: 100, kedaluwarsaHari: 2, kodeGrade: 'G2-S' }
];
const json = (b: unknown, status = 200) => Response.json(b, { status, headers: { 'X-Kontrak-Versi': 'v1' } });

Bun.serve({
  port,
  hostname: '127.0.0.1',
  async fetch(req) {
    const u = new URL(req.url);
    if (!req.headers.get('authorization') && !req.headers.get('x-device-key') && !req.headers.get('x-service-key')) {
      return json({ kode: 'TIDAK_TEROTENTIKASI', pesan: 'Autentikasi diperlukan.' }, 401);
    }
    if (req.method === 'GET' && u.pathname === '/v1/stok') return json({ data: stok });
    if (req.method === 'PUT' && u.pathname.startsWith('/v1/profil/')) {
      await req.arrayBuffer();
      return json({ data: { tersimpan: true } });
    }
    return json({ kode: 'KESALAHAN_SERVER', pesan: 'rute tidak ada di hulu palsu' }, 404);
  }
});
