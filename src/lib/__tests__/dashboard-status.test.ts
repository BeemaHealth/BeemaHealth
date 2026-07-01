import { describe, expect, it } from "vitest";
import {
  CARE_MILESTONE_ORDER,
  buildCareTimeline,
  buildGroupedCareTimeline,
  hasUnresolvedDeliveryIssue,
} from "@/lib/dashboard-status";
import type {
  IntakeStatus,
  PersistedCareEvent,
  RefillRequest,
} from "@/lib/types/mvp";

const SUBMITTED_AT = "2026-06-27T12:00:00Z";

function ids(status: IntakeStatus) {
  return buildCareTimeline(status, SUBMITTED_AT).map((event) => event.id);
}

describe("buildCareTimeline", () => {
  it("returns no events until the intake is submitted", () => {
    expect(buildCareTimeline("draft", null)).toEqual([]);
    expect(buildCareTimeline("prescription_sent", null)).toEqual([]);
  });

  it("shows only the submitted milestone for a freshly submitted intake", () => {
    expect(ids("submitted")).toEqual(["intake-submitted"]);
  });

  it("marks the review step active (orange) while under review", () => {
    const events = buildCareTimeline("under_review", SUBMITTED_AT);
    expect(events.map((e) => e.id)).toEqual([
      "intake-submitted",
      "under-review",
    ]);
    expect(events[1].tone).toBe("orange");
  });

  it("uses a dedicated label/copy for more_info_needed (no STATUS_LABELS leak)", () => {
    const review = buildCareTimeline("more_info_needed", SUBMITTED_AT).find(
      (e) => e.id === "under-review",
    );
    expect(review?.title).toBe("More information needed");
    expect(review?.tone).toBe("orange");
  });

  it("renders the full approved + prescription chain in canonical order", () => {
    expect(ids("prescription_sent")).toEqual([
      "intake-submitted",
      "under-review",
      "approved",
      "prescription-sent",
    ]);
  });

  it("renders the not_approved outcome instead of approval/prescription", () => {
    expect(ids("not_approved")).toEqual([
      "intake-submitted",
      "under-review",
      "not-approved",
    ]);
  });

  it("orders 'Treatment approved' before 'Prescription sent' (regression)", () => {
    const events = buildCareTimeline("prescription_sent", SUBMITTED_AT);
    const approvedIdx = events.findIndex((e) => e.id === "approved");
    const sentIdx = events.findIndex((e) => e.id === "prescription-sent");
    expect(approvedIdx).toBeGreaterThanOrEqual(0);
    expect(sentIdx).toBeGreaterThan(approvedIdx);
  });

  it("never duplicates a milestone and completes the review step (regression)", () => {
    const events = buildCareTimeline("prescription_sent", SUBMITTED_AT);

    const seen = events.map((e) => e.id);
    expect(new Set(seen).size).toBe(seen.length);

    // Exactly one "Prescription sent" node, and its copy matches its title.
    const sentNodes = events.filter((e) => e.title === "Prescription sent");
    expect(sentNodes).toHaveLength(1);
    expect(sentNodes[0].id).toBe("prescription-sent");
    expect(sentNodes[0].description).toBe(
      "Your prescription was sent for fulfillment",
    );

    // The review step is a completed historical milestone, correctly labeled.
    const review = events.find((e) => e.id === "under-review");
    expect(review?.title).toBe("Under provider review");
    expect(review?.tone).toBe("gray");
  });

  it("keeps every node's title consistent with its description/state", () => {
    for (const status of [
      "submitted",
      "under_review",
      "more_info_needed",
      "approved",
      "not_approved",
      "prescription_sent",
    ] as const) {
      const events = buildCareTimeline(status, SUBMITTED_AT);
      for (const event of events) {
        expect(event.title.length).toBeGreaterThan(0);
        expect(event.description.length).toBeGreaterThan(0);
        // A "reviewing your intake" copy must never sit under a non-review title.
        if (event.description.includes("reviewing your intake")) {
          expect(event.id).toBe("under-review");
          expect(event.title).toBe("Under provider review");
        }
      }
    }
  });

  it("always emits intake events in the canonical milestone order", () => {
    const events = buildCareTimeline("prescription_sent", SUBMITTED_AT);
    const orderIndex = (milestone: string) =>
      CARE_MILESTONE_ORDER.indexOf(
        milestone as (typeof CARE_MILESTONE_ORDER)[number],
      );
    for (let i = 1; i < events.length; i++) {
      expect(orderIndex(events[i].milestone)).toBeGreaterThan(
        orderIndex(events[i - 1].milestone),
      );
    }
  });

  it("appends fulfillment events after prescription-sent in chronological order", () => {
    const careEvents: PersistedCareEvent[] = [
      {
        id: "evt-1",
        milestone: "pharmacy-in-fulfillment",
        title: "Order in fulfillment",
        description: "The pharmacy is preparing your order.",
        occurred_at: "2026-06-28T10:00:00Z",
        order_id: "order-1",
      },
      {
        id: "evt-2",
        milestone: "pharmacy-shipped",
        title: "Order shipped",
        description: "Your order has shipped. USPS tracking: 9400",
        occurred_at: "2026-06-29T14:00:00Z",
        order_id: "order-1",
      },
    ];

    const events = buildCareTimeline(
      "prescription_sent",
      SUBMITTED_AT,
      careEvents,
    );

    // Intake events use milestone as id; fulfillment events use the care event UUID
    expect(events.map((e) => e.milestone)).toEqual([
      "intake-submitted",
      "under-review",
      "approved",
      "prescription-sent",
      "pharmacy-in-fulfillment",
      "pharmacy-shipped",
    ]);
    // Fulfillment events use the care event id (UUID), not the milestone slug
    expect(events.at(-2)?.id).toBe("evt-1");
    expect(events.at(-1)?.id).toBe("evt-2");
    expect(events.at(-1)?.timestamp).toBe("2026-06-29T14:00:00Z");
    expect(events.at(-1)?.tone).toBe("green");
  });

  it("includes package tracking milestones when persisted", () => {
    const careEvents: PersistedCareEvent[] = [
      {
        id: "evt-1",
        milestone: "package-in-transit",
        title: "Package in transit",
        description: "Your package is on its way.",
        occurred_at: "2026-06-30T08:00:00Z",
        order_id: "order-1",
      },
      {
        id: "evt-2",
        milestone: "package-delivered",
        title: "Package delivered",
        description: "Your package has been delivered.",
        occurred_at: "2026-07-01T12:00:00Z",
        order_id: "order-1",
      },
    ];

    const events = buildCareTimeline(
      "prescription_sent",
      SUBMITTED_AT,
      careEvents,
    );

    // Find by milestone field (id is now the care event UUID)
    expect(events.map((e) => e.milestone)).toContain("package-in-transit");
    expect(events.map((e) => e.milestone)).toContain("package-delivered");
    const deliveredIdx = events.findIndex(
      (e) => e.milestone === "package-delivered",
    );
    const transitIdx = events.findIndex(
      (e) => e.milestone === "package-in-transit",
    );
    expect(deliveredIdx).toBeGreaterThan(transitIdx);
  });

  it("renders delivery-failed tone as orange", () => {
    const careEvents: PersistedCareEvent[] = [
      {
        id: "evt-1",
        milestone: "pharmacy-shipped",
        title: "Order shipped",
        description: "Your order has shipped.",
        occurred_at: "2026-07-01T10:00:00Z",
        order_id: "order-1",
      },
      {
        id: "evt-2",
        milestone: "package-delivery-failed",
        title: "Delivery issue",
        description: "We couldn't deliver your package.",
        occurred_at: "2026-07-02T10:00:00Z",
        order_id: "order-1",
      },
    ];
    const events = buildCareTimeline(
      "prescription_sent",
      SUBMITTED_AT,
      careEvents,
    );
    // Find by milestone (id is now the care event UUID "evt-2")
    const failure = events.find(
      (e) => e.milestone === "package-delivery-failed",
    );
    expect(failure).toBeDefined();
    expect(failure?.tone).toBe("orange");
  });

  it("shows delivery-failed before re-shipment in chronological order", () => {
    const careEvents: PersistedCareEvent[] = [
      {
        id: "evt-1",
        milestone: "package-delivery-failed",
        title: "Delivery issue",
        description: "We couldn't deliver your package.",
        occurred_at: "2026-07-02T10:00:00Z",
        order_id: "order-1",
      },
      {
        id: "evt-2",
        milestone: "pharmacy-shipped",
        title: "Order shipped",
        description: "Your order has shipped.",
        occurred_at: "2026-07-03T10:00:00Z",
        order_id: "order-2",
      },
    ];
    const events = buildCareTimeline(
      "prescription_sent",
      SUBMITTED_AT,
      careEvents,
    );
    const failureIdx = events.findIndex(
      (e) => e.milestone === "package-delivery-failed",
    );
    const shippedIdx = events.findIndex(
      (e) => e.milestone === "pharmacy-shipped",
    );
    expect(failureIdx).toBeGreaterThanOrEqual(0);
    expect(shippedIdx).toBeGreaterThan(failureIdx);
  });

  it("shows delivery-failed before resolved package-delivered", () => {
    const careEvents: PersistedCareEvent[] = [
      {
        id: "evt-1",
        milestone: "package-delivery-failed",
        title: "Delivery issue",
        description: "We couldn't deliver your package.",
        occurred_at: "2026-07-02T10:00:00Z",
        order_id: "order-1",
      },
      {
        id: "evt-2",
        milestone: "package-delivered",
        title: "Package delivered",
        description: "Your package has been delivered.",
        occurred_at: "2026-07-05T14:00:00Z",
        order_id: "order-1",
      },
    ];
    const events = buildCareTimeline(
      "prescription_sent",
      SUBMITTED_AT,
      careEvents,
    );
    const failureIdx = events.findIndex(
      (e) => e.milestone === "package-delivery-failed",
    );
    const deliveredIdx = events.findIndex(
      (e) => e.milestone === "package-delivered",
    );
    expect(failureIdx).toBeGreaterThanOrEqual(0);
    expect(deliveredIdx).toBeGreaterThan(failureIdx);
  });
});

describe("hasUnresolvedDeliveryIssue", () => {
  it("returns false when there are no care events", () => {
    expect(hasUnresolvedDeliveryIssue([])).toBe(false);
  });

  it("returns false when there is no delivery failure", () => {
    const events: PersistedCareEvent[] = [
      {
        id: "1",
        milestone: "pharmacy-shipped",
        title: "Shipped",
        description: "On the way.",
        occurred_at: "2026-07-01T10:00:00Z",
        order_id: "order-1",
      },
    ];
    expect(hasUnresolvedDeliveryIssue(events)).toBe(false);
  });

  it("returns true when delivery failed and nothing resolved it", () => {
    const events: PersistedCareEvent[] = [
      {
        id: "1",
        milestone: "pharmacy-shipped",
        title: "Shipped",
        description: "On the way.",
        occurred_at: "2026-07-01T10:00:00Z",
        order_id: "order-1",
      },
      {
        id: "2",
        milestone: "package-delivery-failed",
        title: "Delivery issue",
        description: "Could not deliver.",
        occurred_at: "2026-07-02T10:00:00Z",
        order_id: "order-1",
      },
    ];
    expect(hasUnresolvedDeliveryIssue(events)).toBe(true);
  });

  it("returns false when package-delivered occurred after the failure", () => {
    const events: PersistedCareEvent[] = [
      {
        id: "1",
        milestone: "package-delivery-failed",
        title: "Delivery issue",
        description: "Could not deliver.",
        occurred_at: "2026-07-02T10:00:00Z",
        order_id: "order-1",
      },
      {
        id: "2",
        milestone: "package-delivered",
        title: "Delivered",
        description: "Delivered.",
        occurred_at: "2026-07-05T10:00:00Z",
        order_id: "order-1",
      },
    ];
    expect(hasUnresolvedDeliveryIssue(events)).toBe(false);
  });

  it("returns false when pharmacy-delivered occurred after the failure", () => {
    const events: PersistedCareEvent[] = [
      {
        id: "1",
        milestone: "package-delivery-failed",
        title: "Delivery issue",
        description: "Could not deliver.",
        occurred_at: "2026-07-02T10:00:00Z",
        order_id: "order-1",
      },
      {
        id: "2",
        milestone: "pharmacy-delivered",
        title: "Order delivered",
        description: "Delivered.",
        occurred_at: "2026-07-04T10:00:00Z",
        order_id: "order-1",
      },
    ];
    expect(hasUnresolvedDeliveryIssue(events)).toBe(false);
  });

  it("returns true when re-shipment occurred after failure but no delivery yet", () => {
    const events: PersistedCareEvent[] = [
      {
        id: "1",
        milestone: "package-delivery-failed",
        title: "Delivery issue",
        description: "Could not deliver.",
        occurred_at: "2026-07-02T10:00:00Z",
        order_id: "order-1",
      },
      {
        id: "2",
        milestone: "pharmacy-shipped",
        title: "Re-shipped",
        description: "New shipment sent.",
        occurred_at: "2026-07-03T10:00:00Z",
        order_id: "order-2",
      },
    ];
    // Re-shipment doesn't resolve the issue — only a delivery success does.
    expect(hasUnresolvedDeliveryIssue(events)).toBe(true);
  });
});

describe("buildGroupedCareTimeline", () => {
  it("returns empty array when no intake submitted", () => {
    expect(buildGroupedCareTimeline("draft", null)).toEqual([]);
  });

  it("returns a single initial-consultation group with no care events", () => {
    const groups = buildGroupedCareTimeline("prescription_sent", SUBMITTED_AT);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe("initial");
    expect(groups[0].isInitial).toBe(true);
    expect(groups[0].label).toBe("Initial consultation");
    // Intake events are in the group
    const milestones = groups[0].events.map((e) => e.milestone);
    expect(milestones).toContain("intake-submitted");
    expect(milestones).toContain("prescription-sent");
  });

  it("puts the first shipping cycle in the initial-consultation group", () => {
    const careEvents: PersistedCareEvent[] = [
      {
        id: "evt-1",
        milestone: "pharmacy-shipped",
        title: "Shipped",
        description: "On the way.",
        occurred_at: "2026-06-28T10:00:00Z",
        order_id: "order-A",
      },
      {
        id: "evt-2",
        milestone: "package-delivered",
        title: "Delivered",
        description: "Delivered.",
        occurred_at: "2026-06-30T12:00:00Z",
        order_id: "order-A",
      },
    ];
    const groups = buildGroupedCareTimeline(
      "prescription_sent",
      SUBMITTED_AT,
      careEvents,
    );
    expect(groups).toHaveLength(1);
    const milestones = groups[0].events.map((e) => e.milestone);
    expect(milestones).toContain("pharmacy-shipped");
    expect(milestones).toContain("package-delivered");
  });

  it("creates a refill group for each subsequent order_id", () => {
    const careEvents: PersistedCareEvent[] = [
      {
        id: "evt-1",
        milestone: "pharmacy-shipped",
        title: "Shipped",
        description: "Shipped.",
        occurred_at: "2026-06-28T10:00:00Z",
        order_id: "order-A",
      },
      {
        id: "evt-2",
        milestone: "pharmacy-shipped",
        title: "Shipped",
        description: "Shipped.",
        occurred_at: "2026-07-10T10:00:00Z",
        order_id: "order-B",
      },
      {
        id: "evt-3",
        milestone: "pharmacy-shipped",
        title: "Shipped",
        description: "Shipped.",
        occurred_at: "2026-08-05T10:00:00Z",
        order_id: "order-C",
      },
    ];
    const groups = buildGroupedCareTimeline(
      "prescription_sent",
      SUBMITTED_AT,
      careEvents,
    );
    // 1 initial + 2 refill groups
    expect(groups).toHaveLength(3);
    expect(groups[0].id).toBe("initial");
    expect(groups[0].isInitial).toBe(true);
    expect(groups[1].id).toBe("order-B");
    expect(groups[1].isInitial).toBe(false);
    expect(groups[1].label).toBe("Refill");
    expect(groups[2].id).toBe("order-C");
    expect(groups[2].isInitial).toBe(false);
  });

  it("delivery-failed event is in the initial group when it shares order_id with first cycle", () => {
    const careEvents: PersistedCareEvent[] = [
      {
        id: "evt-1",
        milestone: "pharmacy-shipped",
        title: "Shipped",
        description: "Shipped.",
        occurred_at: "2026-06-28T10:00:00Z",
        order_id: "order-A",
      },
      {
        id: "evt-2",
        milestone: "package-delivery-failed",
        title: "Delivery issue",
        description: "Could not deliver.",
        occurred_at: "2026-06-29T10:00:00Z",
        order_id: "order-A",
      },
      {
        id: "evt-3",
        milestone: "pharmacy-shipped",
        title: "Re-shipped",
        description: "Re-shipped.",
        occurred_at: "2026-07-01T10:00:00Z",
        order_id: "order-B",
      },
    ];
    const groups = buildGroupedCareTimeline(
      "prescription_sent",
      SUBMITTED_AT,
      careEvents,
    );
    expect(groups).toHaveLength(2);
    const initialMilestones = groups[0].events.map((e) => e.milestone);
    expect(initialMilestones).toContain("package-delivery-failed");
    const refillMilestones = groups[1].events.map((e) => e.milestone);
    expect(refillMilestones).toContain("pharmacy-shipped");
    expect(refillMilestones).not.toContain("package-delivery-failed");
  });

  function makeRefill(overrides: Partial<RefillRequest> = {}): RefillRequest {
    return {
      id: "refill-1",
      user_id: "user-1",
      side_effect_check_in_id: null,
      status: "pending",
      request_type: "titration",
      beluga_order_id: "",
      created_at: "2026-07-01T09:00:00Z",
      ...overrides,
    };
  }

  it("a pending refill with no fulfillment events yet shows as its own group immediately", () => {
    const groups = buildGroupedCareTimeline(
      "prescription_sent",
      SUBMITTED_AT,
      [],
      [makeRefill()],
    );
    expect(groups).toHaveLength(2);
    expect(groups[0].id).toBe("initial");
    expect(groups[1].isInitial).toBe(false);
    expect(groups[1].label).toBe("Refill");
    expect(groups[1].events).toHaveLength(1);
    expect(groups[1].events[0].title).toBe("Refill requested");
  });

  it("does not mistake a pending refill for the initial consultation even with no other events", () => {
    const groups = buildGroupedCareTimeline(
      "prescription_sent",
      SUBMITTED_AT,
      [],
      [makeRefill({ created_at: "2026-06-01T00:00:00Z" })], // earlier than SUBMITTED_AT
    );
    expect(groups[0].id).toBe("initial");
    expect(
      groups[0].events.every((e) => e.milestone !== "refill-requested"),
    ).toBe(true);
    expect(groups[1].isInitial).toBe(false);
  });

  it("shows a more_info_needed refill with an orange tone and distinct title", () => {
    const groups = buildGroupedCareTimeline(
      "prescription_sent",
      SUBMITTED_AT,
      [],
      [makeRefill({ status: "more_info_needed" })],
    );
    const entry = groups[1].events[0];
    expect(entry.title).toBe("More information needed");
    expect(entry.tone).toBe("orange");
  });

  it("merges fulfillment events into the same group once beluga_order_id links them", () => {
    const careEvents: PersistedCareEvent[] = [
      {
        id: "evt-1",
        milestone: "pharmacy-in-fulfillment",
        title: "In fulfillment",
        description: "Preparing.",
        occurred_at: "2026-07-02T10:00:00Z",
        order_id: "order-refill-1",
      },
    ];
    const groups = buildGroupedCareTimeline(
      "prescription_sent",
      SUBMITTED_AT,
      careEvents,
      [makeRefill({ beluga_order_id: "order-refill-1" })],
    );
    // 1 initial + 1 refill group (merged, not split into two)
    expect(groups).toHaveLength(2);
    const refillGroup = groups[1];
    const milestones = refillGroup.events.map((e) => e.milestone);
    expect(milestones).toEqual(["refill-requested", "pharmacy-in-fulfillment"]);
  });

  it("still merges the earliest real order_id into initial when no refillRequests are passed (back-compat)", () => {
    const careEvents: PersistedCareEvent[] = [
      {
        id: "evt-1",
        milestone: "pharmacy-shipped",
        title: "Shipped",
        description: "Shipped.",
        occurred_at: "2026-06-28T10:00:00Z",
        order_id: "order-A",
      },
    ];
    const groups = buildGroupedCareTimeline(
      "prescription_sent",
      SUBMITTED_AT,
      careEvents,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].events.map((e) => e.milestone)).toContain(
      "pharmacy-shipped",
    );
  });
});
