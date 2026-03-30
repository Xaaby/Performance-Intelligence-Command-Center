/** Coerce unknown API values to an array so `.filter` / `.map` never run on non-arrays. */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
