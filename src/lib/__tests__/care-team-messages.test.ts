import { describe, expect, it } from "vitest";
import {
  careTeamMessageCount,
  parseCareTeamMessages,
} from "@/lib/care-team-messages";

describe("parseCareTeamMessages", () => {
  it("returns an empty list for blank notes", () => {
    expect(parseCareTeamMessages("")).toEqual([]);
    expect(parseCareTeamMessages("   ")).toEqual([]);
  });

  it("parses provider and support prefixed messages", () => {
    const messages = parseCareTeamMessages(
      "[Provider] hello, we need more information please\n\n[Support] hello please contact me here 7195106341",
    );

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      sender: "provider",
      senderLabel: "Provider",
      body: "hello, we need more information please",
    });
    expect(messages[1]).toMatchObject({
      sender: "support",
      senderLabel: "Support",
      body: "hello please contact me here 7195106341",
    });
  });

  it("treats unprefixed notes as a single care-team message", () => {
    const messages = parseCareTeamMessages(
      "Please update your shipping address.",
    );

    expect(messages).toEqual([
      expect.objectContaining({
        sender: "care_team",
        senderLabel: "Care team",
        body: "Please update your shipping address.",
      }),
    ]);
  });

  it("counts parsed messages", () => {
    expect(
      careTeamMessageCount(
        "[Provider] one\n\n[Provider] two\n\n[Support] three",
      ),
    ).toBe(3);
  });
});
