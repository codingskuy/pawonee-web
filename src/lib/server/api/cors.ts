// CORS: hanya `https://pawonee.chefgenie.id` yang diizinkan.
import { ORIGIN_DIIZINKAN } from './skema';

const IZIN_HEADER = 'Content-Type, Authorization, X-Kontrak-Versi, X-Device-Key, X-Service-Key';

export function headerCors(origin: string | null): Record<string, string> {
  const h: Record<string, string> = { Vary: 'Origin' };
  if (origin === ORIGIN_DIIZINKAN) {
    h['Access-Control-Allow-Origin'] = ORIGIN_DIIZINKAN;
    h['Access-Control-Expose-Headers'] = 'X-Data-Usang, X-Kontrak-Versi';
  }
  return h;
}

/** Respons preflight untuk OPTIONS. */
export function preflight(origin: string | null): Response {
  const h = headerCors(origin);
  if (origin === ORIGIN_DIIZINKAN) {
    h['Access-Control-Allow-Methods'] = 'GET, POST, PUT, OPTIONS';
    h['Access-Control-Allow-Headers'] = IZIN_HEADER;
    h['Access-Control-Max-Age'] = '600';
  }
  return new Response(null, { status: 204, headers: h });
}

export function tambahCors(res: Response, origin: string | null): Response {
  for (const [k, v] of Object.entries(headerCors(origin))) res.headers.set(k, v);
  return res;
}
