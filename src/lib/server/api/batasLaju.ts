// Pembatas laju jendela tetap: 30 permintaan per menit per kunci (kontrak: per token).
export const BATAS_PER_MENIT = 30;
const JENDELA_MS = 60_000;

export class BatasLaju {
  private readonly jendela = new Map<string, { mulai: number; hitung: number }>();

  constructor(
    private readonly batas = BATAS_PER_MENIT,
    private readonly sekarang: () => number = Date.now
  ) {}

  /** true bila permintaan boleh lanjut. */
  izinkan(kunci: string): boolean {
    const t = this.sekarang();
    const w = this.jendela.get(kunci);
    if (!w || t - w.mulai >= JENDELA_MS) {
      this.jendela.set(kunci, { mulai: t, hitung: 1 });
      if (this.jendela.size > 10_000) this.bersihkan(t);
      return true;
    }
    w.hitung += 1;
    return w.hitung <= this.batas;
  }

  private bersihkan(t: number): void {
    for (const [k, w] of this.jendela) if (t - w.mulai >= JENDELA_MS) this.jendela.delete(k);
  }
}

export function kunciPembatas(request: Request, alamat: string): string {
  const auth = request.headers.get('authorization');
  if (auth) return `tok:${auth}`;
  const dev = request.headers.get('x-device-key');
  if (dev) return `dev:${dev}`;
  return `ip:${alamat}`;
}
