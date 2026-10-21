# ADR-0004 — Uji kontrak konsumen web dengan Pact (JS, V3)

Status: Diterima | Tanggal: 2026-10-22

## Konteks

Web memproksi dua rute ke backend Pawonee (hulu): `PUT /v1/profil/{idKeluarga}` dan `GET /v1/stok` (`src/lib/server/api/hulu.ts`). Kontrak `docs/api/openapi.yaml` di `pawonee-backend-service` adalah sumber kebenaran; backend sudah memverifikasi pact CONTOH (ADR-0003 backend, `scripts/uji-pact.sh`). Tiket PWN-WEB-TEST-PACT (#7) meminta pact konsumen asli. Nomor ADR-0002 dipakai PR #10 (tata kelola cabang) dan ADR-0003 oleh migrasi (PR #11); ADR ini mengambil 0004 agar tidak bentrok.

## Keputusan

1. Pakai `@pact-foundation/pact` **13.2.0** (eksak), spesifikasi **V3**, hanya sebagai devDependency.
2. Uji memanggil handler SvelteKit sungguhan (`PUT profil`, `GET stok`) dengan `PAWONEE_API` diarahkan ke mock server Pact. Pact hanya memuat permintaan yang benar-benar dikirim kode produksi, bukan klien tiruan.
3. Hanya interaksi web-ke-hulu yang masuk kontrak; rute lokal web (`kesehatan`, `resep`, `rekomendasi`) bukan antarmuka ke backend dan tidak termasuk.
4. Berkas kontrak dikomit di `pacts/pawonee-web-pawonee-backend-service.json`; `bun run test:pact` menghapus dan menulis ulang berkas itu. Berkas dibuat dengan `Authorization: Bearer token-contoh` (literal); verifier provider menggantinya dengan token segar.
5. Publikasi ke broker: tidak dilakukan (tanpa layanan eksternal); lihat `docs/testing/pact.md` untuk langkah bila broker disediakan.

## Konsekuensi

- Verifikasi provider tetap di `pawonee-backend-service` (`scripts/uji-pact.sh`); provider state `stok keluarga KEL-0001 tersedia` belum ada di `tests/pact/penangan_state.py` backend sehingga interaksi stok 200 belum dapat diverifikasi (butuh issue/PR backend).
- Cache stok web (60 detik, kunci memuat kredensial) hidup antar uji dalam satu proses; uji memakai token berbeda per skenario untuk menghindari hasil basi.
