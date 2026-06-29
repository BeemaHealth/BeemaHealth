export type CareTeamSender = "provider" | "support" | "care_team";

export interface CareTeamMessage {
  id: string;
  sender: CareTeamSender;
  senderLabel: string;
  body: string;
}

const PROVIDER_PREFIX = "[Provider]";
const SUPPORT_PREFIX = "[Support]";

function parseChunk(chunk: string, index: number): CareTeamMessage {
  const trimmed = chunk.trim();
  if (trimmed.startsWith(PROVIDER_PREFIX)) {
    return {
      id: `care-msg-${index}`,
      sender: "provider",
      senderLabel: "Provider",
      body: trimmed.slice(PROVIDER_PREFIX.length).trim(),
    };
  }
  if (trimmed.startsWith(SUPPORT_PREFIX)) {
    return {
      id: `care-msg-${index}`,
      sender: "support",
      senderLabel: "Support",
      body: trimmed.slice(SUPPORT_PREFIX.length).trim(),
    };
  }
  return {
    id: `care-msg-${index}`,
    sender: "care_team",
    senderLabel: "Care team",
    body: trimmed,
  };
}

/** Parse `ProviderReview.patient_note` into individual care-team messages. */
export function parseCareTeamMessages(patientNote: string): CareTeamMessage[] {
  const trimmed = patientNote.trim();
  if (!trimmed) return [];

  return trimmed
    .split(/\n\n+/)
    .map((chunk, index) => parseChunk(chunk, index))
    .filter((message) => message.body.length > 0);
}

export function careTeamMessageCount(patientNote: string): number {
  return parseCareTeamMessages(patientNote).length;
}
