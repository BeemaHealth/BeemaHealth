import test from "node:test";
import assert from "node:assert/strict";
import { pageIdFromCtaId } from "./pages.ts";

test("pageIdFromCtaId maps page CTA ids and ignores everything else", () => {
  assert.equal(pageIdFromCtaId("glp1_hero"), "glp-1-houston");
  assert.equal(pageIdFromCtaId("glp1_footer"), "glp-1-houston");
  assert.equal(
    pageIdFromCtaId("semaglutide_houston_bmi"),
    "semaglutide-houston",
  );
  assert.equal(
    pageIdFromCtaId("tirzepatide_houston_hero"),
    "tirzepatide-houston",
  );
  assert.equal(pageIdFromCtaId("ed_mints_boston_hero"), "ed-mints-boston");
  assert.equal(pageIdFromCtaId("tadalafil_boston_footer"), "tadalafil-boston");
  assert.equal(pageIdFromCtaId("sildenafil_boston_hero"), "sildenafil-boston");
  assert.equal(pageIdFromCtaId("semaglutide_hero"), null);
  assert.equal(pageIdFromCtaId("home_hero"), null);
  assert.equal(pageIdFromCtaId(""), null);
  assert.equal(pageIdFromCtaId(null), null);
});
