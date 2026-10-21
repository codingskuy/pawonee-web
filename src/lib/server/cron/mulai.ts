// Pengait cron harian. Aktif hanya bila PAWONEE_CRON=1 (bawaan mati).
// ASUMSI: web tidak punya DB dan kontrak v1 tidak menyediakan daftar keluarga + email, sehingga
// sumber penerima belum terhubung (`ambilPenerima` mengembalikan []). Pengiriman memakai webhook
// surel milik divisi sendiri (EMAIL_WEBHOOK_URL); tanpa itu, hanya log (dry-run).
import { jadwalkanHarian, jalankanSekali, type KirimSurel, type Penerima } from './stokLayu';

const ambilPenerima = async (): Promise<Penerima[]> => [];

const kirim: KirimSurel = async (s) => {
  const url = process.env.EMAIL_WEBHOOK_URL;
  if (!url) {
    console.log(`[cron stokLayu] dry-run -> ${s.ke}: ${s.subjek}`);
    return;
  }
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(s) });
  if (!r.ok) throw new Error(`webhook surel ${r.status}`);
};

let berhenti: (() => void) | undefined;

export function mulaiCronHarian(): void {
  if (process.env.PAWONEE_CRON !== '1' || berhenti) return;
  const jam = Number(process.env.PAWONEE_CRON_JAM ?? 7);
  berhenti = jadwalkanHarian(Number.isInteger(jam) && jam >= 0 && jam <= 23 ? jam : 7, async () => {
    const h = await jalankanSekali(ambilPenerima, kirim);
    console.log(`[cron stokLayu] selesai`, h);
  });
}
