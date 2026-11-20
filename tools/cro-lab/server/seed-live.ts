// Initial real data: variants that exist in the repo, with each page's current
// control recorded as live (variant 0). No invented metrics.
import type { Deployment, LabData, Variant } from "../shared/types.ts";
import { PAGES } from "../shared/pages.ts";
import { denverDayStartMs } from "../shared/time.ts";
import { RANGE_START } from "./ga4.ts";
import { scanDisk } from "./variants.ts";

export function seedLive(root: string): LabData {
  const variants: Variant[] = [];
  for (const page of PAGES) {
    const onDisk = scanDisk(root, page.id);
    if (onDisk.length === 0) {
      variants.push({
        id: "v1-control",
        pageId: page.id,
        name: "Control",
        componentPath: page.routeFile,
        description:
          "Current page as built in its route file. Not yet on the variant system.",
        createdAt: new Date().toISOString(),
        status: "draft",
        parentId: null,
        hypothesis: "Baseline.",
        element: "None",
        whyTested: "Baseline for later comparison.",
        expected: "",
        notes: "",
      });
      continue;
    }
    for (const f of onDisk) {
      variants.push({
        id: f.id,
        pageId: page.id,
        name: f.label,
        componentPath: f.file,
        description: "",
        createdAt: new Date().toISOString(),
        status: "draft",
        parentId: f.id === "v1-control" ? null : "v1-control",
        hypothesis: f.id === "v1-control" ? "Baseline." : "",
        element: f.id === "v1-control" ? "None" : "",
        whyTested: "",
        expected: "",
        notes: "",
      });
    }
  }
  // Variant zero: the page that was live when the lab started. It has been the
  // production page since before the first day of GA4 data the lab shows.
  const since = new Date(denverDayStartMs(RANGE_START)).toISOString();
  const deployments: Deployment[] = PAGES.map((page) => ({
    id: `d0-${page.id}`,
    pageId: page.id,
    variantId: "v1-control",
    startUtc: since,
    endUtc: null,
    confirmed: true,
    notes: "Initial version (variant 0), live before tracking began.",
  }));
  return {
    schemaVersion: 1,
    variants,
    deployments,
    tests: [],
    readyToDeploy: {},
  };
}
