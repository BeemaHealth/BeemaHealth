import { createFileRoute } from "@tanstack/react-router";
import { redirectBioLink } from "@/lib/bio-links";

/** Short YouTube bio link: beemahealth.com/youtube -> home + UTMs. */
export const Route = createFileRoute("/youtube")({
  beforeLoad: ({ location }) => {
    throw redirectBioLink("youtube", location.searchStr);
  },
});
