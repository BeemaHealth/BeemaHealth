import { createFileRoute } from "@tanstack/react-router";
import { redirectBioLink } from "@/lib/bio-links";

/** Short TikTok bio link: beemahealth.com/tiktok -> home + UTMs. */
export const Route = createFileRoute("/tiktok")({
  beforeLoad: ({ location }) => {
    throw redirectBioLink("tiktok", location.searchStr);
  },
});
