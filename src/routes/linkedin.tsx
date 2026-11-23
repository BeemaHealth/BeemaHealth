import { createFileRoute } from "@tanstack/react-router";
import { redirectBioLink } from "@/lib/bio-links";

/** Short LinkedIn bio link: beemahealth.com/linkedin -> home + UTMs. */
export const Route = createFileRoute("/linkedin")({
  beforeLoad: ({ location }) => {
    throw redirectBioLink("linkedin", location.searchStr);
  },
});
