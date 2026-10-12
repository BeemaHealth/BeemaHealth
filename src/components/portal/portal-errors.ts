import { ApiError } from "@/lib/api/portal/client";

/** Plain message for any thrown value. Never includes request data. */
export function errorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (err instanceof ApiError) return err.message;
  return fallback;
}
