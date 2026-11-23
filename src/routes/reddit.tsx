import { createFileRoute } from "@tanstack/react-router";
import { redirectBioLink } from "@/lib/bio-links";

/** Short Reddit bio link: beemahealth.com/reddit -> home + UTMs. */
export const Route = createFileRoute("/reddit")({
  beforeLoad: ({ location }) => {
    throw redirectBioLink("reddit", location.searchStr);
  },
});
