import type { PageDef } from "./types.ts";

export const PAGES: PageDef[] = [
  {
    id: "glp-1-houston",
    path: "/glp-1-houston/",
    market: "Houston",
    title: "GLP-1 Houston",
    routeFile: "src/routes/glp-1-houston.tsx",
  },
  {
    id: "semaglutide-houston",
    path: "/semaglutide-houston/",
    market: "Houston",
    title: "Semaglutide Houston",
    routeFile: "src/routes/semaglutide-houston.tsx",
  },
  {
    id: "tirzepatide-houston",
    path: "/tirzepatide-houston/",
    market: "Houston",
    title: "Tirzepatide Houston",
    routeFile: "src/routes/tirzepatide-houston.tsx",
  },
  {
    id: "sildenafil-boston",
    path: "/sildenafil-boston/",
    market: "Boston",
    title: "Sildenafil Boston",
    routeFile: "src/routes/sildenafil-boston.tsx",
  },
  {
    id: "tadalafil-boston",
    path: "/tadalafil-boston/",
    market: "Boston",
    title: "Tadalafil Boston",
    routeFile: "src/routes/tadalafil-boston.tsx",
  },
  {
    id: "ed-mints-boston",
    path: "/ed-mints-boston/",
    market: "Boston",
    title: "ED Mints Boston",
    routeFile: "src/routes/ed-mints-boston.tsx",
  },
];

export const TIME_ZONE = "America/Denver";
export const CANONICAL_ORIGIN = "https://beemahealth.com";
