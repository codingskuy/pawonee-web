# Uji properti Schemathesis (rute web)

Tiket PWN-WEB-TEST-SCHEMATHESIS. Keputusan: `docs/decisions/ADR-0005-schemathesis-rute-web.md`.

## Menjalankan

```sh
# spec dari backend (bawaan: ref main; sebelum PR backend merge, pakai SPEC lokal atau SPEC_REF=<branch>)
contract/schemathesis.sh
SPEC=/jalur/openapi.yaml MAKS_CONTOH=50 contract/schemathesis.sh
BASE_URL=https://host/api/v1 SPEC=/jalur/openapi.yaml contract/schemathesis.sh   # server sudah jalan
```

Prasyarat: Python 3.10+, bun, curl. Laporan JUnit dan log di `contract/laporan/` (diabaikan git). CI manual: Actions > "Schemathesis (manual)".

## Hasil jalan lokal (22 Okt 2026)

Spec: `docs/api/openapi.yaml` dari branch backend `test/pwn-be-test-schemathesis` (spec yang sudah diperketat). 6 operasi diuji, 503 kasus, 5 kegagalan unik, 10,6 dtk. Kegagalan adalah temuan nyata (tabel di ADR-0005), bukan galat alat:

- `GET /kesehatan` menerima `X-Kontrak-Versi: AAA` (ST201).
- `null` pada properti opsional ditolak 400 di `PUT /profil` dan `POST /rekomendasi` (ST202).
- `POST /rekomendasi` tanpa `Authorization` dijawab 200 (ST201, ST203).

Putaran pertama (tanpa pembatasan jalur) juga menandai `/auth/*` dan `/riwayat-masak` (404 di web); itu di luar cakupan web sehingga disaring lewat `--include-path-regex`.
