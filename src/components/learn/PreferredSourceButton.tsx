import { useEffect } from "react";

export const PREFERRED_SOURCE_SCRIPT_SRC =
  "https://news.google.com/swg/js/v1/publisher.js";
const PREFERRED_SOURCE_SCRIPT_ID = "google-preferred-source-lib";

/**
 * Google "Add as preferred source" button (Search Central, standard JS
 * option). The library scans the DOM for `google-add-preferred-source-btn`
 * once, when it loads, so the script is re-added on each mount to pick up the
 * div after client-side navigation. Only loaded on /learn/ and /blogs/ article pages.
 */
export function PreferredSourceButton({ className }: { className?: string }) {
  useEffect(() => {
    document.getElementById(PREFERRED_SOURCE_SCRIPT_ID)?.remove();
    const script = document.createElement("script");
    script.id = PREFERRED_SOURCE_SCRIPT_ID;
    script.async = true;
    script.src = PREFERRED_SOURCE_SCRIPT_SRC;
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  return (
    <div className={className}>
      <div google-add-preferred-source-btn="" data-theme="light" />
    </div>
  );
}
