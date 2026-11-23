import { createFileRoute } from "@tanstack/react-router";
import { redirectBioLink } from "@/lib/bio-links";

/** Short X bio link: beemahealth.com/x -> home + UTMs. */
export const Route = createFileRoute("/x")({
  beforeLoad: ({ location }) => {
    throw redirectBioLink("x", location.searchStr);
  },
});
