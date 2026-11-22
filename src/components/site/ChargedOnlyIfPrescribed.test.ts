import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChargedOnlyIfPrescribed } from "./ChargedOnlyIfPrescribed";

const render = (props: {
  totalUsd: number;
  regularUsd?: number;
  months: number;
}) => renderToStaticMarkup(createElement(ChargedOnlyIfPrescribed, props));

describe("ChargedOnlyIfPrescribed", () => {
  it("crosses out the comparison price, then shows the plan price", () => {
    const html = render({ totalUsd: 497, regularUsd: 597, months: 3 });
    expect(html).toMatch(/<s>.*\$597<\/s>/);
    expect(html).toContain("$497");
    expect(html).toContain("for 3 months, charged only if prescribed.");
    expect(html.indexOf("$597")).toBeLessThan(html.indexOf("$497"));
  });

  it("skips the crossed-out price when it is not a real saving", () => {
    for (const regularUsd of [undefined, 297, 100]) {
      const html = render({ totalUsd: 297, regularUsd, months: 3 });
      expect(html).not.toContain("<s>");
      expect(html).toContain("charged only if prescribed.");
    }
  });

  it("never says charged up front", () => {
    const html = render({ totalUsd: 497, regularUsd: 597, months: 3 });
    expect(html.toLowerCase()).not.toContain("up front");
  });
});
