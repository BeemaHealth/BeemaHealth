import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = resolve(__dirname, "../../../public");
const rootRoute = readFileSync(
  resolve(__dirname, "../../routes/__root.tsx"),
  "utf-8",
);

function pngSize(buf: Buffer): { width: number; height: number } {
  const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(buf.subarray(0, 8)).toEqual(pngSig);
  expect(buf.toString("ascii", 12, 16)).toBe("IHDR");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function icoSizes(buf: Buffer): number[] {
  expect(buf.readUInt16LE(0)).toBe(0);
  expect(buf.readUInt16LE(2)).toBe(1);
  const count = buf.readUInt16LE(4);
  const sizes: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const entry = 6 + i * 16;
    const width = buf[entry] === 0 ? 256 : buf[entry];
    const height = buf[entry + 1] === 0 ? 256 : buf[entry + 1];
    expect(width).toBe(height);
    sizes.push(width);
  }
  return sizes.sort((a, b) => a - b);
}

describe("favicons", () => {
  it("ships a 192x192 PNG so Google Search can pick a 48px-multiple icon", () => {
    const png = readFileSync(resolve(publicDir, "favicon-beema.png"));
    expect(pngSize(png)).toEqual({ width: 192, height: 192 });
  });

  it("ships a multi-size ICO fallback Google still probes at /favicon.ico", () => {
    const ico = readFileSync(resolve(publicDir, "favicon.ico"));
    expect(icoSizes(ico)).toEqual([16, 32, 48]);
  });

  it("declares the PNG as the 192x192 homepage icon so Google prefers it over the ICO", () => {
    expect(rootRoute).toContain('href: "/favicon.ico"');
    expect(rootRoute).toContain('sizes: "48x48"');
    expect(rootRoute).toContain('href: "/favicon-beema.png"');
    expect(rootRoute).toContain('type: "image/png"');
    expect(rootRoute).toContain('sizes: "192x192"');
  });
});
