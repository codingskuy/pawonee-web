# CHANGELOG

Format: [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/). Versi mengikuti `versions/` TownHall.

## [Belum dirilis]

### Ditambahkan
- Port TypeScript mesin rekomendasi dengan uji paritas 32 kasus < 0,01 (PWN-WEB-002, #2).
- Enam rute `/api/v1` (`kesehatan`, `resep`, `resep/[id]`, `rekomendasi`, `stok`, `profil/[idKeluarga]`) dengan validasi Zod, CORS hanya `https://pawonee.chefgenie.id`, dan batas laju 30/menit (PWN-WEB-003, #3).

### Diubah
- Migrasi Next.js 15 + React 19 ke Bun + Svelte 5 + SvelteKit 2 (PWN-WEB-005, #5); `src/app/*` diganti `src/routes/*`, `NEXT_PUBLIC_PAWONEE_API` diganti `PAWONEE_API`.

## [1.0.0] — 2026-10-14

### Ditambahkan
- Fondasi AI-dev v1.0.0: `AGENTS.md`, `CLAUDE.md`, ADR-0001, `40-TECHSTACK.md`, `60-BLAST-RADIUS.md`.
