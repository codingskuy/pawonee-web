# ADR-0003 — Eksekusi migrasi ke Bun + Svelte 5 + SvelteKit 2

Status: Diterima | Tanggal: 2026-10-21

## Konteks

ADR-0001 mewajibkan migrasi Next.js 15 ke Bun + Svelte 5 + SvelteKit 2 (tiket PWN-WEB-005, issue #5). Syarat mulai ("kontrak dibekukan, fase coding disetujui TownHall", M-008) dinyatakan terpenuhi oleh pemilik proyek yang menugaskan migrasi ini; bukti persetujuan formal di TownHall perlu ditautkan oleh peninjau. Format mengikuti ADR-0001.

## Keputusan

1. Rute Next `src/app/` diganti rute SvelteKit `src/routes/`; `next.config.mjs` dihapus; ditambah `svelte.config.js`, `vite.config.ts`. `next`, `react`, `react-dom` dikeluarkan dari `package.json`.
2. Versi dikunci eksak (lihat `README.md`). Pakai SvelteKit **2.70.3**, bukan 3.x yang kini menjadi `latest`.
3. Adapter: `@sveltejs/adapter-node` 5.5.7 dijalankan dengan `bun ./build/index.js` (`bun run start`). `@sveltejs/adapter-bun` 1.0.x mensyaratkan SvelteKit 3 (peer), dan `svelte-adapter-bun` berstatus deprecated, sehingga keduanya tidak dipakai.
4. Variabel lingkungan `NEXT_PUBLIC_PAWONEE_API` menjadi `PAWONEE_API` (server-only, dibaca di `+page.server.ts`).
5. Perilaku dipertahankan apa adanya: pemanggilan `GET /v1/resep/rekomendasi?bahan=` tetap meski `docs/api/openapi.yaml` backend mendefinisikan `POST /rekomendasi`; ketidaksesuaian ini dicatat untuk keputusan terpisah (bukan diputuskan sepihak di migrasi).

## Konsekuensi

- `versions/v1.0.0/docs/40-TECHSTACK.md` bersifat immutable dan tidak diedit; pembaruan resminya masuk `v1.1.0`. `VERSIONS.md` di `pawonee-infra-devops` perlu diperbarui lewat issue terpisah.
- Zod, rute `/api/v1`, dan uji paritas 32 kasus belum ada dan dikerjakan tiket PWN-WEB-002/003.
- CI dan `pawonee-design` perlu diselaraskan (design tidak diadopsi ke web karena React).
