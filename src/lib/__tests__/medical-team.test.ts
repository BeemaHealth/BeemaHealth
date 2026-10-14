import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MEDICAL_TEAM,
  MEDICAL_TEAM_MEDIA_ENABLED,
  TEAM_MEDIA_DISCLAIMER,
} from "@/lib/medical-team";

/**
 * Guards the Arora Health "Team Bio / Media Licensing Consent" terms: approved
 * text only, unaltered headshots, required disclaimer, takedown switch.
 */

const ROOT = join(__dirname, "..", "..", "..");

describe("Arora Health team media license guards", () => {
  it("keeps the required disclaimer verbatim", () => {
    expect(TEAM_MEDIA_DISCLAIMER).toBe(
      "The inclusion of Arora Health personnel on this website denotes a professional collaboration/service provider relationship. It does not constitute an endorsement of the company’s products, services, or independent business practices, nor does it imply a joint venture, partnership, or employment relationship.",
    );
  });

  it("uses the approved names and titles", () => {
    expect(MEDICAL_TEAM.map((m) => [m.displayName, m.title])).toEqual([
      ["Dr. Sean Arora", "CEO, Founder"],
      ["Dr. Shannon Arora", "Chief Medical Officer"],
    ]);
  });

  it("keeps approved bios verbatim (paragraph count and anchor sentences)", () => {
    const [sean, shannon] = MEDICAL_TEAM;
    expect(sean.bio).toHaveLength(2);
    expect(shannon.bio).toHaveLength(3);
    expect(sean.bio[0]).toMatch(
      /^Dr\. Sean Arora is a board-certified physician and the founder of Arora Health & Aesthetics,/,
    );
    expect(sean.bio[1]).toMatch(/Licensed in all 50 states, he is dedicated/);
    expect(shannon.bio[0]).toMatch(
      /^Dr\. Shannon Arora is a physician dedicated/,
    );
    expect(shannon.bio[2]).toMatch(/thoughtful, patient-centered care\.$/);
  });

  it("contains no em dashes", () => {
    const text = JSON.stringify([MEDICAL_TEAM, TEAM_MEDIA_DISCLAIMER]);
    expect(text).not.toContain("—");
  });

  it("ships the original headshot files, unaltered", () => {
    const dir = join(ROOT, "src", "assets", "team");
    const sha = (f: string) =>
      createHash("sha1")
        .update(readFileSync(join(dir, f)))
        .digest("hex");
    expect(sha("sean-arora-headshot.jpeg")).toBe(
      "26b7bf441cf9cc7cd613ecafd5eda5b3e3a3ff0f",
    );
    expect(sha("shannon-arora-headshot.jpeg")).toBe(
      "f3e4ada3fe5137b45d5e79d69d1b190f835c165a",
    );
    expect(readdirSync(dir).sort()).toEqual([
      "sean-arora-headshot.jpeg",
      "shannon-arora-headshot.jpeg",
    ]);
  });

  it("declares the native 896x1088 dimensions so photos are never reflowed to another ratio", () => {
    for (const m of MEDICAL_TEAM) {
      expect([m.headshot.width, m.headshot.height]).toEqual([896, 1088]);
    }
  });

  it("only renders team media through MedicalTeamSection (single takedown point)", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
          if (name === "__tests__" || name === "assets") continue;
          walk(full);
        } else if (/\.(ts|tsx)$/.test(name)) {
          const src = readFileSync(full, "utf8");
          if (
            /assets\/team\//.test(src) &&
            !full.endsWith(join("lib", "medical-team.ts"))
          ) {
            offenders.push(full);
          }
        }
      }
    };
    walk(join(ROOT, "src"));
    expect(offenders).toEqual([]);
  });

  it("exposes the takedown switch as a boolean", () => {
    expect(typeof MEDICAL_TEAM_MEDIA_ENABLED).toBe("boolean");
  });
});
