import { describe, expect, it } from "vitest";
import {
  cleanText,
  toggleMulti,
  validateBasics,
  validateBmi,
  validateChoice,
  validateDateNode,
  validateListItem,
  validateMulti,
  validateNumberNode,
  validateTextNode,
  validateUploadFile,
  normalizeUsPhone,
} from "../node-validation";
import { node } from "./helpers";

const TODAY = new Date(2026, 9, 6);

describe("choice validation", () => {
  const n = node({
    id: "q",
    type: "radio",
    options: [
      { key: "a", label: "A" },
      { key: "b", label: "B" },
    ],
  });
  it("requires a listed option", () => {
    expect(validateChoice(n, null)).toEqual({
      ok: false,
      error: "Choose one option to continue.",
    });
    expect(validateChoice(n, "zzz").ok).toBe(false);
    expect(validateChoice(n, "a")).toEqual({ ok: true, value: "a" });
  });

  it("multi select enforces min, unknown keys, and exclusive options", () => {
    const m = node({
      id: "m",
      type: "multi_select",
      options: [
        { key: "x", label: "X" },
        { key: "y", label: "Y" },
        { key: "none", label: "None", exclusive: true },
      ],
    });
    expect(validateMulti(m, []).ok).toBe(false);
    expect(validateMulti(m, ["nope"]).ok).toBe(false);
    expect(validateMulti(m, ["y", "x"])).toEqual({
      ok: true,
      value: ["x", "y"],
    });
    expect(toggleMulti(m.options!, ["x"], "none")).toEqual(["none"]);
    expect(toggleMulti(m.options!, ["none"], "y")).toEqual(["y"]);
    expect(toggleMulti(m.options!, ["x", "y"], "x")).toEqual(["y"]);
  });
});

describe("text style validation", () => {
  it("rejects control characters and overflow", () => {
    expect(cleanText("bad\u0000text", { max: 50 }).ok).toBe(false);
    expect(cleanText("x".repeat(51), { max: 50 }).ok).toBe(false);
    expect(cleanText("line\nbreak", { max: 50 }).ok).toBe(false);
    expect(cleanText("line\nbreak", { max: 50, multiline: true }).ok).toBe(
      true,
    );
  });

  it("validates email and zip formats", () => {
    const email = node({ id: "e", type: "text", format: "email" });
    expect(validateTextNode(email, "  A@B.com ")).toEqual({
      ok: true,
      value: "a@b.com",
    });
    expect(validateTextNode(email, "nope").ok).toBe(false);
    const zip = node({ id: "z", type: "text", format: "zip" });
    expect(validateTextNode(zip, "77002-1234")).toEqual({
      ok: true,
      value: "77002",
    });
    expect(validateTextNode(zip, "7700").ok).toBe(false);
  });

  it("handles injection style input as plain text without throwing", () => {
    const t = node({ id: "t", type: "text" });
    for (const payload of [
      "'; DROP TABLE users;--",
      "<script>alert(1)</script>",
      "../../etc/passwd",
      "$(rm -rf /)",
    ]) {
      expect(validateTextNode(t, payload).ok).toBe(true);
    }
    expect(validateTextNode(t, "a".repeat(100000)).ok).toBe(false);
  });

  it("validates numbers", () => {
    const n = node({ id: "n", type: "number", min: 1, max: 10, integer: true });
    expect(validateNumberNode(n, "")).toMatchObject({ ok: false });
    expect(validateNumberNode(n, "abc").ok).toBe(false);
    expect(validateNumberNode(n, "2.5").ok).toBe(false);
    expect(validateNumberNode(n, "0").ok).toBe(false);
    expect(validateNumberNode(n, "11").ok).toBe(false);
    expect(validateNumberNode(n, "7")).toEqual({ ok: true, value: 7 });
  });

  it("validates dates against not_future and min_age", () => {
    const d = node({ id: "d", type: "date", not_future: true, min_age: 18 });
    expect(validateDateNode(d, "2026-02-30", TODAY).ok).toBe(false);
    expect(validateDateNode(d, "2030-01-01", TODAY).ok).toBe(false);
    expect(validateDateNode(d, "2015-01-01", TODAY).ok).toBe(false);
    expect(validateDateNode(d, "1990-05-05", TODAY).ok).toBe(true);
  });
});

describe("basics", () => {
  const good = {
    dob: "1990-05-05",
    sex_at_birth: "female",
    state: "tx",
    zip: "77002",
    phone: "(713) 555-0142",
  };
  it("normalizes a valid submission", () => {
    expect(validateBasics(good, TODAY)).toEqual({
      ok: true,
      value: {
        dob: "1990-05-05",
        sex_at_birth: "female",
        state: "TX",
        zip: "77002",
        phone: "+17135550142",
      },
    });
  });
  it("does not block under 18 (the server routes to a warm no_proceed page)", () => {
    expect(validateBasics({ ...good, dob: "2015-01-01" }, TODAY).ok).toBe(true);
  });
  it("reports each bad field", () => {
    const r = validateBasics(
      { dob: "", sex_at_birth: "", state: "", zip: "1", phone: "123" },
      TODAY,
    );
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(Object.keys(r.errors).sort()).toEqual([
        "dob",
        "phone",
        "sex_at_birth",
        "state",
        "zip",
      ]);
  });
  it("normalizes US phones", () => {
    expect(normalizeUsPhone("1 (713) 555-0142")).toBe("+17135550142");
    expect(normalizeUsPhone("0135550142")).toBeNull();
    expect(normalizeUsPhone("713-555-0142; DROP")).toBeNull();
  });
});

describe("bmi", () => {
  it("accepts sane values and rejects out of range", () => {
    expect(
      validateBmi({ height_feet: "5", height_inches: "8", weight_lbs: "190" }),
    ).toEqual({
      ok: true,
      value: { height_feet: 5, height_inches: 8, weight_lbs: 190 },
    });
    expect(
      validateBmi({ height_feet: "2", height_inches: "0", weight_lbs: "190" })
        .ok,
    ).toBe(false);
    expect(
      validateBmi({ height_feet: "5", height_inches: "12", weight_lbs: "190" })
        .ok,
    ).toBe(false);
    expect(
      validateBmi({ height_feet: "5", height_inches: "8", weight_lbs: "9999" })
        .ok,
    ).toBe(false);
  });
});

describe("list items", () => {
  it("requires a name and rejects unsafe characters", () => {
    expect(validateListItem("allergies", {}).ok).toBe(false);
    expect(validateListItem("add_medication", { name: "<script>" }).ok).toBe(
      false,
    );
    expect(
      validateListItem("add_medication", { name: "Lisinopril", dose: "10 mg" }),
    ).toEqual({
      ok: true,
      value: { name: "Lisinopril", dose: "10 mg" },
    });
    expect(
      validateListItem("allergies", { name: "Penicillin", severity: "bad" }).ok,
    ).toBe(false);
    expect(
      validateListItem(
        "med_conditions",
        { name: "Asthma", diagnosed_on: "2099-01-01" },
        TODAY,
      ).ok,
    ).toBe(false);
  });
});

describe("uploads", () => {
  it("restricts type and size", () => {
    expect(validateUploadFile({ type: "image/png", size: 1000 })).toBeNull();
    expect(
      validateUploadFile({ type: "application/x-msdownload", size: 1000 }),
    ).not.toBeNull();
    expect(
      validateUploadFile({ type: "image/png", size: 11 * 1024 * 1024 }),
    ).not.toBeNull();
    expect(validateUploadFile({ type: "image/png", size: 0 })).not.toBeNull();
  });
});
