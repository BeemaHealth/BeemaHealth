import { createFileRoute } from "@tanstack/react-router";
import { redirectBioLink } from "@/lib/bio-links";

/** Short Threads bio link: beemahealth.com/threads -> home + UTMs. */
export const Route = createFileRoute("/threads")({
  beforeLoad: ({ location }) => {
    throw redirectBioLink("threads", location.searchStr);
  },
});
