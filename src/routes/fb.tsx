import { createFileRoute } from "@tanstack/react-router";
import { redirectBioLink } from "@/lib/bio-links";

/** Short alias: beemahealth.com/fb -> same destination as /facebook. */
export const Route = createFileRoute("/fb")({
  beforeLoad: ({ location }) => {
    throw redirectBioLink("facebook", location.searchStr);
  },
});
