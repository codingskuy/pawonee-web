# ADR-0006 — Maestro untuk alur E2E web (mode beta)

Status: Diterima | Tanggal: 2026-10-22

## Konteks

Tiket PWN-WEB-TEST-MAESTRO (#9) meminta alur `.maestro/` untuk web: 1 smoke + 1 alur bisnis utama (bagi resep publik), dengan selector `id`/`data-testid`. Mode web Maestro masih **beta** (CLI mencetak "Web support is in Beta"). Selector memakai kontrak `flow/flow.json` di pawonee-design (PR #6): nilai `id` identik sebagai `testTag` (Compose) dan `data-testid` (web). Nomor: 0002 PR #10, 0003 PR #11, 0004 Pact (PR #15), 0005 Schemathesis (PR #16); ADR ini 0006.

## Keputusan

1. Alur di `.maestro/` (`smoke.yaml`, `bagi-resep-publik.yaml`), dijalankan `.maestro/jalankan.sh` terhadap web hasil `bun run build` (`bun ./build/index.js`), bukan `vite dev`, agar tidak ada reload/optimasi dependensi saat uji.
2. Selector hanya `id:` dengan nilai `data-testid` yang sudah ada di kode (`beranda`, `jiwa`, `mode-hemat`, `item-resep`, `resep-publik`, `buka-aplikasi`, `cetak`); tidak ada perubahan kode produk. Maestro web mencocokkan `id:` ke `data-testid`.
3. Teks yang tersusun dari beberapa node dicocokkan dengan regex (`".*untuk 4 jiwa.*"`), karena Maestro mencocokkan seluruh teks elemen.
4. Alur sengaja hanya memakai rute lokal web (tanpa backend/hulu), sehingga stabil dan tanpa mock. Alur yang bergantung hulu (stok, profil) menunggu siklus 3 (dev-stack).
5. Telemetry mati (`MAESTRO_CLI_NO_ANALYTICS=1`, `E2E_TELEMETRY_DISABLED=1`). CI tidak ditambahkan: butuh Chrome + Maestro; ditunda ke siklus 3.

## Status kestabilan (beta)

- Maestro 2.11.0 + Chrome lokal: dua jalan berturut-turut, dua alur lulus (smoke 25-49 dtk, bagi-resep-publik 9-12 dtk). Smoke lambat karena menunggu mode hemat setelah debounce 300 ms dan rekomendasi pertama.
- Keterbatasan diketahui: `<select>` native (`jiwa`) tidak dapat dioperasikan Maestro web, sehingga ganti jiwa lewat UI tidak diuji (jiwa diuji lewat query `?jiwa=4`); Chrome dipakai bersama proses lain; log memuat `GET /favicon.ico` 404 (web belum punya favicon, tidak memengaruhi hasil).

## Konsekuensi

- Maestro web beta dapat berubah antar versi; versi diuji dicatat di sini dan di `docs/testing/maestro.md`. Bila tidak stabil di CI, alur cukup dijalankan manual.
- `data-testid` pada kode produk tidak boleh diganti nama (kontrak dengan pawonee-design dan app-kmp).
