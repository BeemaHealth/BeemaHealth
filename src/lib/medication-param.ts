import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { MedicationId } from "@/lib/treatment-imagery";

const DEFAULT_MEDICATION: MedicationId = "tirzepatide";

/**
 * Parse the `med` query param (e.g. `?med=semaglutide`) from ad links.
 * Returns null when absent or unrecognized so callers keep their default.
 */
export function parseMedicationParam(search: string): MedicationId | null {
  const raw = new URLSearchParams(search).get("med");
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (value === "semaglutide" || value === "sema") return "semaglutide";
  if (value === "tirzepatide" || value === "tirz") return "tirzepatide";
  return null;
}

/**
 * Selected-medication state for pricing pickers. Starts on the default so
 * server and first client render match, then applies `?med=` after mount.
 */
export function useMedicationFromUrl(): [
  MedicationId,
  Dispatch<SetStateAction<MedicationId>>,
] {
  const [selected, setSelected] = useState<MedicationId>(DEFAULT_MEDICATION);

  useEffect(() => {
    const fromUrl = parseMedicationParam(window.location.search);
    if (fromUrl) setSelected(fromUrl);
  }, []);

  return [selected, setSelected];
}
