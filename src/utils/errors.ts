/**
 * Extract a human-readable message from an unknown caught value.
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
