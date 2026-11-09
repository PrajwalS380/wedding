/** Deterministic pseudo-random numbers in [0, 1) (Park–Miller), so decorative scatter never shimmers between renders. */
export function rng(seed: number) {
  let s = seed % 2147483647 || 1
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}
