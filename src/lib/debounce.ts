/** Tunda pemanggilan `fn` hingga `ms` berlalu tanpa panggilan baru. */
export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  const tunda = (...a: A) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
  tunda.batal = () => clearTimeout(t);
  return tunda;
}
