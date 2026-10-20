/**
 * Backend is on hold: mock data is the default.
 * Set PUBLIC_USE_MOCK_DATA=false only when running `pnpm dev:stack` with Docker.
 */
export function useMockData(): boolean {
  const v = import.meta.env.PUBLIC_USE_MOCK_DATA;
  if (v === false || v === 'false' || v === '0') return false;
  // undefined / true / "true" / "1" → mock ON
  return true;
}
