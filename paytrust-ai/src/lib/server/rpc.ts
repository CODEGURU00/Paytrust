/**
 * PostgREST returns a composite-returning function either as an object or a
 * one-element array depending on the function signature and client version.
 */
export function firstRpcRow<T>(data: T | T[] | null | undefined): T | null {
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }
  return data ?? null;
}
