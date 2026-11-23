import { createFileRoute } from "@tanstack/react-router";
import { redirectBioLink } from "@/lib/bio-links";

/** Short Instagram bio link: beemahealth.com/instagram -> home + UTMs. */
export const Route = createFileRoute("/instagram")({
  beforeLoad: ({ location }) => {
    throw redirectBioLink("instagram", location.searchStr);
  },
});
