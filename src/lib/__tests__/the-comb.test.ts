import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../..");

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf-8");
}

describe("retired Comb overview", () => {
  const route = read("src/routes/the-comb.tsx");
  const header = read("src/components/site/SiteHeader.tsx");
  const footer = read("src/components/site/SiteFooter.tsx");
  const homepage = read("src/components/home/FreeResourcesSection.tsx");

  it("redirects the branded overview home", () => {
    expect(route).toContain('createFileRoute("/the-comb")');
    expect(route).toContain('throw redirect({ to: "/" })');
  });

  it("is unlinked from header, footer, and homepage", () => {
    expect(header).not.toContain("/the-comb/");
    expect(footer).not.toContain("/the-comb/");
    expect(homepage).not.toContain("/the-comb/");
    expect(header).not.toContain("The Comb");
    expect(footer).not.toContain("The Comb");
    expect(homepage).not.toContain("The Comb");
  });
});
