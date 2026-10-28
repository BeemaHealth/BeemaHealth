import type { BlogInline } from "@/content/blog/types";

export function plainBlogText(inlines: readonly BlogInline[]): string {
  return inlines
    .map((inline) => (inline.type === "link" ? inline.label : inline.value))
    .join("");
}

export function blogHeadingId(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "section";
}

function assertSafeHref(href: string): void {
  if (href.startsWith("/")) {
    if (
      href.startsWith("//") ||
      href.includes("..") ||
      href.includes("\\") ||
      href.includes(" ") ||
      !/^\/[a-z0-9\-/_]*$/i.test(href)
    ) {
      throw new Error(`Unsafe internal blog link: ${href}`);
    }
    return;
  }
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    throw new Error(`Unsafe blog link: ${href}`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`Blog links must be https or site paths: ${href}`);
  }
}

export function parseInlines(input: string): BlogInline[] {
  const inlines: BlogInline[] = [];
  let text = "";
  let i = 0;
  const flush = () => {
    if (!text) return;
    inlines.push({ type: "text", value: text });
    text = "";
  };

  while (i < input.length) {
    if (input.startsWith("**", i)) {
      const end = input.indexOf("**", i + 2);
      if (end === -1) {
        text += input[i];
        i += 1;
        continue;
      }
      const value = input.slice(i + 2, end);
      if (!value) throw new Error("Empty bold marker in blog markdown");
      flush();
      inlines.push({ type: "strong", value });
      i = end + 2;
      continue;
    }

    if (input[i] === "[") {
      const closeLabel = input.indexOf("]", i + 1);
      if (closeLabel !== -1 && input[closeLabel + 1] === "(") {
        const closeHref = input.indexOf(")", closeLabel + 2);
        if (closeHref !== -1) {
          const label = input.slice(i + 1, closeLabel);
          const href = input.slice(closeLabel + 2, closeHref);
          if (!label || !href) throw new Error("Empty blog link");
          assertSafeHref(href);
          flush();
          inlines.push({ type: "link", label, href });
          i = closeHref + 1;
          continue;
        }
      }
    }

    text += input[i];
    i += 1;
  }

  flush();
  return inlines;
}
