# ADR-0005 — Schemathesis untuk rute /api/v1 web

Status: Diterima | Tanggal: 2026-10-22

## Konteks

Backend `pawonee-backend-service` sudah menguji server Rust-nya dengan Schemathesis (ADR-0002 di repo itu, PR #11), tetapi web menyajikan sendiri enam rute `/api/v1` (PWN-WEB-003) yang mengaku mengikuti kontrak yang sama dan tidak tercakup uji backend. Tiket PWN-WEB-TEST-SCHEMATHESIS (#8). Nomor ADR-0002 dipakai PR #10, 0003 PR #11 (migrasi), 0004 uji Pact; ADR ini 0005.

## Keputusan

1. **Schemathesis 4.32.2** (sama dengan backend; `contract/requirements.txt`, venv `.venv-schemathesis/`), fase examples, coverage, fuzzing, stateful, `--checks all`, telemetry mati.
2. Spec tidak disalin: `contract/schemathesis.sh` memakai `SPEC` (jalur/URL) atau mengunduh `docs/api/openapi.yaml` dari `SPEC_REF` di repo backend.
3. Skrip menyalakan web hasil `bun run build` + **hulu palsu** (`contract/hulu-palsu.ts`, Bun) agar `stok` dan `profil` teruji tanpa backend/Postgres; `BASE_URL` diatur = uji server yang sudah berjalan (mis. backend nyata di belakang web).
4. Cakupan dibatasi 5 jalur web (`kesehatan`, `resep`, `rekomendasi`, `stok`, `profil`); `/auth/*` dan `/riwayat-masak` milik backend. Pemeriksaan `ignored_auth` dikecualikan: `resep`/`rekomendasi` sengaja publik (halaman bagi), stok/profil diautentikasi hulu.
5. `contract/hooks.py`: Bearer acak per permintaan (pembatas laju web 30/menit per token) dan `idKeluarga` badan disamakan dengan path pada `PUT /profil`.
6. CI hanya manual (`.github/workflows/schemathesis.yml`, `workflow_dispatch`).

## Temuan (belum diperbaiki; ditandai untuk siklus 3)

| Temuan | Bukti |
|---|---|
| `GET /kesehatan` menerima `X-Kontrak-Versi` selain `v1` (200); spec backend mendokumentasikan 400 | ST201 |
| `null` pada `versiProfil`/`komposisi`/`sumberBelanja` ditolak 400 (`PUT /profil`, `POST /rekomendasi`); spec backend menyatakan `null` setara dihilangkan | ST202 |
| `POST /rekomendasi` tanpa `Authorization` dijawab 200, sedangkan spec mewajibkan bearer | ST201/ST203 (keputusan produk: publik atau berotentikasi) |

## Konsekuensi

- Hasil mengikuti spec pada `SPEC_REF`; pengetatan spec di backend (PR #11) otomatis ikut terukur.
- Hulu palsu hanya memverifikasi perilaku web, bukan backend; verifikasi lintas-repo nyata menjadi siklus 3.
