import { createFileRoute } from "@tanstack/react-router";
import { redirectBioLink } from "@/lib/bio-links";

/** Short Facebook bio link: beemahealth.com/facebook -> home + UTMs. */
export const Route = createFileRoute("/facebook")({
  beforeLoad: ({ location }) => {
    throw redirectBioLink("facebook", location.searchStr);
  },
});
