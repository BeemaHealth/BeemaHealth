import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHATBASE_AGENT_ID,
  CHATBASE_CONNECT_ORIGINS,
  CHATBASE_EMBED_SCRIPT,
  CHATBASE_EMBED_SRC,
  CHATBASE_FRAME_ORIGINS,
  CHATBASE_SCRIPT_ORIGINS,
} from "@/lib/chatbase";

describe("chatbase", () => {
  const rootRoute = readFileSync(
    resolve(__dirname, "../../routes/__root.tsx"),
    "utf-8",
  );

  it("keeps the official agent id and embed URL", () => {
    expect(CHATBASE_AGENT_ID).toBe("ox-c-qDv7gBmQt5fjOHcQ");
    expect(CHATBASE_EMBED_SRC).toBe("https://www.chatbase.co/embed.min.js");
    expect(CHATBASE_EMBED_SCRIPT).toContain(CHATBASE_AGENT_ID);
    expect(CHATBASE_EMBED_SCRIPT).toContain(CHATBASE_EMBED_SRC);
    expect(CHATBASE_EMBED_SCRIPT).toContain('script.domain="www.chatbase.co"');
    expect(CHATBASE_EMBED_SCRIPT).toContain(
      'window.addEventListener("load",onLoad)',
    );
  });

  it("does not pass visitor identity into the bootstrap", () => {
    expect(CHATBASE_EMBED_SCRIPT).not.toMatch(/email|phone|userId|identify/i);
  });

  it("installs the snippet and allows the widget origins in CSP", () => {
    expect(rootRoute).toContain("CHATBASE_EMBED_SCRIPT");
    for (const origin of [
      ...CHATBASE_SCRIPT_ORIGINS,
      ...CHATBASE_CONNECT_ORIGINS,
      ...CHATBASE_FRAME_ORIGINS,
    ]) {
      expect(rootRoute).toContain(origin);
    }
  });
});
