import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlogWeightChart } from "@/components/blog/BlogWeightChart";
import { getBlogChart } from "@/content/blog/charts";

const chart = getBlogChart("charlie-weight");

describe("BlogWeightChart", () => {
  it("has weekly, date-ordered data", () => {
    expect(chart).toBeDefined();
    const dates = chart?.points.map(([date]) => Date.parse(date)) ?? [];
    expect(dates.length).toBeGreaterThan(40);
    for (let i = 1; i < dates.length; i += 1) {
      expect((dates[i] ?? 0) - (dates[i - 1] ?? 0)).toBe(7 * 86_400_000);
    }
  });

  it("server-renders an accessible SVG inside a collapsed details dropdown", () => {
    if (!chart) throw new Error("missing chart");
    const html = renderToString(<BlogWeightChart chart={chart} />);
    expect(html).toContain("<details");
    expect(html).not.toContain("<details open");
    expect(html).toContain("progress over time");
    expect(html).toContain('role="img"');
    expect(html).toContain("<desc");
    expect(html).toContain("weekly weigh-ins");
    expect(html).toContain("283.5 lb");
    expect(html).toContain("210.0 lb");
    expect(html).not.toMatch(/NaN|undefined/);
  });

  it("states next to the chart that the result is not typical", () => {
    if (!chart) throw new Error("missing chart");
    const html = renderToString(<BlogWeightChart chart={chart} />);
    expect(html).toContain("one person&#x27;s result and is not typical");
    expect(html).toContain("Individual results vary");
  });
});
