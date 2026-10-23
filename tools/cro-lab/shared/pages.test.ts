import test from "node:test";
import assert from "node:assert/strict";
import {
  PAGES,
  PRODUCT_PAGES,
  TRACKED_PAGES,
  pageIdFromCtaId,
  pageIdFromPagePath,
  pagePathFor,
  pagePathRegexp,
} from "./pages.ts";

test("pageIdFromCtaId maps every tracked page's CTA ids", () => {
  const cases: [string, string][] = [
    ["glp1_hero", "glp-1-houston"],
    ["glp1_footer", "glp-1-houston"],
    ["semaglutide_houston_bmi", "semaglutide-houston"],
    ["semaglutide_hero", "semaglutide"],
    ["tirzepatide_houston_hero", "tirzepatide-houston"],
    ["tirzepatide_bmi", "tirzepatide"],
    ["ed_mints_boston_hero", "ed-mints-boston"],
    ["ed_mints_rdt_hero", "ed-mints"],
    ["ed_mints_odt_footer", "ed-mints"],
    ["ed_hero", "ed"],
    ["tadalafil_boston_footer", "tadalafil-boston"],
    ["tadalafil_hero", "tadalafil"],
    ["sildenafil_boston_hero", "sildenafil-boston"],
    ["sildenafil_footer", "sildenafil"],
    ["weight_loss_hero", "weight-loss"],
    ["sexual_health_footer", "sexual-health"],
    ["hair_hero", "hair-loss"],
    ["hairloss_spray_men_hero", "hair-loss-spray-men"],
    ["hairloss_spray_women_footer", "hair-loss-spray-women"],
    ["oral_finasteride_hero", "oral-finasteride"],
    ["oral_minoxidil_men_hero", "oral-minoxidil-men"],
    ["oral_minoxidil_women_footer", "oral-minoxidil-women"],
    ["nad_hero", "nad-plus"],
    ["sermorelin_footer", "sermorelin"],
    ["home_mid", "home"],
  ];
  for (const [cta, page] of cases)
    assert.equal(pageIdFromCtaId(cta), page, cta);
});

test("pageIdFromCtaId ignores sitewide, untracked and empty ids", () => {
  for (const cta of ["footer", "learn_weight_loss", "faq", "", null, undefined])
    assert.equal(pageIdFromCtaId(cta), null, String(cta));
});

test("every tracked page id is unique and every product page is analytics-only", () => {
  const ids = TRACKED_PAGES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(PAGES.every((p) => p.group === "landing" && p.variants));
  assert.ok(PRODUCT_PAGES.every((p) => p.group === "product" && !p.variants));
  assert.ok(PRODUCT_PAGES.some((p) => p.id === "home" && p.path === "/"));
});

test("page paths resolve with or without a trailing slash, home included", () => {
  const ids = TRACKED_PAGES.map((p) => p.id);
  assert.equal(pageIdFromPagePath("/", ids), "home");
  assert.equal(pageIdFromPagePath("/semaglutide", ids), "semaglutide");
  assert.equal(pageIdFromPagePath("/semaglutide/", ids), "semaglutide");
  assert.equal(
    pageIdFromPagePath("/semaglutide-houston/", ids),
    "semaglutide-houston",
  );
  assert.equal(pageIdFromPagePath("/semaglutide/x", ids), null);
  assert.equal(pageIdFromPagePath("/semaglutide/", ["glp-1"]), null);
  assert.equal(pagePathFor("home"), "/");
  assert.equal(pagePathFor("nope"), null);
});

test("pagePathRegexp matches exactly the chosen pages", () => {
  const re = new RegExp(`^${pagePathRegexp(["home", "semaglutide"])}$`);
  for (const ok of ["/", "/semaglutide", "/semaglutide/"])
    assert.ok(re.test(ok), ok);
  for (const no of ["/semaglutide-houston/", "/learn/", "/semaglutide/x"])
    assert.ok(!re.test(no), no);
});
