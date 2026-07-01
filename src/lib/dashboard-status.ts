import type {
  IntakeStatus,
  PersistedCareEvent,
  RefillRequest,
} from "@/lib/types/mvp";

export type CareTimelineEvent = {
  id: string;
  milestone: string;
  title: string;
  description: string;
  timestamp: string;
  tone: "blue" | "green" | "orange" | "gray";
};

export type CareTimelineGroup = {
  id: string;
  label: string;
  dateLabel: string;
  events: CareTimelineEvent[];
  isInitial: boolean;
};

/**
 * Canonical intake/review milestones. "approved" and "not_approved" are
 * mutually exclusive outcomes of the review decision step.
 */
export const INTAKE_MILESTONE_ORDER = [
  "intake-submitted",
  "under-review",
  "not-approved",
  "approved",
  "prescription-sent",
] as const;

/** Fulfillment and shipping milestones after prescription-sent. */
export const FULFILLMENT_MILESTONE_ORDER = [
  "pharmacy-in-fulfillment",
  "pharmacy-shipped",
  "pharmacy-delivered",
  "package-in-transit",
  "package-out-for-delivery",
  "package-delivered",
  "package-delivery-failed",
] as const;

export const CARE_MILESTONE_ORDER = [
  ...INTAKE_MILESTONE_ORDER,
  ...FULFILLMENT_MILESTONE_ORDER,
] as const;

export type IntakeMilestone = (typeof INTAKE_MILESTONE_ORDER)[number];
export type FulfillmentMilestone = (typeof FULFILLMENT_MILESTONE_ORDER)[number];
export type CareMilestone = (typeof CARE_MILESTONE_ORDER)[number];

const FULFILLMENT_MILESTONE_SET = new Set<string>(FULFILLMENT_MILESTONE_ORDER);

export function getStatusSummary(
  status: IntakeStatus,
  careEvents: PersistedCareEvent[] = [],
) {
  const providerReview = (() => {
    switch (status) {
      case "draft":
      case "submitted":
        return { label: "Pending", sub: "Awaiting review" };
      case "under_review":
      case "more_info_needed":
        return { label: "In progress", sub: "Reviewed by your clinician" };
      case "approved":
      case "prescription_sent":
        return { label: "Complete", sub: "Review finished" };
      case "not_approved":
        return { label: "Closed", sub: "Case not approved" };
      default:
        return { label: "Pending", sub: "Awaiting review" };
    }
  })();

  const prescription = (() => {
    switch (status) {
      case "approved":
        return { label: "Approved", sub: "Routing to pharmacy" };
      case "prescription_sent":
        return { label: "Sent", sub: "At partner pharmacy" };
      case "not_approved":
        return { label: "Not approved", sub: "No prescription" };
      default:
        return { label: "Pending review", sub: "Awaiting approval" };
    }
  })();

  const shipping = (() => {
    const latest = careEvents.at(-1);
    if (latest) {
      switch (latest.milestone) {
        case "package-delivered":
        case "pharmacy-delivered":
          return { label: "Delivered", sub: "Your order arrived" };
        case "package-out-for-delivery":
          return { label: "Out for delivery", sub: "Arriving soon" };
        case "package-delivery-failed":
          return {
            label: "Delivery issue",
            sub: "Check your shipping details",
          };
        case "pharmacy-shipped":
        case "package-in-transit":
          return { label: "Shipped", sub: "On its way to you" };
        case "pharmacy-in-fulfillment":
          return { label: "In progress", sub: "Pharmacy preparing your order" };
        default:
          break;
      }
    }

    switch (status) {
      case "prescription_sent":
        return { label: "In progress", sub: "Fulfillment started" };
      case "approved":
        return { label: "Preparing", sub: "Pharmacy routing" };
      default:
        return { label: "Not started", sub: "No order yet" };
    }
  })();

  return { providerReview, prescription, shipping };
}

/**
 * The set of milestones that have been reached for a given status. The review
 * step is "active" (orange) only while the case is genuinely in review; once a
 * decision is made it becomes a completed (gray) historical milestone.
 */
function reachedMilestones(
  status: IntakeStatus,
  careEvents: PersistedCareEvent[],
): Set<CareMilestone> {
  const reached = new Set<CareMilestone>(["intake-submitted"]);

  switch (status) {
    case "under_review":
    case "more_info_needed":
      reached.add("under-review");
      break;
    case "approved":
      reached.add("under-review");
      reached.add("approved");
      break;
    case "prescription_sent":
      reached.add("under-review");
      reached.add("approved");
      reached.add("prescription-sent");
      break;
    case "not_approved":
      reached.add("under-review");
      reached.add("not-approved");
      break;
    default:
      break;
  }

  for (const event of careEvents) {
    if (FULFILLMENT_MILESTONE_SET.has(event.milestone)) {
      reached.add(event.milestone as FulfillmentMilestone);
    }
  }

  return reached;
}

function fulfillmentTone(milestone: string): CareTimelineEvent["tone"] {
  if (milestone === "package-delivery-failed") return "orange";
  if (
    milestone === "pharmacy-in-fulfillment" ||
    milestone === "package-in-transit"
  ) {
    return "blue";
  }
  return "green";
}

function milestoneEvent(
  milestone: IntakeMilestone,
  status: IntakeStatus,
  timestamp: string,
): CareTimelineEvent {
  switch (milestone) {
    case "intake-submitted":
      return {
        id: "intake-submitted",
        milestone: "intake-submitted",
        title: "Intake submitted",
        description: "Your medical intake was submitted for clinician review",
        timestamp,
        tone: "blue",
      };
    case "under-review": {
      const active = status === "under_review" || status === "more_info_needed";
      return {
        id: "under-review",
        milestone: "under-review",
        title:
          status === "more_info_needed"
            ? "More information needed"
            : "Under provider review",
        description:
          status === "more_info_needed"
            ? "Your clinician needs more information to continue"
            : "Your clinician is reviewing your intake",
        timestamp,
        tone: active ? "orange" : "gray",
      };
    }
    case "approved":
      return {
        id: "approved",
        milestone: "approved",
        title: "Treatment approved",
        description: "Your clinician approved your treatment plan",
        timestamp,
        tone: "green",
      };
    case "not-approved":
      return {
        id: "not-approved",
        milestone: "not-approved",
        title: "Not approved",
        description:
          "Your clinician determined treatment is not appropriate at this time",
        timestamp,
        tone: "gray",
      };
    case "prescription-sent":
      return {
        id: "prescription-sent",
        milestone: "prescription-sent",
        title: "Prescription sent",
        description: "Your prescription was sent for fulfillment",
        timestamp,
        tone: "green",
      };
  }
}

export function buildCareTimeline(
  status: IntakeStatus,
  submittedAt: string | null,
  careEvents: PersistedCareEvent[] = [],
): CareTimelineEvent[] {
  if (!submittedAt) return [];

  const reached = reachedMilestones(status, careEvents);

  // Intake milestones in canonical order (intake → review → prescription chain).
  const intakeEvents = INTAKE_MILESTONE_ORDER.filter((m) => reached.has(m)).map(
    (milestone) =>
      milestoneEvent(milestone as IntakeMilestone, status, submittedAt),
  );

  // Fulfillment events in chronological order as returned by the backend.
  // id uses the care event UUID so duplicate milestone types (e.g., two
  // pharmacy-shipped events across different refill cycles) remain unique.
  const fulfillmentEvents: CareTimelineEvent[] = careEvents
    .filter((e) => FULFILLMENT_MILESTONE_SET.has(e.milestone))
    .map((e) => ({
      id: e.id,
      milestone: e.milestone,
      title: e.title,
      description: e.description,
      timestamp: e.occurred_at,
      tone: fulfillmentTone(e.milestone),
    }));

  return [...intakeEvents, ...fulfillmentEvents];
}

function _formatGroupDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const REFILL_STATUS_TONE: Record<
  RefillRequest["status"],
  CareTimelineEvent["tone"]
> = {
  pending: "blue",
  approved: "green",
  denied: "gray",
  more_info_needed: "orange",
};

const REFILL_STATUS_TITLE: Record<RefillRequest["status"], string> = {
  pending: "Refill requested",
  approved: "Refill approved",
  denied: "Refill denied",
  more_info_needed: "More information needed",
};

function refillLeadingEvent(refill: RefillRequest): CareTimelineEvent {
  return {
    id: `refill-request-${refill.id}`,
    milestone: "refill-requested",
    title: REFILL_STATUS_TITLE[refill.status] ?? "Refill requested",
    description:
      refill.status === "more_info_needed"
        ? "Your provider needs more information before deciding on this dose change — check your care team messages."
        : refill.request_type === "titration"
          ? "Dose change request submitted for provider review."
          : "Refill request submitted.",
    timestamp: refill.created_at,
    tone: REFILL_STATUS_TONE[refill.status] ?? "blue",
  };
}

/**
 * Groups the care timeline into directory-style sections: one "Initial
 * consultation" section (intake events + the earliest fulfillment cycle) and
 * one "Refill" section per subsequent order_id / refill request. A refill
 * gets its own section immediately on submission (before any fulfillment
 * webhook has fired) via a synthetic leading entry, keyed by the refill's id;
 * once a fulfillment event arrives with a matching order_id (see
 * beluga_order_id on RefillRequest), it's merged into that same section.
 * Latest section is marked as open by default.
 */
export function buildGroupedCareTimeline(
  status: IntakeStatus,
  submittedAt: string | null,
  careEvents: PersistedCareEvent[] = [],
  refillRequests: RefillRequest[] = [],
): CareTimelineGroup[] {
  if (!submittedAt) return [];

  const reached = reachedMilestones(status, careEvents);

  const intakeEvents = INTAKE_MILESTONE_ORDER.filter((m) => reached.has(m)).map(
    (m) => milestoneEvent(m as IntakeMilestone, status, submittedAt),
  );

  // Group fulfillment events by order_id (chronological within each group)
  const orderMap = new Map<string, CareTimelineEvent[]>();
  for (const e of careEvents) {
    if (!FULFILLMENT_MILESTONE_SET.has(e.milestone)) continue;
    const key = e.order_id || "__no_order__";
    if (!orderMap.has(key)) orderMap.set(key, []);
    orderMap.get(key)!.push({
      id: e.id,
      milestone: e.milestone,
      title: e.title,
      description: e.description,
      timestamp: e.occurred_at,
      tone: fulfillmentTone(e.milestone),
    });
  }

  // Attach each refill request's leading entry to its group: keyed by
  // beluga_order_id once a fulfillment event has linked them (merging with
  // real events already in orderMap), or a synthetic per-refill key so it
  // renders immediately, before any fulfillment webhook has fired. Track
  // every key touched by a refill request — whether synthetic or a real,
  // now-linked order_id — so it's never mistaken for the account's original
  // (non-refill) fulfillment cycle below, even if it happens to sort first.
  const refillKeys = new Set<string>();
  for (const refill of refillRequests) {
    const key = refill.beluga_order_id || `refill:${refill.id}`;
    refillKeys.add(key);
    const existing = orderMap.get(key) ?? [];
    orderMap.set(key, [refillLeadingEvent(refill), ...existing]);
  }

  // Sort all groups by their earliest event timestamp.
  const sortedGroups = [...orderMap.entries()]
    .map(([key, events]) => ({ key, events }))
    .sort((a, b) =>
      (a.events[0]?.timestamp ?? "").localeCompare(
        b.events[0]?.timestamp ?? "",
      ),
    );

  const groups: CareTimelineGroup[] = [];
  const initialEvents: CareTimelineEvent[] = [...intakeEvents];

  // The chronologically-first group merges into "Initial consultation" —
  // unless it belongs to a refill request (a refill must never be mistaken
  // for the account's original prescription cycle, even if its own
  // fulfillment events happen to sort earliest, e.g. in mock testing).
  let firstRefillIndex = 0;
  if (sortedGroups.length > 0 && !refillKeys.has(sortedGroups[0].key)) {
    initialEvents.push(...sortedGroups[0].events);
    firstRefillIndex = 1;
  }

  groups.push({
    id: "initial",
    label: "Initial consultation",
    dateLabel: _formatGroupDate(submittedAt),
    events: initialEvents,
    isInitial: true,
  });

  for (let i = firstRefillIndex; i < sortedGroups.length; i++) {
    const { key, events } = sortedGroups[i];
    const firstAt = events[0]?.timestamp ?? submittedAt;
    groups.push({
      id: key,
      label: "Refill",
      dateLabel: _formatGroupDate(firstAt),
      events,
      isInitial: false,
    });
  }

  return groups;
}

/**
 * Returns true when there is a delivery failure that has not been superseded
 * by a later successful delivery event. The backend returns care events in
 * chronological order, so we compare occurred_at timestamps directly.
 */
export function hasUnresolvedDeliveryIssue(
  careEvents: PersistedCareEvent[],
): boolean {
  const failure = careEvents.find(
    (e) => e.milestone === "package-delivery-failed",
  );
  if (!failure) return false;
  const RESOLVED_BY = new Set(["package-delivered", "pharmacy-delivered"]);
  return !careEvents.some(
    (e) => RESOLVED_BY.has(e.milestone) && e.occurred_at > failure.occurred_at,
  );
}

/** Refills and side-effect check-ins require an active prescription record. */
export function canManageRefills(hasActivePrescription: boolean): boolean {
  return hasActivePrescription;
}
